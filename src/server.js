import cluster from 'node:cluster';
import process from 'node:process';
import runWorker from './worker.js';
import config from './utils/config.js';
import events from './utils/events.js';
import logger from './utils/logger.js';

// Shutdown worker
async function shutdown () {
  if (shutdown.executed) return;
  shutdown.executed = true;
  const timeout = parseInt(config.get('cluster.timeout'));
  if (timeout > 0) {
    setTimeout(() => process.exit(1), timeout * 1000);
  }
  if (cluster.isWorker) {
    try {
      await events.emit('shutdown');
      logger.log({
        level: 'info',
        message: 'Worker has been stopped'
      });
      process.exit(0);
    } catch (err) {
      logger.log({
        level: 'error',
        message: err.message
      });
      process.exit(1);
    }
  }
}

export default function (options) {
  // Error handling
  process.on('uncaughtException', function (err) {
    logger.log({
      level: 'error',
      label: 'server',
      message: err.message
    });
  });
  // Process termination
  process.once('SIGTERM', () => shutdown());
  // Ctrl+C
  process.once('SIGINT', () => shutdown());
  // Graceful shutdown for nodemon
  process.once('SIGUSR2', () => shutdown());

  config.set(options);

  if (cluster.isPrimary) {
    // Create workers
    for (let i = 0; i < config.get('cluster.threads'); i++) {
      cluster.fork();
    }
    // Restart workers
    cluster.on('exit', function (worker, code, signal) {
      if (shutdown.executed) {
        const numberOfWorkers = Object.keys(cluster.workers).length;
        if (!numberOfWorkers) process.exit(0);
      } else {
        cluster.fork();
      }
    });
    // Message exchange between workers
    cluster.on('message', function (worker, data) {
      for (const id in cluster.workers) {
        cluster.workers[id].send(data);
      }
    });
  } else {
    runWorker();
  }
};
