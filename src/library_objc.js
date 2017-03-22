var LibraryObjC = {
    $ObjC__deps: ["malloc", "_objc_msgForward_impcache"],
    $ObjC__postset: "ObjC.init();",
    $ObjC: {
        init: function() {
            addOnPreRun(function(){
                var addr = Runtime.addFunction(function(){
                  // _objc_msgForward_impcache
                  return __objc_msgForward.apply(this, arguments);
                });
                {{{ makeSetValue('__objc_msgForward_impcache', 0, 'addr', 'i32') }}};
            });
            __ATINIT__.push(function(){
                if(typeof __objc_init === 'function'
                        && typeof ___CFInitialize === 'function'
                        && typeof __objc_load_images === 'function'
                        && typeof _NSBlockInitialize === 'function'
                        && typeof _NSExceptionInitializer === 'function'
                        && typeof _NSPlatformInitialize === 'function'
                        && typeof _NSRunLoopModeFix === 'function') {
                    __objc_init();
                    ___CFInitialize();
                    __objc_load_images();
                    _NSBlockInitialize();
                    _NSExceptionInitializer();
                    _NSPlatformInitialize();
                    _NSRunLoopModeFix();
                }
            });
        }
    },

    _objc_msgForward_impcache: 'allocate(4, "i32*", ALLOC_STATIC)',

    _getObjc2SelectorRefCount: function() {
        return Module['objcMetaData']["__objc_selrefs"].length;
    },
    _getObjc2MessageRefCount: function() {
        return Module['objcMetaData']["__objc_msgrefs"].length;
	},
    _getObjc2ClassRefCount: function() {
        return Module['objcMetaData']["__objc_classrefs"].length;
	},
    _getObjc2SuperRefCount: function() {
        return Module['objcMetaData']["__objc_superrefs"].length;
	},
    _getObjc2ClassCount: function() {
        return Module['objcMetaData']["__objc_classlist"].length;
	},
    _getObjc2NonlazyClassCount: function() {
        return Module['objcMetaData']["__objc_nlclslist"].length;
	},
    _getObjc2CategoryCount: function() {
        return Module['objcMetaData']["__objc_catlist"].length;
	},
    _getObjc2NonlazyCategoryCount: function() {
        return Module['objcMetaData']["__objc_nlcatlist"].length;
	},
    _getObjc2ProtocolCount: function() {
        return Module['objcMetaData']["__objc_protolist"].length;
	},
    _getObjc2ProtocolRefCount: function() {
        return Module['objcMetaData']["__objc_protorefs"].length;
	},

    _getObjc2SelectorRef: function(idx) {
        return Module['objcMetaData']["__objc_selrefs"][idx];
	},
    _getObjc2MessageRef: function(idx) {
        return Module['objcMetaData']["__objc_msgrefs"][idx];
	},
    _getObjc2ClassRef: function(idx) {
        return Module['objcMetaData']["__objc_classrefs"][idx];
	},
    _getObjc2SuperRef: function(idx) {
        return Module['objcMetaData']["__objc_superrefs"][idx];
	},
    _getObjc2Class: function(idx) {
        return Module['objcMetaData']["__objc_classlist"][idx];
	},
    _getObjc2NonlazyClass: function(idx) {
        return Module['objcMetaData']["__objc_nlclslist"][idx];
	},
    _getObjc2Category: function(idx) {
        return Module['objcMetaData']["__objc_catlist"][idx];
	},
    _getObjc2NonlazyCategory: function(idx) {
        return Module['objcMetaData']["__objc_nlcatlist"][idx];
	},
    _getObjc2Protocol: function(idx) {
        return Module['objcMetaData']["__objc_protolist"][idx];
	},
    _getObjc2ProtocolRef: function(idx) {
        return Module['objcMetaData']["__objc_protorefs"][idx];
	},

    _objc_msgSend_uncached_impcache: function() {
      throw "not implemented"
    },

    _objc_msgForward__deps: ["___forwarding___"],
    _objc_msgForward: function() {
      var margs = allocate(arguments.length*4, 'i8', ALLOC_STACK);
      for(var i = 0; i < arguments.length; i++) {
        {{{ makeSetValue('margs', 'i*4', 'arguments[i]', 'i32') }}};
      }
      var returnStorage = margs;
      ____forwarding___(margs, returnStorage);
    },

    _objc_msgForward_stret__deps: ["___forwarding___"],
    _objc_msgForward_stret: function() {
      throw "not implemented";
    },

    objc_msgSend: true,
    objc_msgSendSuper: true,
    objc_msgSendSuper2: true,
    objc_msgSend_stret: true,
    objc_msgSendSuper_stret: true,
    objc_msgSendSuper2_stret: true,
    _objc_ignored_method: function() {},
    method_invoke: true,
    method_invoke_stret: true,

    clang_arc_use: function() {
        // do nothing
    }
};

autoAddDeps(LibraryObjC, '$ObjC');
mergeInto(LibraryManager.library, LibraryObjC);
