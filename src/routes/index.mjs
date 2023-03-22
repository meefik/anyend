import user from './user.mjs';
import login from './login.mjs';
import state from './state.mjs';

export default [
  (req, res, next) => {
    console.log('middlware 1');
    next();
  },
  {
    timeout: 60,
    cors: { origin: true },
    compression: {},
    uploads: { multiples: true },
    statics: {
      dir: '/tmp',
      expires: 60 // minutes
    },
    session: {
      secret: 'secret',
      expires: 60, // minutes
      sources: [
        { field: 'token', type: 'cookies' },
        { field: 'authorization', type: 'headers' },
        { field: 'token', type: 'query' }
      ]
    }
  },
  {
    path: '/api',
    middleware: [
      ...user,
      ...login,
      ...state
    ]
  },
  {
    path: '/restrict',
    method: 'get',
    roles: ['guest', 'admin'],
    middleware (req, res) {
      res.send('OK');
    }
  }
];
