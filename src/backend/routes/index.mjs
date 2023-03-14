import express from 'express';
import authRouter from './auth.mjs';
import Route from '../db/models/route.mjs';
import Code from '../db/models/code.mjs';

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

  // Endpoint for authorization
  router.use('/', authRouter);

  // Create endpoints from code
  const routes = await Route.find({});
  const methods = { read: 'get', create: 'post', update: 'put', delete: 'delete' };
  for (let i = 0; i < routes.length; i++) {
    const { operator, roles, path, code } = routes[i];
    const method = methods[operator];
    const _code = await Code.findById(code);
    const fn = _code?.createFunction();
    if (method && path && roles && fn) {
      router[method](path, isAuth(roles), fn);
    }
  }

  return router;
}
