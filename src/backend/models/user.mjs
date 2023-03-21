import crypto from 'node:crypto';

export default {
  schema: {
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true
    },
    username: {
      type: String,
      unique: true,
      require: true
    },
    hash: {
      type: String,
      select: false
    },
    salt: {
      type: String,
      select: false
    },
    role: {
      type: String,
      default: 'guest',
      enum: ['guest', 'admin']
    }
  },
  virtuals: {
    password: {
      get () {
        return this._password;
      },
      set (val) {
        this._password = val;
        const { salt, hash } = this.encryptPassword(val);
        this.salt = salt;
        this.hash = hash;
      }
    }
  },
  methods: {
    encryptPassword (password, salt) {
      if (!salt) salt = crypto.randomBytes(32).toString('base64');
      const hash = crypto.createHmac('sha1', salt).update(password).digest('base64');
      return { salt, hash };
    },
    validPassword (password) {
      if (!password || !this.salt || !this.hash) return false;
      const { hash } = this.encryptPassword(password, this.salt);
      return hash === this.hash;
    }
  },
  statics: {
    async logIn (username, password) {
      const user = await this.findOne({
        username
      }).select('+hash +salt').exec();
      if (user?.validPassword(password)) return user;
    }
  },
  events: {
    async load () {
      const user = await this.findOne({ role: 'admin' }).select({ _id: 1 });
      if (!user) {
        const user = new this({
          role: 'admin',
          username: 'admin',
          password: 'changeme'
        });
        await user.save();
      }
    }
  }
};
