'use strict';

module.exports = {
  ops_table: null,
  mount: function(mount) {
    return TOMBOFS.createNode(null, '/', EMSCRIPTEN_CDEFINE_S_IFDIR | 511 /* 0777 */, 0);
  },
  createNode: function(parent, name, mode, dev) {
    if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
      // no supported
      throw new FS.ErrnoError(ERRNO_CODES.EPERM);
    }
    if (!TOMBOFS.ops_table) {
      TOMBOFS.ops_table = {
        dir: {
          node: {
            getattr: TOMBOFS.node_ops.getattr,
            setattr: TOMBOFS.node_ops.setattr,
            lookup: TOMBOFS.node_ops.lookup,
            mknod: TOMBOFS.node_ops.mknod,
            rename: TOMBOFS.node_ops.rename,
            unlink: TOMBOFS.node_ops.unlink,
            rmdir: TOMBOFS.node_ops.rmdir,
            readdir: TOMBOFS.node_ops.readdir,
            symlink: TOMBOFS.node_ops.symlink
          },
          stream: {
            llseek: TOMBOFS.stream_ops.llseek
          }
        },
        file: {
          node: {
            getattr: TOMBOFS.node_ops.getattr,
            setattr: TOMBOFS.node_ops.setattr
          },
          stream: {
            llseek: TOMBOFS.stream_ops.llseek,
            read: TOMBOFS.stream_ops.read,
            write: TOMBOFS.stream_ops.write,
            allocate: TOMBOFS.stream_ops.allocate,
            mmap: TOMBOFS.stream_ops.mmap,
            msync: TOMBOFS.stream_ops.msync
          }
        },
        link: {
          node: {
            getattr: TOMBOFS.node_ops.getattr,
            setattr: TOMBOFS.node_ops.setattr,
            readlink: TOMBOFS.node_ops.readlink
          },
          stream: {}
        },
        chrdev: {
          node: {
            getattr: TOMBOFS.node_ops.getattr,
            setattr: TOMBOFS.node_ops.setattr
          },
          stream: FS.chrdev_stream_ops
        }
      };
    }
    var node = FS.createNode(parent, name, mode, dev);
    if (FS.isDir(node.mode)) {
      node.node_ops = TOMBOFS.ops_table.dir.node;
      node.stream_ops = TOMBOFS.ops_table.dir.stream;
      node.contents = {};
    } else if (FS.isFile(node.mode)) {
      node.node_ops = TOMBOFS.ops_table.file.node;
      node.stream_ops = TOMBOFS.ops_table.file.stream;
      node.usedBytes = 0; // The actual number of bytes used in the typed array, as opposed to contents.length which gives the whole capacity.
      // When the byte data of the file is populated, this will point to either a typed array, or a normal JS array. Typed arrays are preferred
      // for performance, and used by default. However, typed arrays are not resizable like normal JS arrays are, so there is a small disk size
      // penalty involved for appending file writes that continuously grow a file similar to std::vector capacity vs used -scheme.
      node.contents = null;
    } else if (FS.isLink(node.mode)) {
      node.node_ops = TOMBOFS.ops_table.link.node;
      node.stream_ops = TOMBOFS.ops_table.link.stream;
    } else if (FS.isChrdev(node.mode)) {
      node.node_ops = TOMBOFS.ops_table.chrdev.node;
      node.stream_ops = TOMBOFS.ops_table.chrdev.stream;
    }
    node.timestamp = Date.now();
    // add the new node to the parent
    if (parent) {
      parent.contents[name] = node;
    }
    return node;
  },

  // Given a file node, returns its file data converted to a regular JS array. You should treat this as read-only.
  getFileDataAsRegularArray: function(node) {
    if (node.contents && node.contents.subarray) {
      var arr = [];
      for (var i = 0; i < node.usedBytes; ++i) arr.push(node.contents[i]);
      return arr; // Returns a copy of the original data.
    }
    return node.contents; // No-op, the file contents are already in a JS array. Return as-is.
  },

  // Given a file node, returns its file data converted to a typed array.
  getFileDataAsTypedArray: function(node) {
    if (!node.contents) return new Uint8Array;
    if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes); // Make sure to not return excess unused bytes.
    return new Uint8Array(node.contents);
  },

  // Allocates a new backing store for the given node so that it can fit at least newSize amount of bytes.
  // May allocate more, to provide automatic geometric increase and amortized linear performance appending writes.
  // Never shrinks the storage.
  expandFileStorage: function(node, newCapacity) {
    if (!node.contents || node.contents.subarray) { // Keep using a typed array if creating a new storage, or if old one was a typed array as well.
      var prevCapacity = node.contents ? node.contents.length : 0;
      if (prevCapacity >= newCapacity) return; // No need to expand, the storage was already large enough.
      // Don't expand strictly to the given requested limit if it's only a very small increase, but instead geometrically grow capacity.
      // For small filesizes (<1MB), perform size*2 geometric increase, but for large sizes, do a much more conservative size*1.125 increase to
      // avoid overshooting the allocation cap by a very large margin.
      var CAPACITY_DOUBLING_MAX = 1024 * 1024;
      newCapacity = Math.max(newCapacity, (prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2.0 : 1.125)) | 0);
      if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256); // At minimum allocate 256b for each file when expanding.
      var oldContents = node.contents;
      node.contents = new Uint8Array(newCapacity); // Allocate new storage.
      if (node.usedBytes > 0) node.contents.set(oldContents.subarray(0, node.usedBytes), 0); // Copy old data over to the new storage.
      return;
    }
    // Not using a typed array to back the file storage. Use a standard JS array instead.
    if (!node.contents && newCapacity > 0) node.contents = [];
    while (node.contents.length < newCapacity) node.contents.push(0);
  },

  // Performs an exact resize of the backing file storage to the given size, if the size is not exactly this, the storage is fully reallocated.
  resizeFileStorage: function(node, newSize) {
    if (node.usedBytes == newSize) return;
    if (newSize == 0) {
      node.contents = null; // Fully decommit when requesting a resize to zero.
      node.usedBytes = 0;
      return;
    }
    if (!node.contents || node.contents.subarray) { // Resize a typed array if that is being used as the backing store.
      var oldContents = node.contents;
      node.contents = new Uint8Array(new ArrayBuffer(newSize)); // Allocate new storage.
      if (oldContents) {
        node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes))); // Copy old data over to the new storage.
      }
      node.usedBytes = newSize;
      return;
    }
    // Backing with a JS array.
    if (!node.contents) node.contents = [];
    if (node.contents.length > newSize) node.contents.length = newSize;
    else while (node.contents.length < newSize) node.contents.push(0);
    node.usedBytes = newSize;
  },

  node_ops: {
    getattr: function(node) {
      var attr = {};
      // device numbers reuse inode numbers.
      attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
      attr.ino = node.id;
      attr.mode = node.mode;
      attr.nlink = 1;
      attr.uid = 0;
      attr.gid = 0;
      attr.rdev = node.rdev;
      if (FS.isDir(node.mode)) {
        attr.size = 4096;
      } else if (FS.isFile(node.mode)) {
        attr.size = node.usedBytes;
      } else if (FS.isLink(node.mode)) {
        attr.size = node.link.length;
      } else {
        attr.size = 0;
      }
      attr.atime = new Date(node.timestamp);
      attr.mtime = new Date(node.timestamp);
      attr.ctime = new Date(node.timestamp);
      // NOTE: In our implementation, st_blocks = Math.ceil(st_size/st_blksize),
      //       but this is not required by the standard.
      attr.blksize = 4096;
      attr.blocks = Math.ceil(attr.size / attr.blksize);
      return attr;
    },
    setattr: function(node, attr) {
      if (attr.mode !== undefined) {
        node.mode = attr.mode;
      }
      if (attr.timestamp !== undefined) {
        node.timestamp = attr.timestamp;
      }
      if (attr.size !== undefined) {
        TOMBOFS.resizeFileStorage(node, attr.size);
      }
    },
    lookup: function(parent, name, ex) {
      if(ex) return;
      throw FS.genericErrors[ERRNO_CODES.ENOENT];
    },
    mknod: function(parent, name, mode, dev) {
      return TOMBOFS.createNode(parent, name, mode, dev);
    },
    rename: function(old_node, new_dir, new_name) {
      // if we're overwriting a directory at new_name, make sure it's empty.
      if (FS.isDir(old_node.mode)) {
        var new_node;
        try {
          new_node = FS.lookupNode(new_dir, new_name);
        } catch (e) {
        }
        if (new_node) {
          for (var i in new_node.contents) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
          }
        }
      }
      // do the internal rewiring
      delete old_node.parent.contents[old_node.name];
      old_node.name = new_name;
      new_dir.contents[new_name] = old_node;
      old_node.parent = new_dir;
    },
    unlink: function(parent, name) {
      delete parent.contents[name];
    },
    rmdir: function(parent, name) {
      var node = FS.lookupNode(parent, name);
      for (var i in node.contents) {
        throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
      }
      delete parent.contents[name];
    },
    readdir: function(node) {
      var entries = ['.', '..']
      for (var key in node.contents) {
        if (!node.contents.hasOwnProperty(key)) {
          continue;
        }
        entries.push(key);
      }
      return entries;
    },
    symlink: function(parent, newname, oldpath) {
      var node = TOMBOFS.createNode(parent, newname, 511 /* 0777 */ | EMSCRIPTEN_CDEFINE_S_IFLNK, 0);
      node.link = oldpath;
      return node;
    },
    readlink: function(node) {
      if (!FS.isLink(node.mode)) {
        throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
      }
      return node.link;
    },
  },
  stream_ops: {
    read: function(stream, buffer, offset, length, position) {
      var contents = stream.node.contents;
      if (position >= stream.node.usedBytes) return 0;
      var size = Math.min(stream.node.usedBytes - position, length);
      assert(size >= 0);
      if (size > 8 && contents.subarray) { // non-trivial, and typed array
        buffer.set(contents.subarray(position, position + size), offset);
      } else {
        for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i];
      }
      return size;
    },

    // Writes the byte range (buffer[offset], buffer[offset+length]) to offset 'position' into the file pointed by 'stream'
    // canOwn: A boolean that tells if this function can take ownership of the passed in buffer from the subbuffer portion
    //         that the typed array view 'buffer' points to. The underlying ArrayBuffer can be larger than that, but
    //         canOwn=true will not take ownership of the portion outside the bytes addressed by the view. This means that
    //         with canOwn=true, creating a copy of the bytes is avoided, but the caller shouldn't touch the passed in range
    //         of bytes anymore since their contents now represent file data inside the filesystem.
    write: function(stream, buffer, offset, length, position, canOwn) {
      if (!length) return 0;
      var node = stream.node;
      node.timestamp = Date.now();

      if (buffer.subarray && (!node.contents || node.contents.subarray)) { // This write is from a typed array to a typed array?
        if (canOwn) {
          assert(position === 0, 'canOwn must imply no weird position inside the file');
          node.contents = buffer.subarray(offset, offset + length);
          node.usedBytes = length;
          return length;
        } else if (node.usedBytes === 0 && position === 0) { // If this is a simple first write to an empty file, do a fast set since we don't need to care about old data.
          node.contents = new Uint8Array(buffer.subarray(offset, offset + length));
          node.usedBytes = length;
          return length;
        } else if (position + length <= node.usedBytes) { // Writing to an already allocated and used subrange of the file?
          node.contents.set(buffer.subarray(offset, offset + length), position);
          return length;
        }
      }

      // Appending to an existing file and we need to reallocate, or source data did not come as a typed array.
      TOMBOFS.expandFileStorage(node, position+length);
      if (node.contents.subarray && buffer.subarray) node.contents.set(buffer.subarray(offset, offset + length), position); // Use typed array write if available.
      else {
        for (var i = 0; i < length; i++) {
         node.contents[position + i] = buffer[offset + i]; // Or fall back to manual write if not.
        }
      }
      node.usedBytes = Math.max(node.usedBytes, position+length);
      return length;
    },

    llseek: function(stream, offset, whence) {
      var position = offset;
      if (whence === 1) {  // SEEK_CUR.
        position += stream.position;
      } else if (whence === 2) {  // SEEK_END.
        if (FS.isFile(stream.node.mode)) {
          position += stream.node.usedBytes;
        }
      }
      if (position < 0) {
        throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
      }
      return position;
    },
    allocate: function(stream, offset, length) {
      TOMBOFS.expandFileStorage(stream.node, offset + length);
      stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length);
    },
    mmap: function(stream, buffer, offset, length, position, prot, flags) {
      if (!FS.isFile(stream.node.mode)) {
        throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
      }
      var ptr;
      var allocated;
      var contents = stream.node.contents;
      // Only make a new copy when MAP_PRIVATE is specified.
      if ( !(flags & EMSCRIPTEN_CDEFINE_MAP_PRIVATE) &&
            (contents.buffer === buffer || contents.buffer === buffer.buffer) ) {
        // We can't emulate MAP_SHARED when the file is not backed by the buffer
        // we're mapping to (e.g. the HEAP buffer).
        allocated = false;
        ptr = contents.byteOffset;
      } else {
        // Try to avoid unnecessary slices.
        if (position > 0 || position + length < stream.node.usedBytes) {
          if (contents.subarray) {
            contents = contents.subarray(position, position + length);
          } else {
            contents = Array.prototype.slice.call(contents, position, position + length);
          }
        }
        allocated = true;
        ptr = _malloc(length);
        if (!ptr) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOMEM);
        }
        buffer.set(contents, ptr);
      }
      return { ptr: ptr, allocated: allocated };
    },
    msync: function(stream, buffer, offset, length, mmapFlags) {
      if (!FS.isFile(stream.node.mode)) {
        throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
      }
      if (mmapFlags & EMSCRIPTEN_CDEFINE_MAP_PRIVATE) {
        // MAP_PRIVATE calls need not to be synced back to underlying fs
        return 0;
      }

      var bytesWritten = TOMBOFS.stream_ops.write(stream, buffer, 0, length, offset, false);
      // should we check if bytesWritten and length are the same?
      return 0;
    }
  },

  // sync to IndexedDB
  dbs: {},
  indexedDB: function() {
    if (typeof indexedDB !== 'undefined') return indexedDB;
    var ret = null;
    if (typeof window === 'object') ret = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
    assert(ret, 'TOMBOFS used, but indexedDB not supported');
    return ret;
  },
  DB_VERSION: 21,
  DB_STORE_NAME: 'FILE_DATA',
  syncfs: function(mount, populate, callback) {
    TOMBOFS.getLocalSet(mount, function(err, local) {
      if (err) return callback(err);

      TOMBOFS.getRemoteSet(mount, function(err, remote) {
        if (err) return callback(err);

        var src = populate ? remote : local;
        var dst = populate ? local : remote;

        TOMBOFS.reconcile(src, dst, callback);
      });
    });
  },
  getDB: function(name, callback) {
    // check the cache first
    var db = TOMBOFS.dbs[name];
    if (db) {
      return callback(null, db);
    }

    var req;
    try {
      req = TOMBOFS.indexedDB().open(name, TOMBOFS.DB_VERSION);
    } catch (e) {
      return callback(e);
    }
    if (!req) {
      return callback("Unable to connect to IndexedDB");
    }
    req.onupgradeneeded = function(e) {
      var db = e.target.result;
      var transaction = e.target.transaction;

      var fileStore;

      if (db.objectStoreNames.contains(TOMBOFS.DB_STORE_NAME)) {
        fileStore = transaction.objectStore(TOMBOFS.DB_STORE_NAME);
      } else {
        fileStore = db.createObjectStore(TOMBOFS.DB_STORE_NAME);
      }

      if (!fileStore.indexNames.contains('timestamp')) {
        fileStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
    req.onsuccess = function() {
      db = req.result;

      // add to the cache
      TOMBOFS.dbs[name] = db;
      callback(null, db);
    };
    req.onerror = function(e) {
      callback(this.error);
      e.preventDefault();
    };
  },
  getLocalSet: function(mount, callback) {
    var entries = {};

    function isRealDir(p) {
      return p !== '.' && p !== '..';
    };
    function toAbsolute(root) {
      return function(p) {
        return PATH.join2(root, p);
      }
    };

    var check = FS.readdir(mount.mountpoint).filter(isRealDir).map(toAbsolute(mount.mountpoint));

    while (check.length) {
      var path = check.pop();
      var stat;

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

    return callback(null, { type: 'local', entries: entries });
  },
  getRemoteSet: function(mount, callback) {
    var entries = {};

    TOMBOFS.getDB(mount.mountpoint, function(err, db) {
      if (err) return callback(err);

      var transaction = db.transaction([TOMBOFS.DB_STORE_NAME], 'readonly');
      transaction.onerror = function(e) {
        callback(this.error);
        e.preventDefault();
      };

      var store = transaction.objectStore(TOMBOFS.DB_STORE_NAME);
      var index = store.index('timestamp');

      index.openKeyCursor().onsuccess = function(event) {
        var cursor = event.target.result;

        if (!cursor) {
          return callback(null, { type: 'remote', db: db, entries: entries });
        }

        entries[cursor.primaryKey] = { timestamp: cursor.key };

        cursor.continue();
      };
    });
  },
  loadLocalEntry: function(path, callback) {
    var stat, node;

    try {
      var lookup = FS.lookupPath(path);
      node = lookup.node;
      stat = FS.stat(path);
    } catch (e) {
      return callback(e);
    }

    if (FS.isDir(stat.mode)) {
      return callback(null, { timestamp: stat.mtime, mode: stat.mode });
    } else if (FS.isFile(stat.mode)) {
      // Performance consideration: storing a normal JavaScript array to a IndexedDB is much slower than storing a typed array.
      // Therefore always convert the file contents to a typed array first before writing the data to IndexedDB.
      node.contents = MEMFS.getFileDataAsTypedArray(node);
      return callback(null, { timestamp: stat.mtime, mode: stat.mode, contents: node.contents });
    } else {
      return callback(new Error('node type not supported'));
    }
  },
  storeLocalEntry: function(path, entry, callback) {
    try {
      if (FS.isDir(entry.mode)) {
        FS.mkdir(path, entry.mode);
      } else if (FS.isFile(entry.mode)) {
        FS.writeFile(path, entry.contents, { encoding: 'binary', canOwn: true });
      } else {
        return callback(new Error('node type not supported'));
      }

      FS.chmod(path, entry.mode);
      FS.utime(path, entry.timestamp, entry.timestamp);
    } catch (e) {
      return callback(e);
    }

    callback(null);
  },
  removeLocalEntry: function(path, callback) {
    try {
      var lookup = FS.lookupPath(path);
      var stat = FS.stat(path);

      if (FS.isDir(stat.mode)) {
        FS.rmdir(path);
      } else if (FS.isFile(stat.mode)) {
        FS.unlink(path);
      }
    } catch (e) {
      return callback(e);
    }

    callback(null);
  },
  loadRemoteEntry: function(store, path, callback) {
    var req = store.get(path);
    req.onsuccess = function(event) { callback(null, event.target.result); };
    req.onerror = function(e) {
      callback(this.error);
      e.preventDefault();
    };
  },
  storeRemoteEntry: function(store, path, entry, callback) {
    var req = store.put(entry, path);
    req.onsuccess = function() { callback(null); };
    req.onerror = function(e) {
      callback(this.error);
      e.preventDefault();
    };
  },
  removeRemoteEntry: function(store, path, callback) {
    var req = store.delete(path);
    req.onsuccess = function() { callback(null); };
    req.onerror = function(e) {
      callback(this.error);
      e.preventDefault();
    };
  },
  reconcile: function(src, dst, callback) {
    var total = 0;

    var create = [];
    Object.keys(src.entries).forEach(function (key) {
      var e = src.entries[key];
      var e2 = dst.entries[key];
      if (!e2 || e.timestamp > e2.timestamp) {
        create.push(key);
        total++;
      }
    });

    var remove = [];
    Object.keys(dst.entries).forEach(function (key) {
      var e = dst.entries[key];
      var e2 = src.entries[key];
      if (!e2) {
        remove.push(key);
        total++;
      }
    });

    if (!total) {
      return callback(null);
    }

    var errored = false;
    var completed = 0;
    var db = src.type === 'remote' ? src.db : dst.db;
    var transaction = db.transaction([TOMBOFS.DB_STORE_NAME], 'readwrite');
    var store = transaction.objectStore(TOMBOFS.DB_STORE_NAME);

    function done(err) {
      if (err) {
        if (!done.errored) {
          done.errored = true;
          return callback(err);
        }
        return;
      }
      if (++completed >= total) {
        return callback(null);
      }
    };

    transaction.onerror = function(e) {
      done(this.error);
      e.preventDefault();
    };

    // sort paths in ascending order so directory entries are created
    // before the files inside them
    create.sort().forEach(function (path) {
      if (dst.type === 'local') {
        TOMBOFS.loadRemoteEntry(store, path, function (err, entry) {
          if (err) return done(err);
          TOMBOFS.storeLocalEntry(path, entry, done);
        });
      } else {
        TOMBOFS.loadLocalEntry(path, function (err, entry) {
          if (err) return done(err);
          TOMBOFS.storeRemoteEntry(store, path, entry, done);
        });
      }
    });

    // sort paths in descending order so files are deleted before their
    // parent directories
    remove.sort().reverse().forEach(function(path) {
      if (dst.type === 'local') {
        TOMBOFS.removeLocalEntry(path, done);
      } else {
        TOMBOFS.removeRemoteEntry(store, path, done);
      }
    });
  }
}
