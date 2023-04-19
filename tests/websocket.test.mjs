import assert from 'assert';
import http from 'http';
import WebSocket from 'ws';
import { createWebSocketClient } from './utils.mjs';
import createWebSocketServer from '../path/to/your/websocket/server/module.mjs';

async function testWebSocketServer() {
  let server;
  let wss;
  const PORT = 3001;

  server = http.createServer();
  wss = await createWebSocketServer();
  server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });
  server.listen(PORT);

  const clientA = await createWebSocketClient(`ws://localhost:${PORT}`);
  const clientB = await createWebSocketClient(`ws://localhost:${PORT}`);

  const messagePromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Test timed out'));
    }, 5000);

    clientA.on('message', (message) => {
      const data = JSON.parse(message);
      assert.deepStrictEqual(data, { text: 'Hello' });
      clearTimeout(timeout);
      resolve();
    });

    clientB.on('message', () => {
      clearTimeout(timeout);
      reject(new Error('Client B should not receive the message'));
    });
  });

  clientA.send(JSON.stringify({ action: 'join', room: 'test' }));
  clientB.send(JSON.stringify({ action: 'join', room: 'other' }));

  setTimeout(() => {
    clientA.send(
      JSON.stringify({
        action: 'send',
        room: 'test',
        data: { text: 'Hello' },
      })
    );
  }, 100);

  await messagePromise;

  wss.close();
  server.close();
}

(async () => {
  try {
    await testWebSocketServer();
    console.log('WebSocket Server Test: PASSED');
  } catch (error) {
    console.error('WebSocket Server Test: FAILED', error);
  }
})();
