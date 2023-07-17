import { it } from 'node:test';
import assert from 'node:assert';
import cluster from 'node:cluster';
import models from '../src/mongo/models/index.js';
import mongo from '../src/mongo/index.js';
import config from '../src/config/index.js';
import config_utils from '../src/utils/config.js';
import { setTimeout } from 'node:timers/promises';

if (cluster.isPrimary) {
    for (let i = 0; i < 2; i++) {
        cluster.fork();
    }

    cluster.on('message', async (worker, msg) => {
        cluster.workers[2].send(msg);
    });
} else {
    await mongo.init({
        uri: 'mongodb://admin:secret@127.0.0.1:27017/anyend?authSource=admin&directConnection=true&replicaSet=rs0',
        models
    });

    config.init();

    let context = config.context();

    const minio_options = {
        uri: 'http://minioadmin:minioadmin@127.0.0.1:9000'
    };
    const mongo_options = {
        uri: 'mongodb://admin:secret@127.0.0.1:27017/anyend?authSource=admin&directConnection=true&replicaSet=rs0'
    };

    if (cluster.worker.id == 1) {
        await context.set('minio_options', minio_options);
        process.send('set_minio_options');

        config_utils.set('mongo_options', mongo_options);
        process.send('set_mongo_options');

        it('getting a local config in the same process', async () => {
            const conf_mongo_options = config_utils.get('mongo_options', {});
            assert.strictEqual(conf_mongo_options, mongo_options);
        });

        it('getting an unsetted config', async () => {
            const def_some_options = {};
            const conf_some_options = await context.get('some_options', def_some_options);
            assert.strictEqual(conf_some_options, def_some_options);
        });
    }

    if (cluster.worker.id == 2) {
        process.on('message', (msg) => {
            if (msg === 'set_minio_options') {
                it('getting the global config', async () => {
                    const conf_minio_options = await context.get('minio_options', {});
                    assert.strictEqual(conf_minio_options, minio_options);
                });
            } else if (msg === 'set_mongo_options') {
                it('getting a local config in another process', async () => {
                    const conf_mongo_options = await context.get('mongo_options', {});
                    assert.notStrictEqual(conf_mongo_options, mongo_options);
                });
            }
        })
    }

    await setTimeout(2500);

    await mongo.destroy();

    cluster.worker.kill('SIGUSR2');
}