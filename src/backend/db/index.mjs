import nconf from 'nconf';
import mongoose from 'mongoose';
import './models/config.mjs';
import './models/session.mjs';
import './models/user.mjs';
import dao from './dao.mjs';
import logger from '../lib/logger.mjs';

const conn = mongoose.connection;

// Show debug logs
if (logger.level === 'debug') {
  mongoose.set('debug', function (collectionName, method, query, doc) {
    // LOG format: rooms.find({}) { sort: {}, fields: undefined }
    logger.log({
      level: 'debug',
      label: 'db',
      message: `${collectionName}.${method}(${
        query ? JSON.stringify(query) : ''
      }) ${doc ? JSON.stringify(doc) : ''}`
    });
  });
}

conn.on('connected', async function () {
  logger.log({ level: 'info', label: 'db', message: 'Database is connected' });
});

conn.on('disconnected', function () {
  logger.log({ level: 'info', label: 'db', message: 'Database has been disconnected' });
});

conn.on('error', function (err) {
  logger.log({ level: 'error', label: 'db', message: err });
});

export default {
  get connection () {
    return conn;
  },
  connect () {
    return mongoose.connect(nconf.get('mongo:uri'), {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
  },
  disconnect () {
    return conn.close();
  },
  ...dao
};
