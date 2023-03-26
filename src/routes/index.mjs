import user from './user.mjs';
import login from './login.mjs';
import state from './state.mjs';
import storage from './storage.mjs';

export default [
  (req, res, next) => {
    console.log('middlware 1');
    next();
  },
  {
    timeout: 60,
    cors: { origin: true },
    compression: {},
    // uploads: { multiples: true },
    statics: {
      dir: '/home/meefik/Repositories/anyend/src/public',
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
    path: '/restrict',
    method: 'get',
    roles: ['guest', 'admin'],
    middleware (req, res) {
      res.send('OK');
    }
  },
  {
    path: '/api',
    middleware: [
      ...user,
      ...login,
      ...state,
      ...storage
    ]
  }
];
