import fs from 'node:fs';
import process from 'node:process';
import http from 'node:http';
import https from 'node:https';
import express from 'express';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import logger from '../utils/logger.js';
import rest from './rest.js';
import WebSocketServer from './wss.js';

const _context = {};

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
  // Create web app
  const app = express();
  app.enable('trust proxy');
  app.disable('x-powered-by');
  // Logs
  app.use(morgan(function (tokens, req, res) {
    const ip = req.ip;
    const method = tokens.method(req, res);
    const url = tokens.url(req, res);
    const statusCode = tokens.status(req, res) || '-';
    const statusMessage = res.statusMessage || '';
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
  }));
  // Default middlewares
  app.use(express.urlencoded({ extended: true }));
  app.use(express.text());
  app.use(express.json());
  app.use(express.raw());
  app.use(cookieParser());
  // Routing
  if (options.routes) {
    app.use(await rest(options.routes));
  }
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
  // Web Socker Server
  let wss;
  if (options.wss) {
    wss = await WebSocketServer(options.wss);
    server.on('upgrade', function upgrade (request, socket, head) {
      const user = request.user;
      console.log('upgrade', user);
      // if (!user) {
      //   socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      //   socket.destroy();
      //   return;
      // }
      wss.handleUpgrade(request, socket, head, function done (ws) {
        wss.emit('connection', ws, request, user);
      });
    });
  }
  server.listen(options.port, options.host, function () {
    const address = this.address();
    logger.log({
      level: 'info',
      label: 'api',
      message: `Listening on ${address.address}:${address.port}`
    });
  });
  _context.app = app;
  _context.server = server;
  _context.wss = wss;
}

export function destroy () {
  return new Promise(resolve => _context?.server
    ? _context.server.close(resolve)
    : resolve());
}

export function context () {
  return _context;
}

export default {
  init,
  destroy,
  context
};
