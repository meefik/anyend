import nconf from 'nconf';
import express from 'express';
import passport from 'passport';
import session from 'express-session';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import User from '../db/models/user.mjs';
import Session from '../db/models/session.mjs';
import Config from '../db/models/config.mjs';

const router = express.Router();

passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user?.id);
  });
});

passport.deserializeUser(async function (id, cb) {
  try {
    const user = await User.findById(id);
    cb(null, user?.toJSON());
  } catch (err) {
    cb(err);
  }
});

// Plain username and password
passport.use(
  'local',
  new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password',
    passReqToCallback: true
  }, async function (req, username, password, done) {
    try {
      const user = await User.logIn({
        username,
        password,
        ipaddress: req.ip,
        useragent: req.get('user-agent')
      });
      if (!user) return done(null, false);
      done(null, { id: user.id });
    } catch (err) {
      done(err, false);
    }
  })
);

function cookieExtractor (name) {
  return function (req) {
    let token = null;
    if (req && req.cookies) {
      token = req.cookies.jwt;
    }
    return token;
  };
}

// JWT session
passport.use(
  'session',
  new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromExtractors([
      cookieExtractor('sid'),
      // eslint-disable-next-line new-cap
      new ExtractJwt.fromAuthHeaderAsBearerToken(),
      // eslint-disable-next-line new-cap
      new ExtractJwt.fromUrlQueryParameter('sid')
    ]),
    secretOrKey: nconf.get('session:secret')
  }, function (payload, done) {
    done(null, payload);
  })
);

// router.use(session({
//   name: 'sid',
//   secret: 'secret',
//   store: {
//     async get (sid, cb) {
//       try {
//         console.log('session.get', sid);
//         // const data = await Session.findOne({ _id: sid })
//           // .select({ value: 1 }).exec();
//         cb(null, '');
//       } catch (err) {
//         cb(err);
//       }
//     },
//     destroy (sid, cb) {
//       console.log('destroy')
//     },
//     set (sid, session, cb) {
//       console.log
//     }
//   }
// }));
router.use(passport.initialize());

// JWT authentication
router.use(function (req, res, next) {
  passport.authenticate('session', { session: false }, async function (err, payload) {
    if (err || !payload) return next(err);
    try {
      // const user = await User.findById(payload.id);
      // req.user = user?.toJSON();
      // const sessionKeys = await Session.find({ user: payload.id }).lean();
      // const session = {};
      // for (let i = 0; i < sessionKeys.length; i++) {
      //   const item = sessionKeys[i];
      //   session[item.key] = item.value;
      // }
      // req.session = session;
      next();
    } catch (err) {
      next(err);
    }
  })(req, res, next);
});

export default router;
