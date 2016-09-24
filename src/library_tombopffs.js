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
/***/ function(module, exports) {

	'use strict';

	module.exports = {
	  $TOMBOPFFS__deps: ['$FS', '$MEMFS', '$PATH'],
	  $TOMBOPFFS: {
	    debug: true,
	    mount: function mount(_mount) {
	      // reuse all of the core MEMFS functionality
	      return MEMFS.mount.apply(null, arguments);
	    },
	    syncfs: function syncfs(mount, populate, callback) {
	      TOMBOPFFS.getMEMFSEntries(mount, function (err, local) {
	        if (err) return callback(err);

	        TOMBOPFFS.getRemoteEntries(mount, function (err, local) {
	          if (err) return callback(err);

	          // TODO: implement
	          callback(null);
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

	      if (TOMBOPFFS.debug) {
	        console.groupCollapsed('TOMBOPFFS.getMEMFSEntries()');
	        console.dir(entries);
	        console.groupEnd();
	      }

	      return callback(null, { type: 'memfs', entries: entries });
	    },
	    getRemoteEntries: function getRemoteEntries(mount, callback) {
	      var entries = [];
	      return callback(null, { type: 'remote', entries: entries });
	    }
	  }
	};

/***/ }
/******/ ]);mergeInto(LibraryManager.library, tombopffs);