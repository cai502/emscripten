'use strict';

module.exports = {
  $TOMBOPFFS__deps: ['$FS', '$MEMFS', '$PATH'],
  $TOMBOPFFS: {
    debug: true,
    remote_entries: {},
    mount: function(mount) {
      // reuse all of the core MEMFS functionality
      return MEMFS.mount.apply(null, arguments);
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
      // TODO: implement
      callback(null);
    }
  }
};
