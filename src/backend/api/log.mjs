import morgan from 'morgan';
import logger from '../utils/logger.mjs';

export default async function () {
  return morgan(function (tokens, req, res) {
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
  });
}
