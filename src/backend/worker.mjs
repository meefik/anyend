import events from './utils/events.mjs';
import logger from './utils/logger.mjs';
import context from './context.mjs';
import lifecycle from './lifecycle/index.mjs';
import db from './db/index.mjs';
import api from './api/index.mjs';

async function loadPlugins (ctx) {
  const plugins = {
    lifecycle,
    db,
    api
  };
  for (const k in plugins) {
    const close = await plugins[k](ctx[k]);
    events.on('shutdown', close);
  }
}

export default async function () {
  try {
    const ctx = await context();
    await loadPlugins(ctx);
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
    process.emit('SIGTERM');
  }
}
