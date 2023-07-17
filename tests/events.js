import { it } from 'node:test';
import assert from 'node:assert';
import cluster from 'node:cluster';
import models from '../src/mongo/models/index.js';
import mongo from '../src/mongo/index.js';
import events from '../src/events/index.js';
import { setTimeout } from 'node:timers/promises';

// functions that will be executed depending on incoming event
const eventFunctions = {
    async event1(data) {
        process.send('event1');
    },
    async event2(data) {
        process.send('event2');
    },
    async event3(data) {
        process.send('event3');
    }
}

// array of initial event configuration
// index of each element corresponds to {workerId-1} worker
let optionsList = [
    {
        event1: eventFunctions.event1,
        event2: eventFunctions.event2
    },
    {
        event2: eventFunctions.event2
    },
    {
        event1: eventFunctions.event1,
        event3: eventFunctions.event3
    }
];

if (cluster.isPrimary) {

    // an object that stores information about events 
    // that have been received in child processes
    let eventMonitoring = {};

    // for testing the event plugin, several workers are used,
    // which exchange information about each other through messages for the primary process
    cluster.on('message', (worker, data) => {
        switch (data) {
            case 'getEventMonitoring':
                cluster.workers[worker.id].send(eventMonitoring);
                break;
            case 'clearEventMonitoring':
                eventMonitoring = {};
                break;
            default:
                eventMonitoring[data] !== undefined ?
                    eventMonitoring[data].push(worker.id) :
                    eventMonitoring[data] = [worker.id];
        }
    });

    // after the exit of the worker with tests, 
    // the rest of the workers receive disconnect signal
    cluster.on('exit', async (worker, code, signal) => {
        for (const id in cluster.workers) {
            cluster.workers[id].disconnect();
        }
    });

    for (let _ of optionsList) {
        cluster.fork();
    }

} else {

    await mongo.init({
        uri: 'mongodb://admin:secret@127.0.0.1:27017/anyend?authSource=admin&directConnection=true&replicaSet=rs0',
        models
    });

    let options = optionsList[cluster.worker.id - 1];

    events.init(options);

    const context = events.context();


    // graceful shutdown after executing of the tests
    process.on('disconnect', async () => {
        await mongo.destroy();

        await events.destroy();

        cluster.worker.kill('SIGUSR2');
    })

    if (cluster.worker.id == 1) {

        // EVENT EMIT TEST
        const emitTestListener = function (data) {
            it('event emit test', async () => {
                let workers = data['event1'];
                assert.equal(JSON.stringify(workers), JSON.stringify([1]));
                process.send('clearEventMonitoring');
                process.off('message', emitTestListener);
            });
        };
        async function emitTest(context) {
            process.on('message', emitTestListener);

            context.emit('event1');

            process.send('getEventMonitoring');

            await setTimeout(300);
        }
        await emitTest(context);

        // EVENT BROADCAST TEST
        const broadcastTestListener = function (data) {
            it('event broadcast test', () => {
                let workers = data['event2'];
                assert.equal(JSON.stringify(workers.sort()), JSON.stringify([1, 2]));
                process.send('clearEventMonitoring');
                process.off('message', broadcastTestListener);
            });
        };
        async function broadcastTest(context) {
            process.on('message', broadcastTestListener);

            context.broadcast('event2');

            await setTimeout(300);

            process.send('getEventMonitoring');

            await setTimeout(300);
        }
        await broadcastTest(context);

        // EVENT 'ON' TEST
        const onTestListener = function (data) {
            it('event on test', () => {
                let workers = data['event3'];
                assert.equal(JSON.stringify(workers), JSON.stringify([1]));
                process.send('clearEventMonitoring');
                process.off('message', onTestListener);
            });
        };
        async function onTest(context) {
            process.on('message', onTestListener);

            context.on('event3', eventFunctions.event3);

            context.emit('event3');

            process.send('getEventMonitoring');

            await setTimeout(300);
        }
        await onTest(context);

        // EVENT 'OFF' TEST
        const offTestListener = function (data) {
            it('event off test', () => {
                let workers = data['event3'];
                assert.equal(workers, undefined);
                process.send('clearEventMonitoring');
                process.off('message', offTestListener);
            });
        };
        async function offTest(context) {
            process.on('message', offTestListener);

            context.off('event3', eventFunctions.event3);

            context.emit('event3');

            process.send('getEventMonitoring');

            await setTimeout(300);
        }
        await offTest(context);

        await events.destroy();
        await mongo.destroy();
        cluster.worker.kill('SIGUSR2');
    }
}

