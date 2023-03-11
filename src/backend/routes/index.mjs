import express from 'express';
import authRouter from './auth.mjs';
import usersRouter from './users.mjs';

const router = express.Router();

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

// Endpoint for authorization
router.use('/', authRouter);

// Endpoint for user administration
router.use('/users', isAuth(['admin']), usersRouter);

export default router;
