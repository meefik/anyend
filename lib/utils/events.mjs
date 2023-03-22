const events = {};

export default {
  on (event, fn) {
    if (!event || !fn) return;
    event = [].concat(event);
    event.forEach((item) => {
      if (!events[item]) events[item] = [];
      events[item].push(fn);
    });
  },
  off (event, fn) {
    if (!event || !fn) return;
    event = [].concat(event);
    event.forEach((e) => {
      const arr = events[e];
      if (arr) {
        const index = arr.indexOf(fn);
        if (index > -1) arr.splice(index, 1);
        if (!arr.length) delete events[e];
      }
    });
  },
  async emit (event, ...args) {
    const arr = events[event];
    if (arr) {
      for (const fn of arr) {
        await fn?.call({ event }, ...args);
      }
    }
  }
};
