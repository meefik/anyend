import db from 'mongoose';

export default [
  {
    path: '/login',
    method: 'post',
    async middleware (req, res, next) {
      const { username, password } = req.body;
      req.user = await db.model('User').logIn(username, password);
      res.json({
        user: req.user,
        token: req.token
      });
    }
  }
];
