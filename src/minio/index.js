import http from 'node:http';
import https from 'node:https';
import { Client } from 'minio';
import parseUri from '../utils/uri-parser.js';

const minioClients = [];

export async function init (options) {
  const minioOptions = parseUri(options.uri);
  const hosts = minioOptions.hosts || [];
  const timeout = minioOptions.options?.timeout || 60000;
  const useSSL = minioOptions.scheme === 'https';
  const transport = useSSL ? https : http;
  for (let i = 0; i < hosts.length; i++) {
    const client = new Client({
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
    minioClients.push(client);
  }
}

export function context () {
  return minioClients[~~(Math.random() * minioClients.length)];
}

export default {
  init,
  context
};
