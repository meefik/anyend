import WebSocket, { WebSocketServer } from 'ws';
import logger from '../utils/logger.mjs';

let wss;

export default async function (options) {
  wss = new WebSocketServer({ noServer: true });
  wss.send = function (data, room) {
    process.send({ id: 'socket:message', room, data });
  };
  wss.on('connection', function (ws, request, user) {
    ws._rooms = {};
    ws.on('error', function (err) {
      logger.log({
        level: 'error',
        label: 'wss',
        message: err.message
      });
    });
    ws.on('message', function (message, isBinary) {
      console.log('message', message, isBinary);
      if (isBinary) return;
      const { action, room, data } = JSON.parse(message);
      if (action === 'join' && room) {
        ws._rooms[room] = true;
        console.log('join', room);
        return;
      }
      if (action === 'leave' && room) {
        delete ws._rooms[room];
        console.log('leave', room);
        return;
      }
      wss.send(data, room);
    });
  });
  process.on('message', function (e) {
    if (e?.id === 'socket:message' && e?.data) {
      const message = JSON.stringify(e.data);
      wss.clients.forEach(function (ws) {
        if ((e.room && ws._rooms[e.room]) || !e.room) {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(message);
          }
        }
      });
    }
  });
  return wss;
}
