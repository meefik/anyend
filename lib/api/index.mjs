import fs from 'node:fs';
import process from 'node:process';
import http from 'node:http';
import https from 'node:https';
import express from 'express';
import cookieParser from 'cookie-parser';
import logger from '../utils/logger.mjs';
import log from './log.mjs';
import error from './error.mjs';
import timeout from './timeout.mjs';
import cors from './cors.mjs';
import compression from './compression.mjs';
import rest from './rest.mjs';
import statics from './statics.mjs';
import session from './session.mjs';

let app;

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
      label: 'api',
      message: err.message || err
    });
  }
};

export async function init (options) {
  // Create web server
  app = express();
  const protocol = options.ssl ? 'https' : 'http';
  const server = (protocol === 'https')
    ? https.Server(
      {
        key: parseConf(options.ssl.key),
        cert: parseConf(options.ssl.cert),
        ca: parseConf(options.ssl.ca)
      },
      app
    )
    : http.Server(app);
  // Setup app server
  app.enable('trust proxy');
  app.disable('x-powered-by');
  app.use(await log());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(cookieParser());
  if (options.timeout) {
    app.use(await timeout(options.timeout));
  }
  if (options.compression) {
    app.use(await compression(options.compression));
  }
  if (options.cors) {
    app.use(await cors(options.cors));
  }
  if (options.session) {
    app.use(await session(options.session));
  }
  app.use(await rest(options.routes));
  if (options.statics) {
    app.use(await statics(options.statics));
  }
  // Default router
  app.use(function (req, res, next) {
    res.status(404);
    next();
  });
  // Error handler
  app.use(await error());
  // Run server
  server.once('close', function () {
    logger.log({
      level: 'info',
      label: 'api',
      message: 'Listener has been stopped'
    });
  });
  server.on('error', function (err) {
    logger.log({
      level: 'error',
      label: 'api',
      message: err.message || err
    });
  });
  server.listen(options.port, options.host, function () {
    const address = this.address();
    logger.log({
      level: 'info',
      label: 'api',
      message: `Listening on ${address.address}:${address.port}`
    });
  });
  app.server = server;
}

export function destroy () {
  return new Promise(resolve => app?.server?.close(resolve));
}

export function state () {
  return app;
}

export default {
  init,
  destroy,
  state
};
