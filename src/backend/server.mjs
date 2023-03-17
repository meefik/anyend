import cluster from 'node:cluster';
import process from 'node:process';
import os from 'node:os';
import runWorker from './worker.mjs';
import events from './utils/events.mjs';
import logger from './utils/logger.mjs';

const {
  TIMEOUT = 10,
  THREADS = os.cpus().length
} = process.env;

// Shutdown worker
async function shutdown () {
  if (shutdown.executed) return;
  shutdown.executed = true;
  try {
    const timeout = parseInt(TIMEOUT);
    if (timeout > 0) {
      setTimeout(() => process.exit(1), timeout * 1000);
    }
    await events.emit('shutdown');
    logger.log({
      level: 'info',
      message: 'Worker has been stopped'
    });
    if (cluster.isWorker) process.exit(0);
  } catch (err) {
    logger.log({
      level: 'error',
      message: err.message
    });
    if (cluster.isWorker) process.exit(1);
  }
}

// Error handling
process.on('uncaughtException', function (err) {
  logger.log({
    level: 'error',
    label: 'server',
    message: err.message
  });
});
// Process termination
process.once('SIGTERM', shutdown);
// Ctrl+C
process.once('SIGINT', shutdown);
// Graceful shutdown for nodemon
process.once('SIGUSR2', shutdown);

if (cluster.isPrimary) {
  // Create workers
  for (let i = 0; i < THREADS; i++) {
    cluster.fork();
  }
  // Restart workers
  cluster.on('exit', function (worker, code, signal) {
    if (shutdown.executed) return;
    cluster.fork();
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
