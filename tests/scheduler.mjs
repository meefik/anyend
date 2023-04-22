import { describe, it } from 'node:test';
import assert from 'node:assert';
import cluster from 'node:cluster';
import scheduler from '../lib/scheduler/index.mjs';
import { calcNextDate } from '../lib/scheduler/index.mjs';
import mongo from '../lib/mongo/index.mjs';
import db from 'mongoose';
import { DateTime } from 'luxon';
import { setTimeout } from 'node:timers/promises';
import exp from 'node:constants';

// можно проверить:
//  - корректно ли выполняются задачи
//  - соблюдается ли timezone
//  - логгируются ли ошибки
//  - 
if (cluster.isPrimary) {
  cluster.fork();
} else {

  let mongoOptions = {
    uri: 'mongodb://localhost:27017',
    models: {},
  };

  await mongo.init(mongoOptions);

  describe('sheduler tests', { only: true }, async () => {

    describe('calcNextDay() tests', { only: false }, () => {

      describe('{repeat} is string', () => {

        it('{repeat} is empty string', () => {
          let repeat = '';
          // next minute from now
          let expectedDate = DateTime.now().minus({ seconds: DateTime.now().second }).plus({ minutes: 1 }).setLocale('ru-RU').toFormat('dd.LL.yyyy, HH:mm:ss');
          let actualDate = calcNextDate(repeat).toLocaleString('ru-RU');
          assert.equal(actualDate, expectedDate);
        });

        it('{repeat} is correct cron expression', () => {
          let repeat = '0 0 12 * * *';
          // 12 o'clock of the next day
          let expectedDate = DateTime.now().set({ day: DateTime.now().day + 1, hour: 12, minute: 0, second: 0 }).setLocale('ru-RU').toFormat('dd.LL.yyyy, HH:mm:ss');
          let actualDate = calcNextDate(repeat).toLocaleString('ru-RU');
          assert.equal(actualDate, expectedDate);
        });

        // doesn't work correctly, function should return null
        it('{repeat} is incorrect cron expression', () => {
          let repeat = 'incorrect';
          let actualDate = calcNextDate(repeat);
          assert.equal(actualDate, null);
        });

        // doesn't work correctly, toDate() convert date to local timezone
        it('{tz} is defined correct', () => {
          let repeat = '';
          let tz = 'Europe/Moscow';
          let expectedDate = DateTime.now().setZone(tz).minus({ seconds: DateTime.now().second }).plus({ minutes: 1 }).setLocale('ru-RU').toFormat('dd.LL.yyyy, HH:mm:ss');
          let actualDate = calcNextDate(repeat, tz).toLocaleString('ru-RU');
          assert.equal(actualDate, expectedDate);
        });
      });

      describe('{repeat} is number', () => {
        it('{repeat} greater than 0', () => {
          let repeat = 2000;
          let expectedDate = DateTime.now().plus({ seconds: repeat }).setLocale('ru-RU').toFormat('dd.LL.yyyy, HH:mm:ss');
          let actualDate = calcNextDate(repeat).toLocaleString('ru-RU');
          assert.equal(actualDate, expectedDate);
        });

        it('{repeat} lower than 0', () => {
          let repeat = -1000;
          let actualDate = calcNextDate(repeat);
          assert.equal(actualDate, null);
        });

        // doesn't work correctly, toDate() convert date to local timezone
        it('{tz} is defined', () => {
          let repeat = 24 * 60 * 60;
          let tz = 'Europe/Moscow';
          let expectedDate = DateTime.now().setZone(tz).plus({ seconds: repeat }).setLocale('ru-RU').toFormat('dd.LL.yyyy, HH:mm:ss');
          let actualDate = calcNextDate(repeat, tz).toLocaleString('ru-RU');
          assert.equal(actualDate, expectedDate);
        });
      });
    });

    let schedulerOptions = {
      interval: 10,
      tz: 'Asia/Korea',
      tasks: [
        {
          name: 'task1',
          repeat: 10,
          async handler() {
            await db.model('User').deleteOne({ username: 'Alexey' });
            const User = db.model('User');
            let userToAddd = new User({ username: 'Alexey', role: 'guest' });
            await userToAddd.save();
          }
        }
      ]
    };

    const { interval, tz, tasks } = schedulerOptions;

    describe('initialization tests', { only: false }, () => {

      it('initial insert of tasks', async () => {

        await scheduler.init(schedulerOptions);

        let res = await db.model('Task').find({ name: { $in: tasks.map(item => item.name) } });

        if (res) {
          for (let i = 0; i < tasks.length; i++) {
            assert.equal(res[i].name, tasks[i].name);
          }
        }

        await scheduler.destroy();
      });

      it('initial delete of depreceted tasks', async () => {

        await scheduler.init(schedulerOptions);

        let res = await db.model('Task').find({ name: { $nin: tasks.map(item => item.name) } });

        assert.equal(res.length, 0);

        await scheduler.destroy();
      });
    });


    describe('tasks execution tests', () => {

      it('updating nextRunAt in db', async () => {

        await scheduler.init(schedulerOptions);

        await setTimeout(tasks[0].repeat * 1000);

        let res = await db.model('Task').findOne({ name: tasks[0].name });

        if (res) {
          let expectedDate = String(calcNextDate(tasks[0].repeat));
          let actualDate = String(res.nextRunAt);
          assert.equal(actualDate, expectedDate);
        }

        await scheduler.destroy();
      });

      it('calling the handler of the task', async () => {

        await scheduler.init(schedulerOptions);

        await setTimeout(tasks[0].repeat * 1000);

        let res = await db.model('User').findOne({ username: 'Alexey', role: 'guest' });

        assert.ok(res);

        await scheduler.destroy();
      });

      it('preservation of serving information in db', async () => {

        await db.model('Task').deleteOne({ name: tasks[0].name });

        scheduler.init(schedulerOptions);

        await setTimeout((tasks[0].repeat + 5) * 1000);

        const expecServeInfo = {
          failCount: 1,
          nextRunAt: new Date(Date.now() + tasks[0].repeat * 1000).toString(),
          failReason: null,
          failedAt: null
        }

        const actServeInfo = await db.model('Task').findOne({ name: tasks[0].name });

        for (const key of Object.keys(expecServeInfo)) {
          assert.equal(actServeInfo[key], expecServeInfo[key]);
        }

        await scheduler.destroy();
      });
    });
  });
}
