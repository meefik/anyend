import os from 'node:os';
import process from 'node:process';
import mongo from '../mongo/index.mjs';
import events from '../utils/events.mjs';
import logger from '../utils/logger.mjs';

let changeStream;
const _context = { ...events };

export function init (options) {
  for (const event in options) {
    const handler = options[event];
    if (handler) events.on(event, handler);
  }
  const db = mongo.context();
  const model = db?.model('Event');
  if (model) {
    changeStream = model.watch([{
      $match: { operationType: 'insert' }
    }]);
    changeStream.on('change', function (change) {
      const { fullDocument } = change || {};
      if (fullDocument?.name) {
        const { name, worker, data } = fullDocument;
        events.emit(name, data, worker);
      }
    });
    changeStream.on('error', function (err) {
      logger.log({ level: 'error', label: 'events', message: err.message });
    });
  }
  _context.broadcast = async function (name, data) {
    const worker = `${os.hostname}-${process.pid}`;
    await db?.model('Event').create({ name, worker, data });
  };
}

export function destroy () {
  return changeStream?.close();
}

export function context () {
  return _context;
}

export default {
  init,
  destroy,
  context
};
