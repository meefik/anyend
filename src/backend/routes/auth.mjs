import nconf from 'nconf';
import express from 'express';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import User from '../db/models/user.mjs';

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
      done(null, user);
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
  passport.authenticate('session', { session: false }, function (err, payload) {
    if (err || !payload) return next(err);
    req.user = payload;
    next();
  })(req, res, next);
});

// Log in
router.post('/login',
  passport.authenticate('local', { session: false }),
  function (req, res) {
    const { token } = User.getToken(req.user);
    res.json({ user: req.user, token });
  });

// Get user data from session
router.get('/state', function (req, res, next) {
  if (!req.user) {
    res.status(401);
    next(new Error('Unauthorized'));
  } else {
    const { token } = User.getToken(req.user);
    res.json({ user: req.user, token });
  }
});

export default router;
