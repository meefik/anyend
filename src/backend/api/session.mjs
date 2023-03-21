import config from 'nconf';
import db from 'mongoose';
import jwt from 'jsonwebtoken';

export default async function () {
  return function (req, res, next) {
    let payload, token, session;
    try {
      for (const source of config.get('session:sources')) {
        const { type, field } = source;
        token = req[type] && req[type][field];
        // Authorization: <type> <credentials>
        if (token && type === 'headers' && field === 'authorization') {
          token = token.split(/\s+/)[1];
        }
        if (token) break;
      }
      if (token) {
        payload = jwt.verify(token, config.get('session:secret'));
      }
    } catch (err) {
      payload = null;
      token = null;
    }
    Object.defineProperty(req, 'user', {
      enumerable: true,
      configurable: false,
      async get () {
        return payload;
      },
      async set (val) {
        try {
          if (!val) {
            payload = null;
            token = null;
          } else {
            const exp = ~~(Date.now() / 1000) + (config.get('session:expires') * 60);
            payload = { ...val, exp };
            token = jwt.sign(payload, config.get('session:secret'));
          }
        } catch (err) {
          payload = null;
          token = null;
        }
      }
    });
    Object.defineProperty(req, 'token', {
      enumerable: true,
      configurable: false,
      async get () {
        return token;
      },
      async set (val) {
        try {
          if (!val) {
            payload = null;
            token = null;
          } else {
            token = val;
            payload = jwt.verify(token, config.get('session:secret'));
          }
        } catch (err) {
          payload = null;
          token = null;
        }
      }
    });
    Object.defineProperty(req, 'session', {
      enumerable: true,
      configurable: false,
      async get () {
        if (req.user?.sid && !session) {
          session = await db.model('Session')?.findById(req.user?.sid).exec();
        }
        return session;
      },
      async set (val) {
        if (req.user?.sid && val !== session) {
          await db.model('Session')?.updateOne({ _id: req.user?.sid }, { $set: { data: val } });
        }
      }
    });
    next();
  };
}
