'use strict';

const fs = require('fs');
const path = require('path');
const walk = require('walk');
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
            request_type: m.type,
            request_id: m.request_id
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
                  request_type: m.type,
                  request_id: m.request_id
                });
              });
            });
          });
        });
      }
    });
  }

  static fetchAll(m, s) {
    let sent_directories = 0;
    let sent_files = 0;
    let walker = walk.walk('synced_files', {});
    walker.on('directory', (root, fileStats, next) => {
      const full_path = path.resolve(root, fileStats.name);
      const rel_path = path.relative('synced_files', full_path);
      s({
        type: 'replace',
        path: '/' + rel_path,
        mode: fileStats.mode,
        mtime: fileStats.mtime,
        contents: null,
        request_type: m.type,
        request_id: m.request_id
      });
      sent_directories++;
      next();
    });
    walker.on('file', (root, fileStats, next) => {
      const full_path = path.resolve(root, fileStats.name);
      const rel_path = path.relative('synced_files', full_path);
      fs.readFile(full_path, (err, contents) => {
        s({
          type: 'replace',
          path: '/' + rel_path,
          mode: fileStats.mode,
          mtime: fileStats.mtime,
          contents: contents,
          request_type: m.type,
          request_id: m.request_id
        });
        sent_files++;
        next();
      })
    })
    walker.on('errors', (root, nodeStatsArray, next) => {
      // TODO: implement error handlings
      next();
    });
    walker.on('end', () => {
      s({
        type: 'ok',
        sent_directories: sent_directories,
        sent_files: sent_files,
        request_type: m.type,
        request_id: m.request_id
      });
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
        request_type: m.type,
        request_id: m.request_id
      });
      break;
    case 'fetch-all':
      Server.fetchAll(m, s);
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
