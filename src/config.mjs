import os from 'node:os';
import process from 'node:process';
import models from './models/index.mjs';
import routes from './routes/index.mjs';

const {
  HOST,
  PORT = 3000,
  THREADS = os.cpus().length
} = process.env;

export default {
  cluster: {
    threads: THREADS, // cores
    timeout: 10 // seconds
  },
  api: {
    host: HOST,
    port: PORT || 3000,
    timeout: 60, // seconds
    ssl: {
      // key: '-----BEGIN RSA PRIVATE KEY-----\n...',
      // cert: '-----BEGIN CERTIFICATE-----\n...',
      // ca: '-----BEGIN CERTIFICATE-----\n...'
    },
    session: {
      secret: 'secret',
      expires: 60, // minutes
      sources: [
        { field: 'token', type: 'cookies' },
        { field: 'authorization', type: 'headers' },
        { field: 'token', type: 'query' }
      ]
    },
    cors: {
      origin: true
    },
    compression: {},
    // statics: {
    //   dir: '/path/to/dir',
    //   expires: 60 // minutes
    // }
    routes
  },
  mongo: {
    uri: 'mongodb://admin:secret@127.0.0.1:27017/anyend?authSource=admin',
    models
  },
  minio: {
    uri: 'http://minioadmin:minioadmin@127.0.0.1:9000/anyend'
  },
  lifecycle: {
    async startup () {
      console.log('startup event');
    },
    async shutdown () {
      console.log('shutdown event');
    }
  }
};
