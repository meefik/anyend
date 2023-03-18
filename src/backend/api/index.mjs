import fs from 'node:fs';
import process from 'node:process';
import http from 'node:http';
import https from 'node:https';
import express from 'express';
import morgan from 'morgan';
import compression from 'compression';
import cors from 'cors';
import cookieParser from 'cookie-parser';
// import session from 'express-session';
// import session from 'cookie-session';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import logger from '../utils/logger.mjs';
import rest from './rest.mjs';

// Parse SSL path
function parseConf (val) {
  if (!val) return;
  try {
    if (/^-----/.test(val)) {
      return String(val).replace(/\\n/g, '\n');
    } else {
      const data = fs.readFileSync(val, { encoding: 'utf8' });
      fs.watchFile(val, () => process.emit('SIGTERM'));
      return data;
    }
  } catch (err) {
    logger.log({
      level: 'error',
      label: 'server',
      message: err.message || err
    });
  }
};

export default async function (ctx) {
  // Load passport stratagies
  ctx.passport?.authenticators && [].concat(ctx.passport?.authenticators).forEach(authenticator => {
    const { strategy, options, authorize } = authenticator;
    switch (strategy) {
    case 'local':
      passport.use('local', new LocalStrategy({
        ...options,
        passReqToCallback: true
      }, async (req, username, password, done) => {
        try {
          const payload = await authorize(req, username, password);
          done(null, payload);
        } catch (err) {
          done(err);
        }
      }));
      break;
    }
  });

  // Create web server
  const app = express();
  const protocol = ctx.ssl ? 'https' : 'http';
  const server = (protocol === 'https')
    ? https.Server(
      {
        key: parseConf(ctx.ssl.key),
        cert: parseConf(ctx.ssl.cert),
        ca: parseConf(ctx.ssl.ca)
      },
      app
    )
    : http.Server(app);
  // Setup app server
  app.enable('trust proxy');
  app.disable('x-powered-by');
  app.use(
    morgan(function (tokens, req, res) {
      const ip = req.ip;
      const method = tokens.method(req, res);
      const url = tokens.url(req, res);
      const statusCode = tokens.status(req, res);
      const statusMessage = res.statusMessage;
      const size = tokens.res(req, res, 'content-length') || 0;
      const duration = ~~tokens['response-time'](req, res);
      const message = `${ip} - ${method} ${url} ${statusCode} (${statusMessage}) ${size} bytes - ${duration} ms`;
      const label = req.protocol;
      let level;
      if (res.statusCode >= 100) {
        level = 'info';
      } else if (res.statusCode >= 400) {
        level = 'warn';
      } else if (res.statusCode >= 500) {
        level = 'error';
      } else {
        level = 'verbose';
      }
      logger.log({ level, label, message });
    })
  );
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(cookieParser());
  ctx.compression && app.use(compression(ctx.compression));
  ctx.cors && app.use(cors(ctx.cors));
  ctx.session && app.use(function (req, res, next) {
    const {
      secret = 'secret',
      expires = 60,
      sources = [
        { field: 'token', type: 'cookies' },
        { field: 'authorization', type: 'headers' },
        { field: 'token', type: 'query' }
      ]
    } = ctx.session;
    let payload, token;
    try {
      for (const source of sources) {
        const { type, field } = source;
        token = req[type] && req[type][field];
        // Authorization: <type> <credentials>
        if (token && type === 'headers' && field === 'authorization') {
          token = token.split(/\s+/)[1];
        }
        if (token) break;
      }
      if (token) {
        payload = jwt.verify(token, secret);
      }
    } catch (err) {
      payload = null;
      token = null;
    }

    Object.defineProperty(req, 'session', {
      enumerable: true,
      configurable: true,
      get () {
        console.log('token-get');
        return token;
      },
      set (val) {
        console.log('token-set', val);
        try {
          if (!val) {
            payload = null;
            token = null;
          } else {
            token = val;
            payload = jwt.verify(token, secret);
          }
        } catch (err) {
          payload = null;
          token = null;
        }
      }
    });

    Object.defineProperty(req, 'user', {
      enumerable: true,
      configurable: true,
      get () {
        console.log('session-get');
        return payload;
      },
      set (obj) {
        console.log('session-set', obj);
        try {
          if (!obj) {
            payload = null;
            token = null;
          } else {
            const exp = ~~(Date.now() / 1000) + (expires * 60);
            payload = { exp, ...obj };
            token = jwt.sign(payload, secret);
          }
        } catch (err) {
          payload = null;
          token = null;
        }
      }
    });
    next();
  });
  if (ctx.passport) {
    app.use(passport.initialize());
    app.use(function (req, res, next) {
      req.logIn = (strategy) => {
        return new Promise((resolve, reject) => {
          passport.authenticate(strategy, function (err, user) {
            if (err) return reject(err);
            req.user = user || null;
            resolve(user);
          })(req, res, next);
        });
      };
      req.logOut = () => {
        return new Promise((resolve) => {
          const user = req.user;
          res.user = null;
          resolve(user);
        });
      };
      if (typeof ctx.passport?.isAuthenticated === 'function') {
        req.isAuthenticated = (...args) => ctx.passport.isAuthenticated(req, ...args);
      }
      next();
    });
  }
  // ctx.passport && app.use(passport.session({ key: 'payload' }));
  // ctx.passport && app.use(passport.authenticate('session'));
  ctx.timeout && app.use(function (req, res, next) {
    req.setTimeout(ctx.timeout * 1000);
    next();
  });
  ctx.routes && app.use(await rest(ctx.routes));
  // Static
  // if (nconf.get('static:dir')) {
  //   app.use(
  //     express.static(
  //       nconf.get('static:dir'),
  //       nconf.get('static:expires')
  //         ? { maxAge: nconf.get('static:expires') * 60 * 1000 }
  //         : {}
  //     )
  //   );
  // }
  // Default router
  app.use(function (req, res, next) {
    res.status(404);
    next();
  });
  // Error handler
  app.use(function (err, req, res, next) {
    // fallback to default node handler
    if (res.headersSent) {
      return next(err);
    }
    // if status not changed
    if (res.statusCode === 200) {
      res.status(500);
    }
    // convert text to error object
    if (typeof err !== 'object') {
      err = new Error(err);
    }
    res.json({ name: err.name, message: err.message, code: res.statusCode });
  });
  // Run server
  server.once('close', function () {
    logger.log({
      level: 'info',
      label: 'server',
      message: 'Listener has been stopped'
    });
  });
  server.on('error', function (err) {
    logger.log({
      level: 'error',
      label: 'server',
      message: err.message || err
    });
  });
  server.listen(ctx.port, ctx.host, function () {
    const address = this.address();
    logger.log({
      level: 'info',
      label: 'server',
      message: `Listening on ${address.address}:${address.port}`
    });
  });
  return () => new Promise(resolve => server.close(resolve));
}
