import events from '../utils/events.mjs';

export async function init (options) {
  events.on('startup', options.startup);
  events.on('shutdown', options.shutdown);
}

export default {
  init
};
