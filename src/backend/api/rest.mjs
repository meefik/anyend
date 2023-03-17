import express from 'express';
import dao from '../db/dao.mjs';
import render from '../utils/render.mjs';

export default async function (ctx) {
  const router = express.Router();

  const { routes = [] } = ctx || {};
  for (const route of routes) {
    const { method = 'get', path, middleware } = route;
    if (!middleware) continue;
    [...middleware].forEach((_middleware, index, arr) => {
      const isLastMiddleware = arr.length === index + 1;
      if (path && method in router) {
        const {
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
        } = _middleware;
        if (typeof _middleware === 'function') {
          router[method](path, async function (req, res, next) {
            try {
              await _middleware(req, res, next);
              next();
            } catch (err) {
              next(err);
            }
          });
        } else if (_middleware.operator in dao) {
          router[method](path, async function (req, res, next) {
            try {
              const query = render({
                filter,
                select,
                populate,
                sort,
                skip,
                limit,
                count,
                one
              }, { req, res });
              const data = await dao[operator](schema, query, req.body);
              res.locals.data = data;
              isLastMiddleware ? res.json(data) : next();
            } catch (err) {
              next(err);
            }
          });
        }
      } else if (typeof _middleware === 'function') {
        router.use(async function (req, res, next) {
          try {
            await _middleware(req, res, next);
            next();
          } catch (err) {
            next(err);
          }
        });
      }
    });
  }

  return router;
}
