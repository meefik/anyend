import cluster from 'node:cluster';
import './env.mjs';
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

if (cluster.isPrimary) {
  primary();
} else if (cluster.isWorker) {
  worker();
}
