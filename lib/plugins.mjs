import config from './config/index.mjs';
import mongo from './mongo/index.mjs';
import minio from './minio/index.mjs';
import scheduler from './scheduler/index.mjs';
import api from './api/index.mjs';

export default {
  config,
  mongo,
  minio,
  scheduler,
  api
};
