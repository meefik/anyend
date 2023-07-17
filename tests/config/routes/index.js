import user from './user.js';
import login from './login.js';
import state from './state.js';
import storage from './storage.js';
import csv from './csv.js';
import file from './file.js';
import rpc from './rpc.js';

export default [
  (req, res, next) => {
    console.log('middlware 1');
    console.log(req.body);
    next();
  },
  {
    timeout: 60,
    cors: { origin: true },
    compression: {},
    // uploads: { multiples: true },
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
      ...storage,
      ...csv,
      ...file,
      ...rpc
    ]
  }
];
