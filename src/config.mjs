import os from 'node:os';
import process from 'node:process';
import models from './models/index.mjs';
import routes from './routes/index.mjs';
import tasks from './tasks/index.mjs';

const {
  HOST,
  PORT = 3000,
  THREADS = os.cpus().length
} = process.env;

export default {
  cluster: {
    threads: THREADS, // cores
    timeout: 10, // seconds
    plugins: ['lifecycle', 'mongo', 'minio', 'api', 'scheduler']
  },
  api: {
    host: HOST,
    port: PORT || 3000,
    routes,
    wss: {}
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
  },
  scheduler: {
    interval: 60,
    tasks
  }
};
