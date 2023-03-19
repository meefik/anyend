import express from 'express';
import dao from '../mongo/dao.mjs';
import render from '../utils/render.mjs';
import routes from '../routes/index.mjs';

function setupRouter (_routes) {
  const router = express.Router();
  [].concat(_routes).forEach((route) => {
    if (typeof route === 'function') {
      return router.use(route);
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
    if (middleware) {
      const fn = setupRouter(middleware);
      path ? router[method](path, fn) : router[method](fn);
    } else if (operator in dao) {
      const fn = async function (req, res, next) {
        try {
          const query = render(
            { filter, select, populate, sort, skip, limit, count, one, cache },
            { req, res }
          );
          const data = await dao[operator](schema, query, req.body);
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
