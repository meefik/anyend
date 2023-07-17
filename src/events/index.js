import mongo from '../mongo/index.js';
import events from '../utils/events.js';
import logger from '../utils/logger.js';

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
        const { name, data } = fullDocument;
        events.emit(name, data);
      }
    });
    changeStream.on('error', function (err) {
      logger.log({ level: 'error', label: 'events', message: err.message });
    });
  }
  _context.broadcast = async function (name, ...data) {
    await db?.model('Event').create({ name, data });
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
