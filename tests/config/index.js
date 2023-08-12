import os from 'node:os';
import process from 'node:process';
import models from './models/index.js';
import routes from './routes/index.js';

const {
    HOST = 'localhost',
    PORT = 3000,
    THREADS = os.cpus().length
} = process.env;

export default {
    cluster: {
        threads: THREADS, // cores
        timeout: 10 // seconds
    },
    api: {
        host: HOST,
        port: PORT,
        routes,
        wss: {}
    },
    mongo: {
        uri: 'mongodb://admin:secret@127.0.0.1:27017/neux?authSource=admin&directConnection=true&replicaSet=rs0',
        models
    },
    minio: {
        uri: 'http://minioadmin:minioadmin@127.0.0.1:9000'
    }
};