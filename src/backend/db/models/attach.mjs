import http from 'node:http';
import https from 'node:https';
import mongoose from 'mongoose';
import nconf from 'nconf';
import Minio from 'minio';
import parseUri from 'lib/uri-parser';

const Schema = mongoose.Schema;
const minioOptions = parseUri(nconf.get('minio:uri')) || {};
const minioClients = [];
const hosts = minioOptions.hosts || [];
const timeout = minioOptions.options?.timeout || 60000;
const useSSL = minioOptions.scheme === 'https';
const transport = useSSL ? https : http;
for (let i = 0; i < hosts.length; i++) {
  const client = new Minio.Client({
    useSSL,
    endPoint: hosts[i]?.host,
    port: hosts[i]?.port,
    accessKey: minioOptions.username,
    secretKey: minioOptions.password,
    region: minioOptions.options?.region,
    sessionToken: minioOptions.options?.sessionToken,
    partSize: minioOptions.options?.partSize,
    transport: {
      request (options, cb) {
        const req = transport.request(options, cb);
        req.setTimeout(timeout);
        req.once('timeout', function () {
          req.destroy();
        });
        return req;
      }
    }
  });
  minioClients.push(client);
}

function getMinioClient () {
  return minioClients[~~(Math.random() * minioClients.length)];
}

const AttachSchema = new Schema({
  createdAt: {
    type: Date,
    default: Date.now
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  filename: {
    type: String
  },
  size: {
    type: Number
  },
  mimetype: {
    type: String
  },
  attached: {
    type: Number,
    default: 0,
    index: true
  },
  metadata: {}
}, {
  strict: true,
  strictQuery: false
});

AttachSchema.set('toJSON', {
  virtuals: true,
  getters: true,
  transform (doc, ret) {
    delete ret._id;
    delete ret[AttachSchema.options.versionKey];
    delete ret[AttachSchema.options.discriminatorKey];
    return ret;
  }
});

// AttachSchema.pre('save', function (next) {
//   next();
// });

AttachSchema.pre('remove', function (next) {
  const bucket = this.bucket || minioOptions.endpoint;
  if (!bucket) return next(new Error('Bucket not defined'));
  const minioClient = getMinioClient();
  const filename = `${this.id}`;
  if (this.bucket) {
    minioClient.bucketExists(this.bucket, (err, exists) => {
      if (err || !exists) return next(err);
      minioClient.removeObject(bucket, filename, next);
    });
  } else {
    minioClient.removeObject(bucket, filename, next);
  }
});

AttachSchema.methods.putFile = function (file) {
  const bucket = minioOptions.endpoint;
  if (!bucket) return new Error('Bucket not defined');
  const minioClient = getMinioClient();
  const filename = `${this.id}`;
  return minioClient.fPutObject(bucket, filename, String(file));
};

AttachSchema.methods.putObject = function (data) {
  return Attach.putObject(this.id, data);
};

AttachSchema.methods.getObject = function () {
  return Attach.getObject(this.id);
};

AttachSchema.methods.getPartialObject = function (offset, length) {
  return Attach.getPartialObject(this.id, offset, length);
};

AttachSchema.statics.putObject = function (id, data) {
  const bucket = minioOptions.endpoint;
  if (!bucket) return new Error('Bucket not defined');
  const minioClient = getMinioClient();
  const filename = `${id}`;
  return minioClient.putObject(bucket, filename, data);
};

AttachSchema.statics.getObject = function (id) {
  const bucket = minioOptions.endpoint;
  if (!bucket) return new Error('Bucket not defined');
  const minioClient = getMinioClient();
  const filename = `${id}`;
  return minioClient.getObject(bucket, filename);
};

AttachSchema.statics.getPartialObject = function (id, offset, length) {
  const bucket = minioOptions.endpoint;
  if (!bucket) return new Error('Bucket not defined');
  const minioClient = getMinioClient();
  const filename = `${id}`;
  return minioClient.getPartialObject(bucket, filename, offset, length);
};

/**
 * Установить флаг прикрепленности вложения.
 *
 * @param {ObjectId[]} items Список идентификаторов аттачей
 * @param {boolean} flag Флаг прикрепления
 * @returns {Promise}
 */
AttachSchema.statics.setAttachedFlag = function (items, flag) {
  if (!items) return;
  items = [].concat(items);
  if (items.length > 0) {
    return Attach.updateMany({
      _id: { $in: items }
    }, {
      $inc: { attached: flag ? 1 : -1 }
    }).exec();
  }
};

const Attach = mongoose.model('Attach', AttachSchema);

export default Attach;
