import lifecycle from './lifecycle/index.mjs';
import mongo from './mongo/index.mjs';
import minio from './minio/index.mjs';
import scheduler from './scheduler/index.mjs';
import api from './api/index.mjs';

export default {
  lifecycle,
  mongo,
  minio,
  scheduler,
  api
};
