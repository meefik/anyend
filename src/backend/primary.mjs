import cluster from 'node:cluster';
import nconf from 'nconf';

// Shutdown process
async function shutdown () {
  if (shutdown.executed) return;
  shutdown.executed = true;
  const timeout = parseInt(nconf.get('timeout'));
  if (timeout > 0) {
    setTimeout(() => process.exit(1), timeout * 1000);
  }
  function killAllWorkers () {
    let allWorkersAreDead = true;
    for (const id in cluster.workers) {
      const worker = cluster.workers[id];
      if (!worker.isDead()) {
        allWorkersAreDead = false;
        worker.process.kill('SIGTERM');
      }
    }
    if (!allWorkersAreDead) {
      setTimeout(killAllWorkers, 1000);
    } else {
      process.exit(0);
    }
  }
  killAllWorkers();
};

export default function () {
  // Create workers
  for (let i = 0; i < nconf.get('threads'); i++) {
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
  // Process termination
  process.once('SIGTERM', shutdown);
  // Ctrl+C
  process.once('SIGINT', shutdown);
  // Graceful shutdown for nodemon
  process.once('SIGUSR2', shutdown);
}
