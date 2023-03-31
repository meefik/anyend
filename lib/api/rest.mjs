import express from 'express';
import db from 'mongoose';
import cors from 'cors';
import compression from 'compression';
import formidable from 'formidable';
import jwt from 'jsonwebtoken';
import dao from '../mongo/dao.mjs';
import render from '../utils/render.mjs';

function setupRouter (_routes) {
  const router = express.Router();
  [].concat(_routes || []).forEach((route) => {
    if (typeof route === 'function') {
      const fn = async function (req, res, next) {
        try {
          await route(req, res, next);
        } catch (err) {
          next(err);
        }
      };
      return router.use(fn);
    }
    const { method = 'use', path, middleware } = route;
    if (route.timeout) {
      const timeout = route.timeout;
      const fn = function (req, res, next) {
        req.setTimeout(timeout * 1000);
        next();
      };
      path ? router[method](path, fn) : router[method](fn);
    }
    if (route.cors) {
      const fn = cors(route.cors);
      path ? router[method](path, fn) : router[method](fn);
    }
    if (route.compression) {
      const fn = compression(route.compression);
      path ? router[method](path, fn) : router[method](fn);
    }
    if (route.uploads) {
      const uploads = route.uploads;
      const fn = function (req, res, next) {
        const contentType = req.headers['content-type'] || '';
        if (!contentType.startsWith('multipart/form-data')) {
          return next();
        }
        const form = formidable(uploads);
        form.parse(req, (err, fields, files) => {
          if (err) return next(err);
          req.files = files;
          next();
        });
      };
      path ? router[method](path, fn) : router[method](fn);
    }
    if (route.statics) {
      const { dir, expires } = route.statics;
      const fn = express.static(
        dir,
        expires ? { maxAge: expires * 60 * 1000 } : {}
      );
      path ? router[method](path, fn) : router[method](fn);
    }
    if (route.session) {
      const { sources, secret, expires } = route.session;
      const fn = function (req, res, next) {
        let payload, token, session;
        try {
          for (const source of sources) {
            const { type, field } = source;
            token = req[type] && req[type][field];
            // Authorization: <type> <credentials>
            if (token && type === 'headers' && field === 'authorization') {
              token = token.split(/\s+/)[1];
            }
            if (token) break;
          }
          if (token) {
            payload = jwt.verify(token, secret);
          }
        } catch (err) {
          payload = null;
          token = null;
        }
        Object.defineProperty(req, 'user', {
          enumerable: true,
          configurable: false,
          async get () {
            return payload;
          },
          async set (val) {
            try {
              if (!val) {
                payload = null;
                token = null;
              } else {
                const exp = ~~(Date.now() / 1000) + (expires * 60);
                payload = { ...val, exp };
                token = jwt.sign(payload, secret);
              }
            } catch (err) {
              payload = null;
              token = null;
            }
          }
        });
        Object.defineProperty(req, 'token', {
          enumerable: true,
          configurable: false,
          async get () {
            return token;
          },
          async set (val) {
            try {
              if (!val) {
                payload = null;
                token = null;
              } else {
                token = val;
                payload = jwt.verify(token, secret);
              }
            } catch (err) {
              payload = null;
              token = null;
            }
          }
        });
        Object.defineProperty(req, 'session', {
          enumerable: true,
          configurable: false,
          async get () {
            if (req.user?.sid && !session) {
              session = await db.model('Session')?.findById(req.user?.sid).exec();
            }
            return session;
          },
          async set (val) {
            if (req.user?.sid && val !== session) {
              await db.model('Session')?.updateOne({ _id: req.user?.sid }, { $set: { data: val } });
              session = val;
            }
          }
        });
        next();
      };
      path ? router[method](path, fn) : router[method](fn);
    }
    if (route.roles) {
      const { roles } = route;
      const fn = function (req, res, next) {
        if (!req.user || ![].concat(roles).includes(req.user.role)) {
          res.status(401);
          return next(new Error('Unauthorized'));
        }
        next();
      };
      path ? router[method](path, fn) : router[method](fn);
    }
    if (route.cache) {
      const { key, expires = 3600 } = route.cache;
      const fn = async function (req, res, next) {
        const updatedAt = new Date(Date.now() - expires * 1000);
        const { data } = await db.model('Cache').findOne({
          key: key || req.path,
          updatedAt: { $gte: updatedAt }
        }).exec() || {};
        if (data) return res.json(data);
        res.cache = async function (data) {
          return await db.model('Cache').updateOne(
            { key },
            { $set: { data, updatedAt: new Date() } },
            { upsert: true }
          );
        };
        next();
      };
      path ? router[method](path, fn) : router[method](fn);
    }
    if (route.dao && route.dao.operator in dao) {
      const { operator, schema } = route.dao;
      const fn = async function (req, res, next) {
        try {
          const { filter, select, populate, sort, skip, limit, count, one, upsert, data } = route.dao;
          const query = await render(
            { filter, select, populate, sort, skip, limit, count, one, upsert, data },
            { req, res }
          );
          console.log(data);
          const out = await dao[operator](schema, query);
          res.cache && await res.cache(out);
          res.json(out);
        } catch (err) {
          next(err);
        }
      };
      path ? router[method](path, fn) : router[method](fn);
    }
    if (typeof middleware === 'function') {
      const fn = async function (req, res, next) {
        try {
          await middleware(req, res, next);
        } catch (err) {
          next(err);
        }
      };
      path ? router[method](path, fn) : router[method](fn);
    } else if (typeof middleware === 'object') {
      const fn = setupRouter(middleware);
      path ? router[method](path, fn) : router[method](fn);
    }
  });
  return router;
}

export default async function (routes) {
  return setupRouter(routes);
}