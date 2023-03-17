import events from '../utils/events.mjs';

export default async function (ctx) {
  for (const event in ctx) {
    const fn = ctx[event];
    events.on(event, fn);
  }
}
