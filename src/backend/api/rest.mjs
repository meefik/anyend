import express from 'express';
import dao from '../db/dao.mjs';
import render from '../utils/render.mjs';

export default async function (routes = []) {
  const router = express.Router();

  for (const route of routes) {
    const { method = 'get', path, middleware } = route;
    if (!middleware) continue;
    if (path && method in router) {
      const _middleware = [...middleware].map((handler, index, arr) => {
        const isLastItem = arr.length === index + 1;
        if (typeof handler === 'function') {
          return async function (req, res, next) {
            try {
              await handler(req, res, next);
              next();
            } catch (err) {
              next(err);
            }
          };
        } else if (handler.operator in dao) {
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
          } = handler;
          return async function (req, res, next) {
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
              isLastItem ? res.json(data) : next();
            } catch (err) {
              next(err);
            }
          };
        } else {
          return (req, res, next) => next();
        }
      });
      router[method](path, ..._middleware);
    } else {
      const _middleware = [...middleware].map((handler) => {
        if (typeof handler === 'function') {
          return async function (req, res, next) {
            try {
              await handler(req, res, next);
              next();
            } catch (err) {
              next(err);
            }
          };
        } else {
          return (req, res, next) => next();
        }
      });
      router.use(..._middleware);
    }
  }

  return router;
}
