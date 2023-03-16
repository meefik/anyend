import { tmpdir } from 'node:os';

export default {
  global: {
    VERSION: '1.0.0',
    isAuth: async function (roles, req, res) {
      return roles.includes(req.user?.role);
    }
  },
  schemas: {

  },
  events: {
    startup: async function () {
      console.log('startup');
    },
    shutdown: async function () {
      console.log('shutdown');
    }
  },
  tasks: {
    myTask: {
      repeat: '1 minute',
      task: async () => console.log('myTask')
    }
  },
  websockets: {

  },
  files: {
    tmpdir: tmpdir(),
    limit: 100,
    expires: 60,
    public: '/path/to/dir'
  },
  caches: {
    expires: 60
  },
  cookies: {
    secret: 'secret',
    expires: 60
  },
  routes: [{
    middleware: [
      async (req, res) => console.log('middleware')
    ]
  }, {
    method: 'post',
    path: '/jwt',
    middleware: [
      async (req) => await req.logIn({
        strategy: 'jwt',
        secret: process.env.JWT_SECRET
      }),
      async (req, res) =>
        req.user
          ? res.json({ token: req.token })
          : res.status(401).end()
    ]
  }, {
    method: 'post',
    path: '/login',
    middleware: [
      async (req) => await req.logIn({
        username: req.body.username,
        password: req.user.password
      }, {
        strategy: 'plain',
        upsert: false
      })
    ]
  }, {
    method: 'post',
    path: '/logout',
    middleware: [
      async (req) => await req.logOut()
    ]
  }, {
    method: 'get',
    path: '/state',
    middleware: [
      async (...args) => await global.isAuth('admin', ...args),
      async function (req, res) {
        res.json({
          user: req.user,
          session: req.session
        });
      }
    ]
  }, {
    method: 'post',
    path: '/user/:id',
    middleware: [
      // async (...args) => await global.isAuth('admin', ...args),
      {
        schema: 'User',
        operator: 'read',
        filter: 'req.query.filter',
        select: 'req.query.select',
        sort: 'req.query.sort',
        populate: 'req.query.populate',
        single: false,
        count: true,
        skip: 0,
        limit: 10
      }
    ]
  }]
};
