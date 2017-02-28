'use strict';

module.exports = {
  $TOMBOPFFS__deps: ['$FS', '$MEMFS', '$PATH'],
  $TOMBOPFFS: {
    dbs: {},
    mount: function(mount) {
      // reuse all of the core MEMFS functionality
      return MEMFS.mount.apply(null, arguments);
    },
    syncfs: function(mount, populate, callback) {
      // TODO: implement
      callback(null);
    }
  }
};
