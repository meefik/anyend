export default {
  schema: {
    updatedAt: {
      type: Date,
      default: Date.now,
      expires: '1d'
    },
    key: {
      type: String,
      unique: true,
      require: true
    },
    data: {}
  },
  statics: {
    async readCache (key, expires = 3600) {
      const updatedAt = new Date(Date.now() - expires * 1000);
      const { data } = await this.findOne({ key, updatedAt: { $gte: updatedAt } }).exec() || {};
      return data;
    },
    async writeCache (key, data) {
      await this.updateOne({ key }, { $set: { data, updatedAt: new Date() } }, { upsert: true });
    }
  }
};
