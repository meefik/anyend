import events from '../utils/events.mjs';

export async function init (options) {
  for (const event in options) {
    events.on(event, options[event]);
  }
}

export function context () {
  return events;
}

export default {
  init,
  context
};
