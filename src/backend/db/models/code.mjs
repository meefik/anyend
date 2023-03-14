import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const CodeSchema = new Schema({
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date
  },
  args: {
    type: [String]
  },
  source: {
    type: String
  },
  description: {
    type: String
  }
}, {
  strict: true,
  strictQuery: false
});

CodeSchema.set('toJSON', {
  virtuals: true,
  getters: true,
  transform (doc, ret) {
    delete ret._id;
    delete ret[CodeSchema.options.versionKey];
    delete ret[CodeSchema.options.discriminatorKey];
    return ret;
  }
});

CodeSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

CodeSchema.methods.createFunction = async function () {
  if (!this.source) return;
  const args = this.args || [];
  const source = this.source;
  // eslint-disable-next-line no-new-func
  return new Function(...args, source);
};

const Code = mongoose.model('Code', CodeSchema);

export default Code;
