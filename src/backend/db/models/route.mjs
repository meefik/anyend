import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const RouteSchema = new Schema({
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date
  },
  path: {
    type: String
  },
  roles: {
    type: [String]
  },
  operator: {
    type: String,
    default: 'read',
    enum: ['create', 'read', 'update', 'delete']
  },
  schema: {
    type: String
  },
  filter: {
    type: Schema.Types.Mixed
  },
  select: {
    type: Schema.Types.Mixed
  },
  code: {
    type: Schema.Types.ObjectId,
    ref: 'Code'
  }
}, {
  strict: true,
  strictQuery: false
});

RouteSchema.set('toJSON', {
  virtuals: true,
  getters: true,
  transform (doc, ret) {
    delete ret._id;
    delete ret[RouteSchema.options.versionKey];
    delete ret[RouteSchema.options.discriminatorKey];
    return ret;
  }
});

RouteSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

const Route = mongoose.model('Route', RouteSchema);

export default Route;
