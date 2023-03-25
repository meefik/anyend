import http from 'node:http';
import https from 'node:https';
import Minio from 'minio';
import parseUri from '../utils/uri-parser.mjs';

const minioClients = [];

export async function init (options) {
  const minioOptions = parseUri(options.uri);
  const hosts = minioOptions.hosts || [];
  const timeout = minioOptions.options?.timeout || 60000;
  const useSSL = minioOptions.scheme === 'https';
  const transport = useSSL ? https : http;
  for (let i = 0; i < hosts.length; i++) {
    const client = new Minio.Client({
      useSSL,
      endPoint: hosts[i]?.host,
      port: hosts[i]?.port,
      accessKey: minioOptions.username,
      secretKey: minioOptions.password,
      region: minioOptions.options?.region,
      sessionToken: minioOptions.options?.sessionToken,
      partSize: minioOptions.options?.partSize,
      transport: {
        request (options, cb) {
          const req = transport.request(options, cb);
          req.setTimeout(timeout);
          req.once('timeout', function () {
            req.destroy();
          });
          return req;
        }
      }
    });
    client.defaultBucket = minioOptions.endpoint;
    minioClients.push(client);
  }
}

export function state () {
  return minioClients[~~(Math.random() * minioClients.length)];
}

export default {
  init,
  state
};
