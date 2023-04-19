import http from 'http';
import { createWebSocketClient } from './utils.mjs';
import createWebSocketServer from '../lib/api/wss.mjs';

describe('WebSocket Server', () => {
  let server;
  let wss;
  const PORT = 3001;

  beforeAll(async () => {
    server = http.createServer();
    wss = await createWebSocketServer();
    server.on('upgrade', (request, socket, head) => {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    });
    server.listen(PORT);
  });

  afterAll(() => {
    wss.close();
    server.close();
  });

  test('Join and leave room, and broadcast message', async (done) => {
    const clientA = await createWebSocketClient(`ws://localhost:${PORT}`);
    const clientB = await createWebSocketClient(`ws://localhost:${PORT}`);

    clientA.on('message', (message) => {
      const data = JSON.parse(message);
      expect(data).toEqual({ text: 'Hello' });
      clientA.close();
      clientB.close();
      done();
    });

    clientB.on('message', () => {
      throw new Error('Client B should not receive the message');
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
  });
});
