import os from 'node:os';
import nconf from 'nconf';

const config = {
  // host: '0.0.0.0',
  port: 3000,
  threads: os.cpus().length, // cores
  timeout: 10, // seconds
  mongo: {
    uri: 'mongodb://admin:secret@127.0.0.1:27017/anyend?authSource=admin'
  },
  minio: {
    uri: 'http://minioadmin:minioadmin@127.0.0.1:9000/anyend'
  },
  ssl: {
    // key: '-----BEGIN RSA PRIVATE KEY-----\n...',
    // cert: '-----BEGIN CERTIFICATE-----\n...',
    // ca: '-----BEGIN CERTIFICATE-----\n...'
  },
  session: {
    secret: 'secret',
    expires: 60, // minutes
    sources: [
      { field: 'token', type: 'cookies' },
      { field: 'authorization', type: 'headers' },
      { field: 'token', type: 'query' }
    ]
  },
  cors: {
    origin: true
  },
  compression: {}
  // statics: {
  //   dir: '/path/to/dir',
  //   expires: 60 // minutes
  // }
};

nconf.use('memory');
nconf.env({
  separator: '_',
  lowerCase: true,
  parseValues: true
});
nconf.defaults(config);

export default nconf;
