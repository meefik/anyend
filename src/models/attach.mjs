export default {
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
};
