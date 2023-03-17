import crypto from 'node:crypto';
import { tmpdir } from 'node:os';
import passport from 'passport';
import LocalStrategy from 'passport-local';

export default async function () {
  passport.use('local', new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password',
    passReqToCallback: true
  }, async (req, username, password, done) => {
    try {
      console.log(username, password);
      done(null, true);
    } catch (err) {
      done(err, false);
    }
  }));

  return {
    VERSION: '1.0.0',
    encryptPassword (password, salt) {
      if (!salt) salt = crypto.randomBytes(32).toString('base64');
      const hash = crypto.createHmac('sha1', salt).update(password).digest('base64');
      return { salt, hash };
    },
    isAuthenticated (roles, req) {
      return roles.includes(req.user?.role);
    },
    db: {
      uri: process.env.MONGO_URI || 'mongodb://admin:secret@127.0.0.1:27017/anyend?authSource=admin',
      schemas: {
        User: {
          username: String,
          password: String,
          salt: String
        }
      }
    },
    api: {
      host: process.env.HOST,
      port: process.env.PORT || 3000,
      timeout: 60,
      routes: [{
        middleware: [
          async (req, res, next) => console.log('middleware'),
          passport.initialize()
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
          passport.authenticate('local'),
          async (req, res) => {
            console.log('login');
            // res.json({});
          }
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
          (req) => global.isAuthenticated(['admin'], req),
          async (req, res) => {
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
          {
            schema: 'User',
            operator: 'read',
            filter: 'req.query.filter',
            select: 'req.query.select',
            sort: 'req.query.sort',
            populate: 'req.query.populate',
            one: false,
            count: true,
            skip: 0,
            limit: 10
          }
        ]
      }]
    },
    lifecycle: {
      async startup () {
        console.log('startup');
      },
      async shutdown () {
        console.log('shutdown');
        // return new Promise(resolve => setTimeout(resolve, 5000));
      }
    },
    tasks: {
      myTask: {
        repeat: '1 minute',
        unique: true,
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
    passport: {
      session: {

      }
    }
  };
}
