import fs from 'node:fs';
import process from 'node:process';
import http from 'node:http';
import https from 'node:https';
import express from 'express';
import config from 'nconf';
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

export default async function () {
  // Create web server
  const app = express();
  const protocol = config.get('ssl') ? 'https' : 'http';
  const server = (protocol === 'https')
    ? https.Server(
      {
        key: parseConf(config.get('ssl:key')),
        cert: parseConf(config.get('ssl:cert')),
        ca: parseConf(config.get('ssl:ca'))
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
  if (config.get('timeout')) {
    app.use(await timeout());
  }
  if (config.get('compression')) {
    app.use(await compression());
  }
  if (config.get('cors')) {
    app.use(await cors());
  }
  if (config.get('session')) {
    app.use(await session());
  }
  app.use(await rest());
  if (config.get('statics')) {
    app.use(await statics());
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
  server.listen(config.get('port'), config.get('host'), function () {
    const address = this.address();
    logger.log({
      level: 'info',
      label: 'api',
      message: `Listening on ${address.address}:${address.port}`
    });
  });
  return () => new Promise(resolve => server.close(resolve));
}
