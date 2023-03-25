export default {
  schema: {
    name: {
      type: String
    },
    single: {
      type: Boolean
    },
    unique: {
      type: Boolean
    },
    nextRunAt: {
      type: Date
    },
    lastRunAt: {
      type: Date
    },
    lockedAt: {
      type: Date
    },
    repeatInterval: {
      type: Number
    },
    failedAt: {
      type: Date
    },
    failReason: {
      type: String
    },
    failCount: {
      type: Number
    },
    lockLifetime: {
      type: Number
    },
    data: {}
  }
};
