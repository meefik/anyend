import express from 'express';
import conf from '../conf.mjs';
import dao from '../db/dao.mjs';
import searchParser from '../lib/search-parser.mjs';
import render from '../lib/render.mjs';
// import authRouter from './auth.mjs';
// import restRouter from './rest.mjs';

/**
 * Check the permissions for the role.
 *
 * @param {string[]} roles
 * @param {Object} req
 * @param {Object} res
 * @param {function} next
 */
function isAuth (roles, req, res, next) {
  if (arguments.length <= 1) {
    return isAuth.bind(this, roles);
  }
  if (req.user) {
    if (roles && !~roles.indexOf(req.user.role)) {
      res.status(403);
      next(new Error('Access denied'));
    } else {
      next();
    }
  } else {
    res.status(401);
    next(new Error('Unauthorized'));
  }
}

export default async function () {
  const router = express.Router();

  const { routes } = conf;
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
          single
        } = _middleware;
        if (typeof _middleware === 'function') {
          router[method](path, async function (req, res, next) {
            try {
              await _middleware(req, res);
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
                single
              }, { req, res });
              if (typeof query.filter === 'string') {
                query.filter = searchParser(filter);
              }
              console.log(query);
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
            console.log('use', route);
            await _middleware(req, res);
            next();
          } catch (err) {
            next(err);
          }
        });
      }
    });
  }

  // Endpoint for authorization
  // router.use('/', authRouter);

  // Endpoint for REST API
  // router.use('/rest', restRouter);

  // Create user's endpoints
  // const routes = await Route.find({ enabled: true });
  // const methods = { read: 'get', create: 'post', update: 'put', delete: 'delete' };
  // for (let i = 0; i < routes.length; i++) {
  //   const { operator, roles, path, code } = routes[i];
  //   const method = methods[operator];
  //   const _code = await Code.findById(code);
  //   const fn = _code?.createFunction();
  //   if (method && path && roles && fn) {
  //     router[method](path, isAuth(roles), fn);
  //   }
  // }

  return router;
}
