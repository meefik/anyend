import fs from 'node:fs';
import process from 'node:process';
import http from 'node:http';
import https from 'node:https';
import express from 'express';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
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
  // app.use(compression());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  // app.use(cors({ origin: true }));
  app.use(cookieParser());
  // app.use(passport.initialize());
  // Response timeout
  // app.use(function (req, res, next) {
  //   const timeout = nconf.get('http:timeout');
  //   if (timeout) req.setTimeout(timeout);
  //   next();
  // });
  // Access to session token
  // app.use(function (req, res, next) {
  //   if (req.user) {
  //     const expires = parseInt(nconf.get('session:expires')) * 60;
  //     Object.assign(req, 'token', {
  //       get () {
  //         const now = ~~(Date.now() / 1000);
  //         const obj = {
  //           id: req.user.id,
  //           exp: now + expires
  //         };
  //         return jwt.sign(obj, nconf.get('session:key'));
  //       }
  //     });
  //   }
  //   next();
  // });
  app.use(function (req, res, next) {
    if (ctx.timeout) req.setTimeout(ctx.timeout * 1000);
    next();
  });
  app.use(await rest());
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
