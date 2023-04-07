export default {
  schema: {
    name: {
      type: String,
      unique: true
    },
    nextRunAt: {
      type: Date
    },
    lastRunAt: {
      type: Date
    },
    lockedUntil: {
      type: Date
    },
    repeatInterval: {
      type: Number
    },
    lockLifetime: {
      type: Number
    },
    failedAt: {
      type: Date
    },
    failReason: {
      type: String
    },
    failCount: {
      type: Number,
      default: 0
    }
  }
};
