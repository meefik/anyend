export default [
  {
    path: '/state/:id',
    method: 'post',
    async middleware (req, res, next) {
      res.json({
        path: req.path,
        params: req.params,
        query: req.query,
        body: req.body,
        user: req.user,
        token: req.token,
        files: req.files
      });
    }
  }
];
