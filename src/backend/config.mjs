import os from 'node:os';
import nconf from 'nconf';

const config = {
  host: '0.0.0.0',
  port: 3000,
  threads: os.cpus().length, // cores
  timeout: 10, // seconds
  response: 60, // seconds
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
  static: {
    // dir: '/path/to/dir',
    expires: 60 // minutes
  },
  session: {
    key: 'secret',
    expires: 6 * 60 // minutes
  },
  cache: {
    expires: 24 * 60 // minutes
  },
  http: {
    // port: 80,
    // webroot: '/etc/acme/webroot'
  }
};

// Read config
nconf.use('memory');
nconf.env({
  separator: '_',
  lowerCase: true,
  parseValues: true
});
nconf.defaults(config);

export default nconf;
