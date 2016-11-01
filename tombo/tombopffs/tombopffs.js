'use strict';

// TODO: Use dffptch to reduce difference
//       https://github.com/paldepind/dffptch

const TomboWebSocket = require('./tombo-web-socket');

module.exports = {
  debug: true,
  remote_entries: {},
  websocket: null,
  mount: function(mount) {
    // reuse all of the core MEMFS functionality
    let node = MEMFS.mount.apply(null, arguments);
    return node;
  },
  connectSocket: function(url) {
    return new Promise((resolve, reject) => {
      if (TOMBOPFFS.websocket) {
        return resolve(TOMBOPFFS.websocket);
      }
      let websocket = new TomboWebSocket(url);
      TOMBOPFFS.websocket = websocket;
      websocket.on('message', (message) => {
        console.log(`MESSAGE: ${JSON.stringify(message)}`);
      });
      websocket.on('open', () => {
        resolve(websocket);
      });
      websocket.on('error', (error) => {
        console.log(error);
      });
    });
  },
  /* entry point of filesystem sync */
  syncfs: function(mount, populate, callback) {
    let memfs;
    TOMBOPFFS.getMEMFSEntries(mount).then((_memfs) => {
      memfs = _memfs;
      return TOMBOPFFS.getRemoteEntries(mount);
    }).then((remote) => {
      let source = populate ? remote : memfs;
      let destination = populate ? memfs : remote;

      return TOMBOPFFS.reconcile(source, destination);
    }).then(callback).catch((error) => {
      console.groupCollapsed('TOMBOPFFS.syncfs()');
      console.log(error);
      console.groupEnd();

      return callback(error);
    });
  },
  getMEMFSEntries: function(mount) {
    return new Promise((resolve, reject) => {
      let entries = {};

      function isRealDir(p) {
        return p !== '.' && p !== '..';
      };
      function toAbsolute(root) {
        return function(p) {
          return PATH.join2(root, p);
        }
      };

      let check = FS.readdir(mount.mountpoint).filter(isRealDir)
                  .map(toAbsolute(mount.mountpoint));

      while (check.length) {
        const path = check.pop();
        let stat;

        try {
          stat = FS.stat(path);
        } catch (e) {
          return reject(e);
        }

        if (FS.isDir(stat.mode)) {
          check.push.apply(check, FS.readdir(path).filter(isRealDir).map(toAbsolute(path)));
        }

        entries[path] = { timestamp: stat.mtime };
      }

      /*
      if (TOMBOPFFS.debug) {
        console.groupCollapsed('TOMBOPFFS.getMEMFSEntries()');
        console.dir(entries);
        console.groupEnd();
      }
      */

      return resolve({ type: 'memfs', entries: entries });
    });
  },
  getRemoteEntries: function(mount) {
    // NOTE: currently, this function only returns local variable,
    //       but I made that async for near future.
    return new Promise((resolve, reject) => {
      resolve({ type: 'remote', entries: TOMBOPFFS.remote_entries });
    });
  },
  loadMEMFSEntry: function(path) {
    return new Promise((resolve, reject) => {
      let stat, node;

      try {
        let lookup = FS.lookupPath(path);
        node = lookup.node;
        stat = FS.stat(path);
      } catch (e) {
        return reject(e);
      }

      if (FS.isDir(stat.mode)) {
        // NOTE: If path points a directory, 'contents' is not set
        return resolve({ timestamp: stat.mtime, mode: stat.mode });
      } else if (FS.isFile(stat.mode)) {
        // Performance consideration: storing a normal JavaScript array to a IndexedDB is much slower than storing a typed array.
        // Therefore always convert the file contents to a typed array first before writing the data to IndexedDB.
        node.contents = MEMFS.getFileDataAsTypedArray(node);
        return resolve({ timestamp: stat.mtime, mode: stat.mode, contents: node.contents });
      } else {
        return reject(new Error('node type not supported'));
      }
    });
  },
  storeMEMFSEntry: function(path, entry) {
    return new Promise((resolve, reject) => {
      if (FS.isDir(entry.mode)) {
        FS.mkdir(path, entry.mode);
      } else if (FS.isFile(entry.mode)) {
        FS.writeFile(path, entry.contents, { encoding: 'binary', canOwn: true });
      } else {
        return reject(new Error('node type not supported'));
      }

      FS.chmod(path, entry.mode);
      FS.utime(path, entry.timestamp, entry.timestamp);

      resolve();
    });
  },
  removeMEMFSEntry: function(path) {
    return new Promise((resolve, reject) => {
      let lookup = FS.lookupPath(path);
      let stat = FS.stat(path);

      if (FS.isDir(stat.mode)) {
        FS.rmdir(path);
      } else if (FS.isFile(stat.mode)) {
        FS.unlink(path);
      }

      resolve();
    });
  },
  reconcile: function(source, destination) {
    let total_entries = 0;

    let replace_entries = [];
    Object.keys(source.entries).forEach(function (key) {
      let e1 = source.entries[key];
      let e2 = destination.entries[key];
      if (!e2 || e1.timestamp > e2.timestamp) {
        replace_entries.push(key);
        total_entries++;
      }
    });

    let delete_entries = [];
    Object.keys(destination.entries).forEach(function (key) {
      if (!source.entries[key]) {
        delete_entries.push(key);
        total_entries++;
      }
    });

    if (total_entries == 0) {
      return Promise.resolve();
    }

    /*
    if (TOMBOPFFS.debug) {
      console.groupCollapsed('TOMBOPFFS.reconcile()');
      console.log('replace entries:');
      console.table(replace_entries);
      console.log('delete entries:');
      console.table(delete_entries);
      console.log('destination:');
      console.log(destination);
      console.groupEnd();
    }
    */

    // TODO: set URL
    return TOMBOPFFS.connectSocket('ws://127.0.0.1:8080').then((socket) => {
      for (const key of replace_entries) {
        if (destination.type === 'memfs') {
          // TODO: implement
        } else if (destination.type == 'remote') {
          TOMBOPFFS.loadMEMFSEntry(key).then((entry) => {
            socket.send({
              type: 'replace',
              path: key,
              mode: entry.mode,
              mtime: entry.timestamp,
              contents: entry.contents || null // If null, this is a directory.
            });
          });
        } else {
          return new Promise.reject(new Error(`Invalid destination type ${destination.type}`));
        }
        if (destination.entries.hasOwnProperty(key)) {
          destination.entries[key].timestamp = source.entries[key].timestamp;
        } else {
          destination.entries[key] = { timestamp: source.entries[key].timestamp };
        }
      }

      for (const key of delete_entries) {
        socket.send({type: 'delete', path: key});
        destination.entries.delete(key);
      }
    });
  }
};
