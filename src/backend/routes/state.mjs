export default [
  {
    path: '/state',
    method: 'get',
    async middleware (req, res, next) {
      res.json({
        user: req.user,
        token: req.token
      });
    }
  }
];
