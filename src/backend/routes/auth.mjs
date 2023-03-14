import nconf from 'nconf';
import express from 'express';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import User from '../db/models/user.mjs';
import Session from '../db/models/session.mjs';
import Config from '../db/models/config.mjs';

const router = express.Router();

passport.serializeUser(function (data, done) {
  done(null, data);
});

passport.deserializeUser(function (data, done) {
  done(null, data);
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

// JWT session
passport.use(
  'session',
  new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromExtractors([
      // eslint-disable-next-line new-cap
      new ExtractJwt.fromAuthHeaderAsBearerToken(),
      // eslint-disable-next-line new-cap
      new ExtractJwt.fromUrlQueryParameter('token')
    ]),
    secretOrKey: nconf.get('session:key')
  }, function (payload, done) {
    done(null, payload);
  })
);

router.use(passport.initialize());

// JWT authentication
router.use(function (req, res, next) {
  passport.authenticate('session', { session: false }, async function (err, payload) {
    if (err || !payload) return next(err);
    try {
      const user = await User.findById(payload.id);
      req.user = user?.toJSON();
      const sessionKeys = await Session.find({ user: payload.id }).lean();
      const session = {};
      for (let i = 0; i < sessionKeys.length; i++) {
        const item = sessionKeys[i];
        session[item.key] = item.value;
      }
      req.session = session;
      next();
    } catch (err) {
      next(err);
    }
  })(req, res, next);
});

// Log in
router.post('/login',
  passport.authenticate('local', { session: false }),
  function (req, res) {
    const { token } = User.getSessionToken({ id: req.user.id });
    res.json({ user: req.user, token });
  });

// Update session token
router.get('/state', function (req, res, next) {
  if (!req.user) {
    res.status(401);
    next(new Error('Unauthorized'));
  } else {
    const { token } = User.getSessionToken({ id: req.user.id });
    res.json({ user: req.user, token });
  }
});

// Get public params
router.get('/config', async function (req, res, next) {
  try {
    const config = {};
    const params = await Config.find({ public: true }).lean();
    for (let i = 0; i < params.length; i++) {
      const param = params[i];
      config[param.key] = param.value;
    }
  } catch (err) {
    next(err);
  }
});

export default router;
