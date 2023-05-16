import WebSocket, { WebSocketServer } from 'ws';
import logger from '../utils/logger.mjs';

export default async function (options) {
  const {
    joinField = '$join',
    leaveField = '$leave',
    roomField = '$room'
  } = options || {};
  const { events } = global.context;
  const wss = new WebSocketServer({ noServer: true });
  wss.on('connection', function (ws, request, user) {
    ws._rooms = {};
    ws.on('error', function (err) {
      logger.log({ level: 'error', label: 'wss', message: err.message });
    });
    ws.on('message', async function (message, isBinary) {
      if (isBinary) return;
      try {
        const data = JSON.parse(message) || {};
        if (data[joinField]) {
          [].concat(data[joinField]).forEach(room => {
            ws._rooms[room] = true;
          });
          return;
        }
        if (data[leaveField]) {
          [].concat(leaveField).forEach(room => {
            delete ws._rooms[room];
          });
          return;
        }
        await events.broadcast('socket:message', data);
      } catch (err) {
        logger.log({ level: 'error', label: 'wss', message: err.message });
      }
    });
  });
  events.on('socket:message', function (data) {
    const room = data[roomField];
    const message = JSON.stringify(data);
    for (let i = 0; i < wss.clients.length; i++) {
      const ws = wss.clients[i];
      if ((room && ws._rooms[room]) || !room) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      }
    }
  });
  return wss;
}
