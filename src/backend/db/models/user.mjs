import crypto from 'node:crypto';
import nconf from 'nconf';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

const Schema = mongoose.Schema;

const UserSchema = new Schema({
  username: {
    type: String,
    unique: true,
    require: true
  },
  locked: {
    type: Boolean
  },
  hashedPassword: {
    type: String,
    select: false
  },
  salt: {
    type: String,
    select: false
  },
  role: {
    type: String,
    default: 'user',
    enum: ['user', 'admin']
  },
  nickname: {
    type: String
  },
  lang: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  loggedAt: {
    type: Date
  },
  ipaddress: {
    type: String
  },
  useragent: {
    type: String
  }
}, {
  strict: true,
  strictQuery: false
});

UserSchema.virtual('password')
  .set(function (password) {
    if (!password) password = this.randomPassword();
    this._plainPassword = password;
    this.salt = this.randomPassword();
    this.hashedPassword = this.encryptPassword(password, this.salt);
  })
  .get(function () {
    return this._plainPassword;
  });

UserSchema.set('toJSON', {
  virtuals: true,
  getters: true,
  transform (doc, ret) {
    delete ret._id;
    delete ret[UserSchema.options.versionKey];
    delete ret[UserSchema.options.discriminatorKey];
    delete ret.hashedPassword;
    delete ret.salt;
    delete ret.password;
    return ret;
  }
});

UserSchema.pre('save', function (next) {
  if (!this.nickname) this.nickname = this.username;
  next();
});

UserSchema.methods.isActive = function () {
  return !this.locked;
};

UserSchema.methods.randomPassword = function (length = 32) {
  return crypto.randomBytes(length).toString('base64');
};

UserSchema.methods.encryptPassword = function (password, salt) {
  return crypto.createHmac('sha1', salt).update(password).digest('hex');
};

UserSchema.methods.validPassword = function (password) {
  if (!password || !this.salt) return false;
  return this.encryptPassword(password, this.salt) === this.hashedPassword;
};

/**
 * Get the session token for the specified payload.
 *
 * @param {*} payload JWT payload.
 * @returns {Object}
 */
UserSchema.statics.getToken = function (payload = {}) {
  const expires = parseInt(nconf.get('session:expires')) * 60;
  const id = payload.id || mongoose.Types.ObjectId();
  const role = payload.role || 'user';
  const obj = {};
  for (const k in payload) {
    obj[k] = payload[k];
  }
  obj.exp = ~~(Date.now() / 1000) + expires;
  if (!obj.id) obj.id = id;
  if (!obj.username) obj.username = id;
  if (!obj.nickname) obj.nickname = role;
  obj.token = jwt.sign(obj, nconf.get('session:key'));
  return obj;
};

/**
 * Login and password authorization.
 *
 * @param {Object} data Profile data.
 * @returns {Promise}
 */
UserSchema.statics.logIn = async function (data) {
  const profile = {
    ...data,
    loggedAt: new Date()
  };
  if (!profile.username) return;
  const user = await User.findOne({
    username: profile.username
  }).select('+hashedPassword +salt').exec();
  if (!user) return;
  if (!user.isActive()) return;
  if (!user.validPassword(profile.password)) return;
  for (const k in profile) {
    if (typeof profile[k] === 'undefined' || k === 'password') continue;
    user[k] = profile[k];
  }
  await user.save();
  return {
    id: user.id,
    username: user.username,
    nickname: user.nickname,
    role: user.role
  };
};

const User = mongoose.model('User', UserSchema);

export default User;
