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
