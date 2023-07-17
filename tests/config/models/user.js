export default {
  schema: {
    role: {
      type: String,
      default: 'guest',
      enum: ['guest', 'customer', 'admin']
    }
  },
  hooks: {
    post: [{
      init () {
        console.log('custom post.init');
      }
    }],
    pre: [{
      options: {},
      async save (next) {
        console.log('custom pre.save');
        next();
      }
    }]
  }
};
