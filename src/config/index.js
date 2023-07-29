import mongo from '../mongo/index.js';
import config from '../utils/config.js';

const _context = {};

export function init () {
  const db = mongo.context();
  _context.get = async function get (key, defaults) {
    const _data = config.get(key);
    if (_data) {
      return typeof _data === 'undefined' ? defaults : _data;
    }
    const { data } = await db?.model('Config').findOne({ key }).exec() || {};
    return typeof data === 'undefined' ? defaults : data;
  };
  _context.set = async function set (key, data) {
    await db?.model('Config').updateOne({ key }, { $set: { data } }, { upsert: true }).exec();
    config.set(key, data);
  };
}

export function context () {
  return _context;
}

export default {
  init,
  context
};
