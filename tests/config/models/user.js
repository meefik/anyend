export default {
  schema: {
    role: {
      type: String,
      default: 'guest',
      enum: ['guest', 'cutsomer', 'admin']
    },
    first_name: {
      type: String
    },
    last_name: {
      type: String
    }
  },
  hooks: {
    post: [{
      init() {
        console.log('custom post.init');
      }
    }],
    pre: [{
      options: {},
      async save(next) {
        console.log('custom pre.save');
        next();
      }
    }]
  }
};
