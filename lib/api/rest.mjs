import fs from 'node:fs';
import express from 'express';
import db from 'mongoose';
import cors from 'cors';
import compression from 'compression';
import formidable from 'formidable';
import jwt from 'jsonwebtoken';
import dao from '../mongo/dao.mjs';
import render from '../utils/render.mjs';
import { readCsv, writeCsv } from '../utils/csv.mjs';

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
          res.status(401);
          return next(new Error('Unsupported content type'));
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
      const { operator, schema, format } = route.dao;
      const uploads = route.uploads;
      const fn = async function (req, res, next) {
        let stream;
        try {
          const { filter, select, populate, sort, skip, limit, count, one, upsert, data } = route.dao;
          const query = await render(
            { filter, select, populate, sort, skip, limit, count, one, upsert, data },
            { req, res }
          );
          if (operator === 'create' || operator === 'update') {
            if (uploads) {
              const file = query.data;
              if (file?.filepath) {
                if (format === 'file') {
                  const { getMinioClient, defaultBucket } = global.context;
                  const minio = getMinioClient();
                  const Attach = db.model('Attach');
                  const attach = new Attach({
                    filename: file.originalFilename,
                    mimetype: file.mimetype,
                    size: file.size
                  });
                  await attach.save();
                  stream = fs.createReadStream(file.filepath);
                  await minio.putObject(defaultBucket, attach.id, stream);
                  const out = attach.toJSON();
                  res.json(out);
                } else if (format === 'csv') {
                  stream = fs.createReadStream(file.filepath);
                  const out = [];
                  await readCsv(stream, async (obj) => {
                    query.data = obj;
                    const res = await dao[operator](schema, query);
                    if (res) out.push(res);
                  });
                  res.json(out);
                } else {
                  const text = fs.readFileSync(file.filepath, { encoding: 'utf8' });
                  query.data = JSON.parse(text);
                  const out = await dao[operator](schema, query);
                  res.json(out);
                }
              }
            } else {
              const out = await dao[operator](schema, query);
              res.json(out);
            }
          } else if (operator === 'read') {
            if (format === 'file') {
              const { getMinioClient, defaultBucket } = global.context;
              const minio = getMinioClient();
              const attach = await dao[operator](schema, { ...query, one: true });
              res.header('Content-Type', attach.mimetype || 'application/octet-stream');
              if (attach.size) {
                res.header('Content-Length', attach.size);
                res.header('Accept-Ranges', 'bytes');
              }
              let out;
              if (req.headers.range && attach.size) {
                const {
                  1: bytesUnit,
                  2: firstBytePos = 0,
                  3: lastBytePos = attach.size - 1
                } = String(req.headers.range).match(/(bytes)=([0-9]+)?-([0-9]+)?/) || [];
                if (bytesUnit === 'bytes') {
                  const length = parseInt(lastBytePos) - parseInt(firstBytePos) + 1;
                  out = await minio.getPartialObject(defaultBucket, attach.id, parseInt(firstBytePos), length);
                  res.header('Content-Length', length);
                  res.header('Content-Range', `bytes ${firstBytePos}-${lastBytePos}/${attach.size}`);
                  res.status(206);
                }
              } else {
                out = await minio.getObject(defaultBucket, attach.id);
              }
              out.pipe(res);
            } else if (format === 'csv') {
              const cursor = await dao[operator](schema, { ...query, cursor: true });
              const select = typeof query.select === 'object' ? Object.keys(query.select) : query.select;
              const out = writeCsv(cursor, select);
              // const model = `${query.model}`.toLowerCase();
              // const now = new Date()
              //   .toJSON()
              //   .substring(0, 19)
              //   .replace(/:/g, '-')
              //   .replace('T', '_');
              // res.header(
              //   'Content-Disposition',
              //   `attachment; filename="${model}_${now}.csv"`
              // );
              res.text(out);
            } else {
              const out = await dao[operator](schema, query);
              res.cache && await res.cache(out);
              res.json(out);
            }
          } else {
            const out = await dao[operator](schema, query);
            res.json(out);
          }
        } catch (err) {
          next(err);
        } finally {
          if (stream) stream.destroy();
          for (const k in req.files) {
            req.files[k].destroy();
          }
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
  return typeof routes === 'function'
    ? routes
    : setupRouter(routes);
}
