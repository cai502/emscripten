'use strict';

const WebSocketServer = require('ws').Server;

class Server {
  constructor(opts) {
    this.wss = new WebSocketServer(opts);
    this.wss.on('connection', (ws) => {
      ws.clientData = {};
      const handleMessage = Server.handleMessage.bind(null, ws);
      ws.on('message', handleMessage);
    });
  }

  close() {
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
  }

  static send(ws, message) {
    ws.send(JSON.stringify(message));
  }

  static handleMessage(ws, message) {
    const s = Server.send.bind(null, ws);
    let m;
    try {
      m = JSON.parse(message);
    } catch (error) {
      console.log(`Invalid message ${message}`);
      return;
    }
    switch (m.type) {
    case 'replace':
      s({
        type: 'ok',
        applicationId: 'FIXME:',
        path: m.path,
        timestamp: 'FIXME:',
        version: 'FIXME:'
      });
      break;
    case 'delete':
      s({
        type: 'ok',
        applicationId: 'FIXME:',
        path: m.path,
        timestamp: 'FIXME:',
        version: 'FIXME:'
      });
      break;
    case 'fetchall':
      s({
        type: 'fetchall'
      });
      break;
    default:
      console.log(`Invalid type ${m.type}`);
      break;
    }
  }
}

// module.exports = Server;

var s = new Server({
  port: 8080
});
