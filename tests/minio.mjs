import { it } from 'node:test';
import assert from 'node:assert';
import minio from '../lib/minio/index.mjs'
import cluster from 'node:cluster';

const testedConfig = [
    {
        uri: 'http://127.0.0.1',
        config: {
            protocol: 'http:',
            hosts: [
                {
                    host: '127.0.0.1',
                    port: 80,
                }
            ]
        }
    },
    {
        uri: 'https://127.12.0.1:9000',
        config: {
            protocol: 'https:',
            hosts: [
                {
                    host: '127.12.0.1',
                    port: 9000,
                }
            ]
        }
    },
    {
        uri: 'http://minioadmin:minioadmin@127.0.0.1:9000',
        config: {
            protocol: 'http:',
            hosts: [
                {
                    host: '127.0.0.1',
                    port: 9000,
                }
            ],
            accessKey: 'minioadmin',
            secretKey: 'minioadmin'
        }
    },
    {
        uri: 'http://127.0.0.1:9000,112.112.31.32:9020',
        config: {
            protocol: 'http:',
            hosts: [
                {
                    host: '127.0.0.1',
                    port: 9000,
                },
                {
                    host: '112.112.31.32',
                    port: 9020,
                },
            ]
        }
    }
];

const ITER_LIMIT = 1000;

if (cluster.isPrimary) {

    for (let _ of testedConfig) {
        cluster.fork();
    }

} else {

    const workerId = cluster.worker.id;

    const uri = testedConfig[workerId - 1].uri;

    const config = testedConfig[workerId - 1].config;

    it(`Testing of ${workerId} minio config`, async () => {

        minio.init({ uri });

        let minioClients = [minio.context()];

        for (let i = 0; i < ITER_LIMIT && minioClients.length < config.hosts.length; i++) {
            let client = minio.context();
            if (!minioClients.includes(client)) {
                minioClients.push(client);
            }
        }

        assert.equal(minioClients.length, config.hosts.length);

        for (let key of Object.keys(config)) {
            if (key == 'hosts') {
                for (let host of config.hosts) {
                    assert.ok(
                        minioClients.find((client) => client.host == host.host && client.port == host.port)
                    );
                }
            } else {
                assert.equal(minioClients[0][key], config[key]);
            }
        }

    });

    cluster.worker.kill('SIGUSR2');

}

