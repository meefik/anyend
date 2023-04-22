import cluster from 'node:cluster';
import db from 'mongoose';
import models from './models/index.mjs';
import logger from '../utils/logger.mjs';
import mergeDeep from '../utils/merge.mjs';

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

  const _models = mergeDeep(models, options.models);
  for (const name in _models) {
    const params = _models[name];
    let schema;
    if (params.schema instanceof db.Schema) {
      schema = params.schema;
    } else {
      schema = new db.Schema(params.schema, params.options);
    }
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
    // for (const name in schema.obj) {
    //   const field = schema.obj[name];
    //   if (field.ref !== 'Attach') continue;
    //   schema.post('init', { document: true, query: false }, function () {
    //     console.log('post.init', name, this[name]);
    //     this[`_${name}`] = this[name];
    //   });
    //   schema.post('save', { document: true, query: false }, async function () {
    //     console.log('post.save', name, this[`_${name}`], this[name]);
    //     // FIXME: ObjectId or Array
    //     if (this[`_${name}`] !== this[name]) {
    //       await this.model('Attach').setAttachedFlag(this[name], true);
    //       await this.model('Attach').setAttachedFlag(this[`_${name}`], false);
    //     }
    //   });
    //   schema.post('deleteOne', { document: true, query: false }, async function () {
    //     console.log('post.deleteOne', name, this[name]);
    //     await this.model('Attach').setAttachedFlag(this[name], false);
    //   });
    // }
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
      const handler = params.methods[name];

      if (typeof handler === 'function') {
        schema.methods[name] = handler;
      }
    }
    for (const name in params.statics) {
      const handler = params.statics[name];
      if (typeof handler === 'function') {
        schema.statics[name] = handler;
      }
    }
    for (const hooks of params.hooks?.pre || []) {
      const options = hooks.options || {};
      for (const hook in hooks) {
        const handler = hooks[hook];
        if (typeof handler === 'function') {
          schema.pre(hook, options, handler);
        }
      }
    }
    for (const hooks of params.hooks?.post || []) {
      const options = hooks.options || {};
      for (const hook in hooks) {
        const handler = hooks[hook];
        if (typeof handler === 'function') {
          schema.post(hook, options, handler);
        }
      }
    }
    const model = db.model(name, schema);
    for (const name in params.events) {
      const handler = params.events[name];
      if (typeof handler === 'function') {
        model.on(name, handler);
      }
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
  return db;
}

export default {
  init,
  destroy,
  context
};
