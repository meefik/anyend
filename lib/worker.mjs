import logger from './utils/logger.mjs';
import events from './utils/events.mjs';
import config from './utils/config.mjs';
import lifecyclePlugin from './lifecycle/index.mjs';
import mongoPlugin from './mongo/index.mjs';
import minioPlugin from './minio/index.mjs';
import schedulerPlugin from './scheduler/index.mjs';
import apiPlugin from './api/index.mjs';

async function loadPlugins () {
  const plugins = {
    lifecycle: lifecyclePlugin,
    mongo: mongoPlugin,
    minio: minioPlugin,
    scheduler: schedulerPlugin,
    api: apiPlugin
  };
  const stack = [];
  global.context = {};
  for (const name of config.get('cluster.plugins', [])) {
    if (!plugins[name]) continue;
    const plugin = plugins[name];
    const options = config.get(name, {});
    if (plugin.init) await plugin.init(options);
    if (plugin.destroy) stack.push(plugin.destroy);
    const context = plugin.context && plugin.context();
    for (const k in context) {
      global.context[k] = context[k];
    }
  }
  stack.reverse();
  for (const fn of stack) {
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
    process.emit('SIGTERM');
  }
}
