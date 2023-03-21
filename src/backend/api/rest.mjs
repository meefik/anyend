import express from 'express';
import db from 'mongoose';
import dao from '../mongo/dao.mjs';
import render from '../utils/render.mjs';
import routes from '../routes/index.mjs';

function setupRouter (_routes) {
  const router = express.Router();
  [].concat(_routes).forEach((route) => {
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
    const {
      method = 'use',
      path,
      roles,
      middleware,
      operator,
      schema,
      filter,
      select,
      populate,
      sort,
      skip,
      limit,
      count,
      one,
      cache
    } = route;
    if (roles) {
      const fn = function (req, res, next) {
        if (!req.user || ![].concat(roles).includes(req.user.role)) {
          res.status(401);
          return next(new Error('Unauthorized'));
        }
        next();
      };
      path ? router[method](path, fn) : router[method](fn);
    }
    if (cache?.key) {
      const { key, expires = 3600 } = cache;
      const fn = async function (req, res, next) {
        const updatedAt = new Date(Date.now() - expires * 1000);
        const { data } = await db.model('Cache').findOne({ key, updatedAt: { $gte: updatedAt } }).exec() || {};
        if (data) return res.json(data);
        res.cache = async function (data) {
          return await db.model('Cache').updateOne({ key }, { $set: { data, updatedAt: new Date() } }, { upsert: true });
        };
        next();
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
    } else if (operator in dao) {
      const fn = async function (req, res, next) {
        try {
          const query = render(
            { filter, select, populate, sort, skip, limit, count, one },
            { req, res }
          );
          const data = await dao[operator](schema, query, req.body);
          await res?.cache(data);
          res.json(data);
        } catch (err) {
          next(err);
        }
      };
      path ? router[method](path, fn) : router[method](fn);
    }
  });
  return router;
}

export default async function () {
  return setupRouter(routes);
}
