import mongoose from 'mongoose';
import logger from '../utils/logger.mjs';
import models from './models.mjs';

export default async function (ctx) {
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

  await mongoose.connect(ctx.uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  await models(ctx);

  await mongoose.syncIndexes();

  return () => conn.close();
};
