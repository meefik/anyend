import cluster from 'node:cluster';
import cron from 'cron-parser';
import mongo from '../mongo/index.mjs';
import logger from '../utils/logger.mjs';

let timer;

function calcNextDate (repeat, tz) {
  const now = new Date();
  let nextRunAt = null;
  if (typeof repeat === 'string') {
    const cronTime = cron.parseExpression(repeat, { tz });
    nextRunAt = cronTime.next().toDate();
  } else if (typeof repeat === 'number' && repeat > 0) {
    nextRunAt = new Date(now.getTime() + repeat * 1000);
  }
  return nextRunAt;
}

export async function init (options) {
  const { interval = 60, timezone, tasks = [] } = options;
  const db = mongo.context();

  if (cluster.worker.id === 1) {
    for (const task of tasks) {
      const { name, repeat, handler } = task;
      if (!name || !handler) continue;
      const nextRunAt = calcNextDate(repeat, timezone) || new Date();
      await db?.model('Task').updateOne({ name }, {
        $set: { name, nextRunAt }
      }, { upsert: true });
    }
    await db?.model('Task').deleteMany({
      name: { $nin: tasks.map(task => task.name) }
    }).exec();
  }

  timer = setInterval(async function () {
    for (const task of tasks) {
      const { name, repeat, handler } = task;
      if (!name || !handler) continue;
      const nextRunAt = calcNextDate(repeat, timezone);
      const { modifiedCount } = await db?.model('Task').updateOne({
        name,
        nextRunAt: { $lte: new Date() }
      }, {
        $set: {
          nextRunAt
        }
      }).exec();
      if (modifiedCount) {
        process.nextTick(async () => {
          try {
            await handler(task);
          } catch (err) {
            logger.log({
              level: 'error',
              label: 'scheduler',
              message: err.message
            });
          }
        });
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
