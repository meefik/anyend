export default {
  schema: {
    updatedAt: {
      type: Date,
      default: Date.now,
      expires: '1d'
    },
    data: {}
  }
};
