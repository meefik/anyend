import { describe, it } from 'node:test';
import assert from 'node:assert';
import cluster from 'node:cluster';
import scheduler from '../lib/scheduler/index.mjs';
import mongo from '../lib/mongo/index.mjs';
import db from 'mongoose';
import { setTimeout } from 'node:timers/promises';


if (cluster.isPrimary) {
  cluster.fork();
} else {

  let mongoOptions = {
    uri: 'mongodb://localhost:27017',
    models: {},
  };

  await mongo.init(mongoOptions);

  describe('sheduler tests', async () => {

    let schedulerOptions = {
      interval: 10,
      tasks: [
        {
          name: 'test1',
          repeat: '0/10 * * * * *',
          async handler(task) {
          },
        },
        {
          name: 'test2',
          repeat: 10,
          async handler(task) {
            task.testObj.wasHandlerExecuted = true;
          },
          testObj: {
            wasHandlerExecuted: false
          }
        },
        {
          name: 'test3',
          repeat: '0 30 12 1 1 ?',
          async handler(task) { },
        }
      ]
    };

    let { interval, tz, tasks } = schedulerOptions;

    describe('initialization tests', () => {

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

      it('updating nextRunAt in DB', async () => {

        await scheduler.init(schedulerOptions);

        let res = await db.model('Task').findOne({ name: tasks[0].name });
        let initNextRunAt = res ? res.nextRunAt : null;

        if (!initNextRunAt) assert.fail('Next date of exec of the task wasn\'t saved in DB');

        // additionally wait for next tick of the scheduler
        let delay = initNextRunAt.getTime() - Date.now() + interval * 1000;

        await setTimeout(delay);

        res = await db.model('Task').findOne({ name: tasks[0].name });
        let updatedNextRunAt = res ? res.nextRunAt : null;

        if (!updatedNextRunAt) assert.fail();

        assert.notEqual(updatedNextRunAt.toUTCString(), initNextRunAt.toUTCString());

        await scheduler.destroy();
      });

      it('calling the handler of the task', async () => {

        await scheduler.init(schedulerOptions);

        // additionally wait for next tick of the scheduler
        await setTimeout((tasks[1].repeat + interval) * 1000);

        assert.ok(tasks[1].testObj.wasHandlerExecuted);

        await scheduler.destroy();
      });

      it('test task with defined timezone', async () => {

        schedulerOptions.tz = 'Europe/Moscow';

        await scheduler.init(schedulerOptions);

        let res = await db.model('Task').findOne({ name: tasks[2].name });
        let actNextRunAt = res ? res.nextRunAt.toUTCString() : null;

        if (!actNextRunAt) assert.fail('Next date of exec of the task wasn\'t saved in DB');

        let expNextRunAt = new Date('2024-01-01T12:30:00.000+06:00').toUTCString();

        assert.equal(actNextRunAt, expNextRunAt);

        delete schedulerOptions.tz;

        await scheduler.destroy();
      });
    });
  });
}