import cluster from 'node:cluster';
import http from 'node:http';
import server from '../src/server.js';
import config from 'config/index.js';
import { setTimeout } from 'node:timers/promises';

server(config);

await setTimeout(3000);
