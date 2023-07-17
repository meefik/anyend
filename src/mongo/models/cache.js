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
  }
};
