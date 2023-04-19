import WebSocket from 'ws';

export async function createWebSocketClient(url) {
  return new Promise((resolve, reject) => {
    const client = new WebSocket(url);
    client.on('open', () => resolve(client));
    client.on('error', (error) => reject(error));
  });
}
