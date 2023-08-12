import user from './user.js';
import login from './login.js';
import state from './state.js';
import csv from './csv.js';
import file from './file.js';
import rpc from './rpc.js';
import timeout from './timeout.js';

export const DEFAULT_TIMEOUT = 15;
export const CORS = 'www.neux.dev';

export default [
  (req, res, next) => {
    res.cookie('cookie-test', 'ok');
    next();
  },
  {
    timeout: DEFAULT_TIMEOUT,
    cors: { origin: CORS },
    compression: {},
    statics: {
      dir: './src/public',
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
    middleware(req, res) {
      res.send('OK');
    }
  },
  {
    path: '/api',
    middleware: [
      ...user,
      ...login,
      ...state,
      ...csv,
      ...file,
      ...rpc,
      ...timeout
    ]
  }
];
