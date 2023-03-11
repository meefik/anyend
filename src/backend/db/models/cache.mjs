import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const CacheSchema = new Schema({
  updatedAt: {
    type: Date,
    default: Date.now,
    expires: 24 * 60 * 60 // 1 day
  },
  key: {
    type: String,
    unique: true,
    require: true
  },
  data: {
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

CacheSchema.statics.readCache = async function (key, expires = 60) {
  const updatedAt = new Date(Date.now() - expires * 1000);
  const { data } = await Cache.findOne({ key, updatedAt: { $gte: updatedAt } }) || {};
  return data;
};

CacheSchema.statics.writeCache = async function writeCache (key, data) {
  await Cache.updateOne({ key }, { $set: { updatedAt: new Date(), key, data } }, { upsert: true });
};

const Cache = mongoose.model('Cache', CacheSchema);

export default Cache;
