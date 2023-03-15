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
  enabled: {
    type: Boolean
  },
  name: {
    type: String,
    unique: true
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

CodeSchema.statics.loadAll = async function () {
  const items = await Code.find({ enabled: true });
  const AsyncFunction = async function () {}.constructor;
  for (let i = 0; i < items.length; i++) {
    const { name, args = [], source } = items[i];
    global.context = {};
    if (name && source) {
      // eslint-disable-next-line no-new-func
      if (name in global.context === false) {
        global[name] = new AsyncFunction(...args, source);
      }
    }
  }
};

const Code = mongoose.model('Code', CodeSchema);

export default Code;
