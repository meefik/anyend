import cluster from 'node:cluster';
import db from 'mongoose';
import logger from '../utils/logger.mjs';

export async function init (options) {
  const conn = db.connection;

  // Show debug logs
  if (logger.level === 'debug') {
    db.set('debug', function (collectionName, method, query, doc) {
      // LOG format: rooms.find({}) { sort: {}, fields: undefined }
      logger.log({
        level: 'debug',
        label: 'mongo',
        message: `${collectionName}.${method}(${
          query ? JSON.stringify(query) : ''
        }) ${doc ? JSON.stringify(doc) : ''}`
      });
    });
  }

  conn.on('connected', async function () {
    logger.log({ level: 'info', label: 'mongo', message: 'Database is connected' });
  });

  conn.on('disconnected', function () {
    logger.log({ level: 'info', label: 'mongo', message: 'Database has been disconnected' });
  });

  conn.on('error', function (err) {
    logger.log({ level: 'error', label: 'mongo', message: err });
  });

  await db.connect(options.uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    autoIndex: false
  });

  const models = options.models;
  for (const name in models) {
    const params = models[name];
    const schema = new db.Schema(params.schema, params.options);
    const { versionKey, discriminatorKey } = schema.options;
    schema.set('toJSON', {
      transform (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret[versionKey];
        delete ret[discriminatorKey];
        return ret;
      }
    });
    for (const name in params.virtuals) {
      const value = params.virtuals[name];
      if (value.get) {
        schema.virtual(name).get(value.get);
      }
      if (value.set) {
        schema.virtual(name).set(value.set);
      }
      if (!value.get && !value.set) {
        schema.virtual(name, value);
      }
    }
    for (const name in params.methods) {
      const hander = params.methods[name];
      schema.methods[name] = hander;
    }
    for (const name in params.statics) {
      const hander = params.statics[name];
      schema.statics[name] = hander;
    }
    for (const hook in params.hooks?.pre) {
      const hander = params.hooks.pre[hook];
      schema.pre(hook, hander);
    }
    for (const hook in params.hooks?.post) {
      const hander = params.hooks.post[hook];
      schema.post(hook, hander);
    }
    const model = db.model(name, schema);
    for (const name in params.events) {
      const hander = params.events[name];
      model.on(name, hander);
    }
    if (cluster.worker.id === 1) {
      model.emit('load');
    }
  }

  if (cluster.worker.id === 1) {
    await db.syncIndexes();
  }
};

export function destroy () {
  return db.connection?.close();
}

export function context () {
  return { db };
}

export default {
  init,
  destroy,
  context
};
