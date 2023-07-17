export default {
  schema: {
    name: String,
    data: {}
  },
  options: {
    capped: { size: 16 * 1024 * 1024 }
  }
};
