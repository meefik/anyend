import nconf from 'nconf';
import mongoose from 'mongoose';
import logger from '../lib/logger.mjs';
import User from '../db/models/user.mjs';
import Config from '../db/models/config.mjs';
import dao from './dao.mjs';

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

// Add default user
User.on('index', async function (e) {
  try {
    if (e) throw e;
    const user = await User.findOne({ role: 'admin' }).select({ _id: 1 }).lean();
    if (!user) {
      // Add default admin user
      const user = new User({
        role: 'admin',
        username: 'admin',
        password: 'changeme'
      });
      await user.save();
    }
  } catch (err) {
    logger.log({ level: 'error', label: 'db', message: err.message });
  }
});

conn.on('connected', async function () {
  logger.log({ level: 'info', label: 'db', message: 'Database is connected' });
});

conn.on('disconnected', function () {
  logger.log({ level: 'info', label: 'db', message: 'Database has been disconnected' });
});

conn.on('error', function (err) {
  logger.log({ level: 'error', label: 'db', message: err });
});

function connect () {
  return mongoose
    .connect(nconf.get('mongo:uri'), {
      useNewUrlParser: true,
      useUnifiedTopology: true
    })
    .then(async function (_mongoose) {
      // Load params from db
      const params = await Config.find({}).select({ key: 1, value: 1 }).lean();
      for (let i = 0; i < params.length; i++) {
        const { key, value } = params[i];
        nconf.set(key, value);
      }
      return _mongoose;
    });
}

function disconnect () {
  return conn.close();
}

export default {
  get connection () {
    return conn;
  },
  connect,
  disconnect,
  ...dao
};
