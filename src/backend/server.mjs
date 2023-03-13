import cluster from 'node:cluster';
import './config.mjs';
import primary from './primary.mjs';
import worker from './worker.mjs';
import logger from './lib/logger.mjs';

// Error handling
process.on('uncaughtException', function (err) {
  logger.log({
    level: 'error',
    label: 'server',
    message: err.message
  });
});

try {
  if (cluster.isPrimary) {
    primary();
  } else if (cluster.isWorker) {
    worker();
  }
} catch (err) {
  logger.log({
    level: 'error',
    label: 'server',
    message: err.message
  });
}
