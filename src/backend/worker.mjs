import './config.mjs';
import events from './utils/events.mjs';
import logger from './utils/logger.mjs';
import mongo from './mongo/index.mjs';
import api from './api/index.mjs';

const plugins = {
  mongo,
  api
};

async function loadPlugins () {
  const shutdown = [];
  for (const k in plugins) {
    const fn = await plugins[k]();
    shutdown.push(fn);
  }
  shutdown.reverse();
  for (const fn of shutdown) {
    events.on('shutdown', fn);
  }
}

export default async function () {
  try {
    await loadPlugins();
    await events.emit('startup');
    logger.log({
      level: 'info',
      message: 'Worker has been started'
    });
  } catch (err) {
    logger.log({
      level: 'error',
      message: err.message
    });
    process.emit('exit', 1);
  }
}
