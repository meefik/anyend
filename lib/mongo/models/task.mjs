export default {
  schema: {
    name: {
      type: String,
      unique: true
    },
    nextRunAt: {
      type: Date
    }
  }
};
