import user from './user.mjs';
import login from './login.mjs';
import state from './state.mjs';

export default [
  (req, res, next) => {
    console.log('middlware 1');
    next();
  },
  {
    path: '/api',
    roles1: ['guest', 'admin'],
    middleware: [
      user,
      login,
      state
    ]
  }
];
