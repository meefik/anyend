import { describe, it } from 'node:test';
import assert from 'node:assert';
import cluster from 'node:cluster';
import scheduler from '../src/scheduler/index.js';
import mongo from '../src/mongo/index.js';


if (cluster.isPrimary) {

  cluster.fork();

} else {

  const mongoOptions = {
    uri: 'mongodb://admin:secret@127.0.0.1:27017/neux?authSource=admin&directConnection=true&replicaSet=rs0',
    models: {},
  };

  await mongo.init(mongoOptions);

  const TESTING_DELAY = 25;

  const schedulerOptions1 = {
    interval: 5,
    tasks: [
      {
        name: 'test1',
        repeat: '0/10 * * * * *',
        async handler(task) {
          task.res.execCount++;
        },
        res: {
          execCount: 0,
        },
      },
      {
        name: 'test2',
        repeat: 15,
        async handler(task) {
          task.res.execCount++;
        },
        res: {
          execCount: 0,
        },
      },
      {
        name: 'test3',
        repeat: getTask3CronExp(TESTING_DELAY),
        async handler(task) {
          task.res.execCount++;
        },
        res: {
          execCount: 0,
        },
      }
    ]
  };

  await new Promise(async (res, rej) => {

    await scheduler.init(schedulerOptions1);

    setTimeout(async () => {

      let { tasks } = schedulerOptions1;

      describe('repitition tests', () => {

        it('{repeat} is cron-expression', () => {
          // test1 should be exexucted every 10 secs -> 2 times
          if (tasks[0].res.execCount) {
            assert.equal(tasks[0].res.execCount, 2);
          } else {
            assert.fail('Task wasn\'t executed.');
          }
        });

        it('{repeat} is number', () => {
          // test2 should be exexucted every 15 secs -> 1 time
          if (tasks[1].res.execCount) {
            assert.equal(tasks[1].res.execCount, 1);
          } else {
            assert.fail('Task wasn\'t executed.');
          }
        });
      });

      describe('timezone applying tests', () => {

        // should be executed 1 time
        it('{timezone} is local', () => {
          if (tasks[2].res.execCount) {
            assert.equal(tasks[2].res.execCount, 1);
          } else {
            assert.fail('Task wasn\'t executed.');
          }
        });

      });

      await scheduler.destroy();

      res();

    }, TESTING_DELAY * 1000);

  });

  const schedulerOptions2 = {
    interval: 15,
    timezone: 'Europe/Moscow',
    tasks: [
      {
        name: 'test1',
        repeat: 5,
        async handler(task) {
          task.res.execCount++;
        },
        res: {
          execCount: 0,
        },
      },
      {
        name: 'test2',
        repeat: 20,
        async handler(task) {
          task.res.execCount++;
        },
        res: {
          execCount: 0,
        },
      },
      {
        name: 'test3',
        repeat: getTask3CronExp(TESTING_DELAY),
        async handler(task) {
          task.res.execCount++;
        },
        res: {
          execCount: 0,
        },
      }
    ]
  }

  await new Promise(async (res, rej) => {

    await scheduler.init(schedulerOptions2);

    setTimeout(async () => {

      let { tasks } = schedulerOptions2;

      describe('interval tests', () => {

        // should be executed 1 time
        it('{interval} greater than {repeat}', () => {
          if (tasks[0].res.execCount) {
            assert.equal(tasks[0].res.execCount, 1);
          } else {
            assert.fail('Task wasn\'t executed.');
          }
        });

        // should not be executed
        it('{interval} lower than {repeat}', () => {
          if (!tasks[1].res.execCount) {
            assert.ok(true);
          } else {
            assert.fail('Task was executed.');
          }
        });
      });

      describe('timezone applying tests', () => {

        // should not be executed
        it('{timezone} is not local', () => {
          if (!tasks[2].res.execCount) {
            assert.ok(true);
          } else {
            assert.fail('Task was executed.');
          }
        });

      });

      await scheduler.destroy();

      res();

    }, TESTING_DELAY * 1000);

  });

  await mongo.destroy();

  cluster.worker.kill('SIGUSR2');
}


// generate cron-expression with exactly setted time that will be executed in {0.8*delay} secs
function getTask3CronExp(delay) {

  let now = new Date();
  let year = '*'
  let month = '*';
  let date = '*';
  let hours = now.getHours();
  let mins = now.getMinutes();
  let secs = now.getSeconds() + 0.8 * delay;

  if (secs >= 60) {
    secs = secs % 60;
    mins++;
  }

  return secs + ' ' + mins + ' ' + hours + ' ' + date + ' ' + month + ' ' + year;
}