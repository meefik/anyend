export default [
  {
    path: '/login',
    method: 'post',
    async middleware (req, res, next) {
      const { username, password } = req.body;
      const { mongo } = global.context;
      req.user = await mongo.model('User').logIn(username, password);
      res.json({
        user: req.user,
        token: req.token
      });
    }
  }
];
