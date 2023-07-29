import config from './config/index.js';
import events from './events/index.js';
import mongo from './mongo/index.js';
import minio from './minio/index.js';
import scheduler from './scheduler/index.js';
import api from './api/index.js';

export default {
  mongo,
  config,
  events,
  scheduler,
  minio,
  api
};
