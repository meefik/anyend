import db from 'mongoose';

let timer;

export async function init (options) {
  const { interval = 60, tasks } = options;
  for (const task of tasks) {
    const { name, handler } = task;
    if (!name || !handler) continue;
    const nextRunAt = new Date();
    await db.model('Task').updateOne({ name }, {
      $set: {
        name,
        nextRunAt
      }
    }, { upsert: true }).exec();
  }

  timer = setInterval(async function () {
    for (const task of tasks) {
      const { name, repeat, handler } = task;
      if (!name || !handler) continue;
      const now = new Date();
      const nextRunAt = repeat > 0
        ? new Date(now.getTime() + repeat * 1000)
        : null;
      const { modifiedCount } = await db.model('Task').updateOne({
        name,
        nextRunAt: { $lte: now }
      }, {
        $set: {
          nextRunAt
        }
      }).exec();
      if (modifiedCount) {
        process.nextTick(() => handler(task));
      }
    }
  }, interval * 1000);
}

export async function destroy () {
  clearInterval(timer);
};

export default {
  init,
  destroy
};
