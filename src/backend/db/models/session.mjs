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
    default: Date.now,
    expires: nconf.get('session:expires')
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

const Session = mongoose.model('Session', SessionSchema);

export default Session;
