'use strict';

// TODO: Use dffptch to reduce difference
//       https://github.com/paldepind/dffptch

const TomboWebSocket = require('./tombo-web-socket');

module.exports = {
  $TOMBOPFFS__deps: ['$FS', '$MEMFS', '$PATH'],
  $TOMBOPFFS: {
    debug: true,
    remote_entries: {},
    websocket: null,
    mount: function(mount) {
      // reuse all of the core MEMFS functionality
      return MEMFS.mount.apply(null, arguments);
    },
    connectSocket: function(url) {
      return new Promise((resolve, reject) => {
        if (TOMBOPFFS.websocket) {
          return resolve(TOMBOPFFS.websocket);
        }
        let websocket = new TomboWebSocket(url);
        TOMBOPFFS.websocket = websocket;
        websocket.on('message', (message) => {
          console.log('MESSAGE: %s', message);
        });
        websocket.on('open', () => {
          resolve(websocket);
        });
        websocket.on('error', (error) => {
          console.log(error);
        });
      });
    },
    syncfs: function(mount, populate, callback) {
      TOMBOPFFS.getMEMFSEntries(mount, function(err, memfs) {
        if (err) return callback(err);

        TOMBOPFFS.getRemoteEntries(mount, function(err, remote) {
          if (err) return callback(err);

          var source = populate ? remote : memfs;
          var destination = populate ? memfs : remote;

          TOMBOPFFS.reconcile(source, destination, callback);
        });
      });
    },
    getMEMFSEntries: function(mount, callback) {
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
          return callback(e);
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

      return callback(null, { type: 'memfs', entries: entries });
    },
    getRemoteEntries: function(mount, callback) {
      // NOTE: currently, this function only returns local variable,
      //       but I made that async for near future.
      return callback(null, { type: 'remote', entries: TOMBOPFFS.remote_entries });
    },
    reconcile: function(source, destination, callback) {
      let total_entries = 0;

      let replace_entries = [];
      Object.keys(source.entries).forEach(function (key) {
        var e1 = source.entries[key];
        var e2 = destination.entries[key];
        if (!e2 || e1.timestamp > e2.timestamp) {
          replace_entries.push(key);
          total_entries++;
        }
      });

      var delete_entries = [];
      Object.keys(destination.entries).forEach(function (key) {
        if (!source.entries[key]) {
          delete_entries.push(key);
          total_entries++;
        }
      });

      if (total_entries == 0) {
        return callback(null);
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
      TOMBOPFFS.connectSocket('ws://127.0.0.1:8080').then((socket) => {
        // TODO: send entries
        socket.send('"test"');

        for (const key of replace_entries) {
          if (destination.entries.hasOwnProperty(key)) {
            destination.entries[key].timestamp = source.entries[key].timestamp;
          } else {
            destination.entries[key] = { timestamp: source.entries[key].timestamp };
          }
        }

        for (const key of delete_entries) {
          destination.entries.delete(key);
        }

        callback(null);
      }).catch((error) => {
        callback(error);
      });
    }
  }
};
