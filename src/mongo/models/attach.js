export default {
  schema: {
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true
    },
    filename: {
      type: String
    },
    mimetype: {
      type: String
    },
    size: {
      type: Number
    },
    attached: {
      type: Number,
      default: 0,
      index: true
    }
  },
  statics: {
    setAttachedFlag (items, flag) {
      if (!items) return;
      items = [].concat(items);
      if (items.length > 0) {
        return this.updateMany({
          _id: { $in: items },
          attached: flag ? { $gte: 0 } : { $gt: 0 }
        }, {
          $inc: { attached: flag ? 1 : -1 }
        }).exec();
      }
    }
  }
};
