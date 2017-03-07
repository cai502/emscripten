'use strict';

// TODO: Use dffptch to reduce difference
//       https://github.com/paldepind/dffptch

const TomboWebSocket = require('./tombo-web-socket');

module.exports = {
  debug: true,
  remote_entries: {},
  mount_point: null,
  websocket: null,
  offline: false,
  sent_directories: 0,
  sent_files: 0,
  mount: function(mount) {
    // reuse all of the core MEMFS functionality
    let node = MEMFS.mount.apply(null, arguments);
    TOMBOPFFS.mount_point = mount[0].mountpoint;
    TOMBOPFFS.fetchAllRemoteEntries();
    return node;
  },
  connectSocket: function() {
    return new Promise((resolve, reject) => {
      if (TOMBOPFFS.offline || !Module.remoteFileSystemURL) { return reject(null); }
      if (TOMBOPFFS.websocket) { return resolve(TOMBOPFFS.websocket); }
      let websocket = new TomboWebSocket(Module.remoteFileSystemURL);
      websocket.on('message', (message) => {
        TOMBOPFFS.onRemoteMessage(message);
      });
      websocket.on('open', () => {
        resolve(websocket);
      });
      websocket.on('error', (error) => {
        console.log(error);
        // currently, erro recovery isn't implemented
        alert('ERROR on the remote file system. Reload the page.');
        TOMBOPFFS.offline = true;
        reject(error);
      });
      TOMBOPFFS.websocket = websocket;
    });
  },
  onRemoteMessage: function(message) {
    switch(message.type) {
    case 'ok':
      if (message.request_type === 'fetch-all') {
        TOMBOPFFS.sent_directories = message.sent_directories;
        TOMBOPFFS.sent_files = message.sent_files;
      }
      break;
    case 'replace':
      const local_path = TOMBOPFFS.mount_point + message.path;
      // NOTE: now direct update
      // TODO: wait for parent directory
      TOMBOPFFS.storeMEMFSEntry(local_path, {
        mode: message.mode,
        mtime: message.mtime,
        contents: message.contents // could be null
      }).then(() => {
        TOMBOPFFS.remote_entries[local_path] = {
          mode: message.mode,
          mtime: message.mtime,
        }
      });
      break;
    default:
      console.log(`ERROR: invalid message type ${message.type}`);
    }
  },
  waitForFetchAll: function() {
    return new Promise((resolve, reject) => {
      let f = () => {
        const sent = TOMBOPFFS.sent_directories + TOMBOPFFS.sent_files;
        const current = Object.keys(TOMBOPFFS.remote_entries).length;
        // console.log(`current: ${current} sent: ${sent}`);
        if (sent === current) {
          resolve();
        } else {
          console.log(`waiting fetching files from the remote server: current ${current}`);
          setTimeout(f, 100);
        }
      };
      f();
    });
  },
  /* entry point of filesystem sync */
  syncfs: function(mount, populate, callback) {
    let memfs;
    // TODO: mutex during syncing
    if (populate) {
      // remote to MEMFS
      TOMBOPFFS.waitForFetchAll()
      .then(callback)
      .catch((error) => {
        console.groupCollapsed('TOMBOPFFS.syncfs() remote => MEMFS');
        console.log(error);
        console.groupEnd();

        return callback(error);
      });
    } else {
      // MEMFS to remote
      TOMBOPFFS.getMEMFSEntries(mount).then((_memfs) => {
        memfs = _memfs;
        return TOMBOPFFS.getRemoteEntries(mount);
      })
      .then((remote) => {
        let source = memfs;
        let destination = remote;

        // TODO: reconcile should be bi-directional
        return TOMBOPFFS.reconcile(source, destination);
      })
      .then(callback)
      .catch((error) => {
        console.groupCollapsed('TOMBOPFFS.syncfs() MEMFS => remote');
        console.log(error);
        console.groupEnd();

        return callback(error);
      });
    }
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

        entries[path] = { mtime: stat.mtime };
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
  fetchAllRemoteEntries: function() {
    TOMBOPFFS.sent_directories = 0;
    TOMBOPFFS.sent_files = 0;
    return TOMBOPFFS.connectSocket().then((socket) => {
      socket.send({
        type: 'fetch-all',
        request_id: 'fetch-all-dummy' // TODO: replace a proper id
      });
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
        return resolve({ mtime: stat.mtime, mode: stat.mode });
      } else if (FS.isFile(stat.mode)) {
        // Performance consideration: storing a normal JavaScript array to a IndexedDB is much slower than storing a typed array.
        // Therefore always convert the file contents to a typed array first before writing the data to IndexedDB.
        node.contents = MEMFS.getFileDataAsTypedArray(node);
        return resolve({ mtime: stat.mtime, mode: stat.mode, contents: node.contents });
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
      FS.utime(path, entry.mtime, entry.mtime);

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
    // sync source and destination
    let total_entries = 0;
    let replace_entries = [];

    // copy all the newer entries of source
    Object.keys(source.entries).forEach(function (key) {
      let e1 = source.entries[key];
      let e2 = destination.entries[key];
      if (!e2 || e1.mtime > e2.mtime) {
        replace_entries.push(key);
        total_entries++;
      }
    });

    // delete old entries of destination
    let delete_entries = [];
    Object.keys(destination.entries).forEach(function (key) {
      if (!source.entries[key]) {
        delete_entries.push(key);
        total_entries++;
      }
    });

    // nothing has changed
    if (total_entries == 0) { return Promise.resolve(); }

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


    var updateMTime = function (key) {
      if (destination.entries.hasOwnProperty(key)) {
        destination.entries[key].mtime = source.entries[key].mtime;
      } else {
        destination.entries[key] = { mtime: source.entries[key].mtime };
      }
    };

    // copy to local file system
    if (destination.type === 'memfs') {
      return new Promise((resolve, reject) => {
        for (const key of replace_entries) {
          // FIXME: implement
          updateMTime(key);
        }
        for (const key of delete_entries) {
          // FIXME: implement
          destination.entries.delete(key);
        }
      });
    } else if (destination.type === 'remote') {
      return TOMBOPFFS.connectSocket().then((socket) => {
        for (const key of replace_entries) {
          TOMBOPFFS.loadMEMFSEntry(key).then((entry) => {
            if (!key.startsWith(TOMBOPFFS.mount_point)) {
              return Promise.reject(new Error(`Invalid path ${key}`));
            }
            socket.send({
              type: 'replace',
              path: key.substring(TOMBOPFFS.mount_point.length),
              mode: entry.mode,
              mtime: entry.mtime,
              contents: entry.contents || null, // If null, this is a directory.
              request_id: 'dummy' // TODO: replace a proper id
            });
          });
          updateMTime(key);
        }
        for (const key of delete_entries) {
          socket.send({
            type: 'delete',
            path: key,
            request_id: 'dummy' // TODO: replace a proper id
          });
          destination.entries.delete(key);
        }
      });
    } else {
      return new Promise.reject(new Error(`Invalid destination type ${destination.type}`));
    }
  }
};
