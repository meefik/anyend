import mongoose from 'mongoose';
import nconf from 'nconf';

const Schema = mongoose.Schema;

const CacheSchema = new Schema({
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    expires: nconf.get('cache:expires')
  },
  key: {
    type: String,
    unique: true,
    require: true
  },
  value: {
    type: Schema.Types.Mixed
  }
}, {
  strict: true,
  strictQuery: false
});

CacheSchema.set('toJSON', {
  virtuals: true,
  getters: true,
  transform (doc, ret) {
    delete ret._id;
    delete ret[CacheSchema.options.versionKey];
    delete ret[CacheSchema.options.discriminatorKey];
    return ret;
  }
});

CacheSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

CacheSchema.statics.readCache = async function (key, expires = 60) {
  const updatedAt = new Date(Date.now() - expires * 1000);
  const { data } = await Cache.findOne({ key, updatedAt: { $gte: updatedAt } }) || {};
  return data;
};

CacheSchema.statics.writeCache = async function writeCache (key, value) {
  await Cache.updateOne({ key }, { $set: { updatedAt: new Date(), key, value } }, { upsert: true });
};

const Cache = mongoose.model('Cache', CacheSchema);

export default Cache;
