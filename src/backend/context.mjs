import crypto from 'node:crypto';
import { tmpdir } from 'node:os';

export default async function () {
  return {
    VERSION: '1.0.0',
    encryptPassword (password, salt) {
      if (!salt) salt = crypto.randomBytes(32).toString('base64');
      const hash = crypto.createHmac('sha1', salt).update(password).digest('base64');
      return { salt, hash };
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
      session: {
        secret: 'secret',
        expires: 60,
        sources: [
          { field: 'token', type: 'cookies' },
          { field: 'authorization', type: 'headers' },
          { field: 'token', type: 'query' }
        ]
      },
      cors: {
        origin: true
      },
      compression: {},
      passport: {
        async isAuthenticated (req, roles) {
          console.log('isAuth');
          return roles.includes(req.user?.role);
        },
        authenticators: [{
          strategy: 'local',
          options: {
            usernameField: 'username',
            passwordField: 'password'
          },
          async authorize (req, username, password) {
            console.log(username, password);
            return { username };
          }
        }]
      },
      routes: [{
        middleware: [
          async (req, res, next) => console.log('middleware')
        ]
      }, {
        method: 'post',
        path: '/login',
        middleware: [
          async (req) => console.log(await req.logIn('local')),
          async (req, res) => {
            console.log('login', req.isAuthenticated());
            res.cookie('aaa', 'bbb');
            res.json({ user: req.user, session: req.session, cookies: req.cookies });
          }
        ]
      }, {
        method: 'post',
        path: '/logout',
        middleware: [
          async (req) => console.log(await req.logOut())
        ]
      }, {
        method: 'post',
        path: '/state',
        middleware: [
          async (req) => {
            if (!req.isAuthenticated(['admin'])) throw Error('Unauthorized');
          },
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
