import mongoose from 'mongoose';
import nconf from 'nconf';

const Schema = mongoose.Schema;

const SessionSchema = new Schema({
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    expires: nconf.get('session:expires')
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true,
    require: true
  },
  key: {
    type: String,
    require: true
  },
  value: {
    type: Schema.Types.Mixed
  }
}, {
  strict: true,
  strictQuery: false
});

SessionSchema.set('toJSON', {
  virtuals: true,
  getters: true,
  transform (doc, ret) {
    delete ret._id;
    delete ret[SessionSchema.options.versionKey];
    delete ret[SessionSchema.options.discriminatorKey];
    return ret;
  }
});

SessionSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// SessionSchema.index({ user: 1, key: 1 }, { unique: true });

const Session = mongoose.model('Session', SessionSchema);

export default Session;
