'use strict';

const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const msgpack = require('msgpack-lite');
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
    ws.send(msgpack.encode(message));
  }

  static replace(m, s) {
    // NOTE: This is not safe, but this server is just for testing
    if (m.path[0] != '/') {
      console.log('path should start with /');
      return;
    }
    const sync_path = `synced_files${m.path}`;
    const sync_dirname = path.dirname(sync_path);

    mkdirp(sync_dirname, (err, made) => {
      if (m.contents === null) {
        // directory
        console.log(`DIR: ${sync_path}`);
        fs.mkdir(sync_path, m.mode, (err) => {
          s({
            type: 'ok',
            path: m.path,
            mtime: m.mtime
          });
        });
      } else {
        // NOTE: m.contents should be Uint8Array
        // file
        console.log(`FILE: ${sync_path}`);
        fs.open(sync_path, 'w', m.mode, (err, fd) => {
          fs.writeFile(fd, new Buffer(m.contents), (err) => {
            // NOTE: set atime as mtime
            fs.futimes(fd, m.mtime, m.mtime, (err) => {
              fs.close(fd, (err) => {
                s({
                  type: 'ok',
                  path: m.path,
                  mtime: m.mtime
                });
              });
            });
          });
        });
      }
    });
  }

  static handleMessage(ws, message) {
    const s = Server.send.bind(null, ws);
    let m;
    try {
      m = msgpack.decode(message);
    } catch (error) {
      console.log(`Message must be encoded by msgpack`);
      return;
    }
    switch (m.type) {
    case 'replace':
      Server.replace(m, s);
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
      console.log(`Invalid message type "${m.type}"`);
      break;
    }
  }
}

// module.exports = Server;

var s = new Server({
  port: 8080
});
