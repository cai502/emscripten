'use strict';

module.exports = {
  $TOMBOPFFS__deps: ['$FS', '$MEMFS', '$PATH'],
  $TOMBOPFFS: {
    mount: function(mount) {
      // reuse all of the core MEMFS functionality
      return MEMFS.mount.apply(null, arguments);
    },
    syncfs: function(mount, populate, callback) {
      TOMBOPFFS.getMEMFSEntries(mount, function(err, local) {
        if (err) return callback(err);

        TOMBOPFFS.getRemoteEntries(mount, function(err, local) {
          if (err) return callback(err);

          // TODO: implement
          callback(null);
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

      return callback(null, { type: 'memfs', entries: entries });
    },
    getRemoteEntries: function(mount, callback) {
      let entries = [];
      return callback(null, { type: 'remote', entries: entries });
    }
  }
};
