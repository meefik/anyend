import plugins from './plugins.mjs';
import logger from './utils/logger.mjs';
import events from './utils/events.mjs';
import config from './utils/config.mjs';

async function loadPlugins () {
  const stack = [];
  global.context = { logger, events, config };
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
  const eventHandlers = config.get('cluster.events');
  for (const event in eventHandlers) {
    const handler = eventHandlers[event];
    if (handler) events.on(event, handler);
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
