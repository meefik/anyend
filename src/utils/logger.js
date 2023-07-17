import cluster from 'node:cluster';
import { createLogger, format, transports } from 'winston';

const DEBUG_MODE = process.env.NODE_ENV === 'development';
const PRINT_FN = function ({ label, level, message, timestamp }) {
  if (!label) label = 'worker';
  return `${timestamp} ${level} [${label}-${
    cluster.isWorker ? cluster.worker.id : 0
  }]: ${message}`;
};

const { combine, timestamp, colorize, printf } = format;
const logger = createLogger({
  level: DEBUG_MODE ? 'debug' : 'info',
  format: DEBUG_MODE
    ? combine(timestamp(), colorize(), printf(PRINT_FN))
    : combine(timestamp(), printf(PRINT_FN)),
  transports: [
    new transports.Console({
      stderrLevels: ['error'],
      handleExceptions: true
    })
  ],
  exitOnError: false
});

export default logger;
