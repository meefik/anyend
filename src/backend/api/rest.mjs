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
      one
    } = route;
    if (operator in dao) {
      const fn = async function (req, res, next) {
        try {
          const query = render(
            { filter, select, populate, sort, skip, limit, count, one },
            { req, res }
          );
          const data = await dao[operator](schema, query, req.body);
          res.json(data);
        } catch (err) {
          next(err);
        }
      };
      return path ? router[method](path, fn) : router[method](fn);
    }
    if (middleware) {
      const fn = setupRouter(middleware);
      return path ? router[method](path, fn) : router[method](fn);
    }
  });
  return router;
}

export default async function () {
  return setupRouter(routes);
}
