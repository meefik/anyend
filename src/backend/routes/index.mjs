import user from './user.mjs';

export default [
  (req, res, next) => {
    console.log('middlware 1');
    next();
  },
  {
    path: '/user',
    roles1: ['admin'],
    middleware: user
  }
];
