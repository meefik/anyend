import logger from './utils/logger.mjs';
import events from './utils/events.mjs';
import config from './utils/config.mjs';
import lifcyclePlugin from './lifecycle/index.mjs';
import mongoPlugin from './mongo/index.mjs';
import minioPlugin from './minio/index.mjs';
import apiPlugin from './api/index.mjs';

async function loadPlugins () {
  const plugins = {
    lifecycle: lifcyclePlugin,
    mongo: mongoPlugin,
    minio: minioPlugin,
    api: apiPlugin
  };
  const stack = [];
  for (const name in plugins) {
    const plugin = plugins[name];
    const options = config.get(name, {});
    await plugin.init(options);
    Object.defineProperty(global, name, {
      enumerable: true,
      configurable: false,
      get: plugin.state
    });
    if (plugin.destroy) stack.push(plugin.destroy);
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
    // return {
    //   config,
    //   events,
    //   logger
    // };
  } catch (err) {
    logger.log({
      level: 'error',
      message: err.message
    });
    process.emit('SIGTERM');
  }
}
