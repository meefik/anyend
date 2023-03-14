import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const ConfigSchema = new Schema({
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date
  },
  key: {
    type: String,
    unique: true,
    require: true
  },
  value: {
    type: Schema.Types.Mixed
  },
  public: {
    type: Boolean,
    index: true
  }
}, {
  strict: true,
  strictQuery: false
});

ConfigSchema.set('toJSON', {
  virtuals: true,
  getters: true,
  transform (doc, ret) {
    delete ret._id;
    delete ret[ConfigSchema.options.versionKey];
    delete ret[ConfigSchema.options.discriminatorKey];
    return ret;
  }
});

ConfigSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

const Config = mongoose.model('Config', ConfigSchema);

export default Config;
