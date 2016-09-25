var tombopffs =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(1);


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	// TODO: Use dffptch to reduce difference
	//       https://github.com/paldepind/dffptch

	var TomboWebSocket = __webpack_require__(2);

	module.exports = {
	  $TOMBOPFFS__deps: ['$FS', '$MEMFS', '$PATH'],
	  $TOMBOPFFS: {
	    debug: true,
	    remote_entries: {},
	    websocket: null,
	    mount: function mount(_mount) {
	      // reuse all of the core MEMFS functionality
	      return MEMFS.mount.apply(null, arguments);
	    },
	    connectSocket: function connectSocket(url) {
	      return new Promise(function (resolve, reject) {
	        if (TOMBOPFFS.websocket) {
	          return resolve(TOMBOPFFS.websocket);
	        }
	        var websocket = new TomboWebSocket(url);
	        TOMBOPFFS.websocket = websocket;
	        websocket.on('message', function (message) {
	          console.log('MESSAGE: %s', message);
	        });
	        websocket.on('open', function () {
	          resolve(websocket);
	        });
	        websocket.on('error', function (error) {
	          console.log(error);
	        });
	      });
	    },
	    syncfs: function syncfs(mount, populate, callback) {
	      TOMBOPFFS.getMEMFSEntries(mount, function (err, memfs) {
	        if (err) return callback(err);

	        TOMBOPFFS.getRemoteEntries(mount, function (err, remote) {
	          if (err) return callback(err);

	          var source = populate ? remote : memfs;
	          var destination = populate ? memfs : remote;

	          TOMBOPFFS.reconcile(source, destination, callback);
	        });
	      });
	    },
	    getMEMFSEntries: function getMEMFSEntries(mount, callback) {
	      var entries = {};

	      function isRealDir(p) {
	        return p !== '.' && p !== '..';
	      };
	      function toAbsolute(root) {
	        return function (p) {
	          return PATH.join2(root, p);
	        };
	      };

	      var check = FS.readdir(mount.mountpoint).filter(isRealDir).map(toAbsolute(mount.mountpoint));

	      while (check.length) {
	        var path = check.pop();
	        var stat = void 0;

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
	    getRemoteEntries: function getRemoteEntries(mount, callback) {
	      // NOTE: currently, this function only returns local variable,
	      //       but I made that async for near future.
	      return callback(null, { type: 'remote', entries: TOMBOPFFS.remote_entries });
	    },
	    reconcile: function reconcile(source, destination, callback) {
	      var total_entries = 0;

	      var replace_entries = [];
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
	      TOMBOPFFS.connectSocket('ws://127.0.0.1:8080').then(function (socket) {
	        // TODO: send entries
	        socket.send('"test"');

	        var _iteratorNormalCompletion = true;
	        var _didIteratorError = false;
	        var _iteratorError = undefined;

	        try {
	          for (var _iterator = replace_entries[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
	            var key = _step.value;

	            if (destination.entries.hasOwnProperty(key)) {
	              destination.entries[key].timestamp = source.entries[key].timestamp;
	            } else {
	              destination.entries[key] = { timestamp: source.entries[key].timestamp };
	            }
	          }
	        } catch (err) {
	          _didIteratorError = true;
	          _iteratorError = err;
	        } finally {
	          try {
	            if (!_iteratorNormalCompletion && _iterator.return) {
	              _iterator.return();
	            }
	          } finally {
	            if (_didIteratorError) {
	              throw _iteratorError;
	            }
	          }
	        }

	        var _iteratorNormalCompletion2 = true;
	        var _didIteratorError2 = false;
	        var _iteratorError2 = undefined;

	        try {
	          for (var _iterator2 = delete_entries[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
	            var _key = _step2.value;

	            destination.entries.delete(_key);
	          }
	        } catch (err) {
	          _didIteratorError2 = true;
	          _iteratorError2 = err;
	        } finally {
	          try {
	            if (!_iteratorNormalCompletion2 && _iterator2.return) {
	              _iterator2.return();
	            }
	          } finally {
	            if (_didIteratorError2) {
	              throw _iteratorError2;
	            }
	          }
	        }

	        callback(null);
	      }).catch(function (error) {
	        callback(error);
	      });
	    }
	  }
	};

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	var Events = __webpack_require__(3);

	var TomboWebSocket = function () {
	  function TomboWebSocket(url, protocol) {
	    var _this = this;

	    _classCallCheck(this, TomboWebSocket);

	    Events(this);
	    var ws = this.ws = new WebSocket(url, protocol);
	    ws.onopen = function () {
	      console.groupCollapsed('TomboWebSocket.onopen:');
	      console.log('url');
	      console.log(url);
	      console.log('protocol');
	      console.log(protocol);
	      console.groupEnd();
	      _this.emit('open');
	    };
	    ws.onerror = function (error) {
	      console.groupCollapsed('TomboWebSocket.onerror:');
	      console.log(error);
	      console.groupEnd();
	      _this.emit('error', error);
	    };
	    ws.onclose = function (e) {
	      _this.emit('close', e);
	    };
	    ws.onmessage = function (msg) {
	      var data = void 0;
	      if (typeof msg.data === 'string') {
	        data = JSON.parse(msg.data);
	      } else {
	        data = msg.data;
	      }
	      _this.emit('message', data);
	    };
	  }

	  _createClass(TomboWebSocket, [{
	    key: 'send',
	    value: function send(msg) {
	      if ((typeof msg === 'undefined' ? 'undefined' : _typeof(msg)) === 'object') {
	        this.ws.send(JSON.stringify(msg));
	      } else {
	        this.ws.send(msg);
	      }
	    }
	  }, {
	    key: 'close',
	    value: function close() {
	      this.ws.close.apply(this.ws, arguments);
	    }
	  }]);

	  return TomboWebSocket;
	}();

	module.exports = TomboWebSocket;

/***/ },
/* 3 */
/***/ function(module, exports) {

	function Events(target){
	  var events = {}, i, list, args, A = Array;
	  target = target || this
	    /**
	     *  On: listen to events
	     */
	    target.on = function(type, func, ctx){
	      events[type] || (events[type] = [])
	      events[type].push({f:func, c:ctx})
	    }
	    /**
	     *  Off: stop listening to event / specific callback
	     */
	    target.off = function(type, func){
	      list = events[type] || []
	      i = list.length = func ? list.length : 0
	      while(i-->0) func == list[i].f && list.splice(i,1)
	    }
	    /** 
	     * Emit: send event, callbacks will be triggered
	     */
	    target.emit = function(){
	      args = A.apply([], arguments)
	      list = events[args.shift()] || []
	      i = list.length
	      for(j=0;j<i;j++) list[j].f.apply(list[j].c, args) 
	    };
	}
	var u, module, cjs = module != u;
	(cjs ? module : window)[(cjs ? 'exports' : 'Events')] = Events;


/***/ }
/******/ ]);mergeInto(LibraryManager.library, tombopffs);