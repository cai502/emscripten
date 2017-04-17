var LibraryObjC = {
    $ObjC__deps: ["malloc", "_objc_msgForward_impcache"],
    $ObjC__postset: "ObjC.init();",
    $ObjC: {
        init: function() {
        }
    },

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

    objc_msgSend: function(self, sel) {
        var cls = 0, imp = 0;
        if(!self) return 0;
        cls = HEAP32[(self+0)>>2]|0;
        imp = _cache_getImp(cls|0, sel|0)|0;
        if(!imp) {
            imp = __class_lookupMethodAndLoadCache3(self|0, sel|0, cls|0)|0;
        }
        if(imp >= 0) {
            return Module['wasmTable'].get(imp).apply(null, arguments);
        } else {
            return __objc_msgForward.apply(null, arguments);
        }
    },
    objc_msgSendSuper: function(objcSuper, sel) {
        var self = 0, superCls = 0, imp = 0;
        self = HEAP32[(objcSuper+0)>>2]|0;
        superCls = HEAP32[(objcSuper+4)>>2]|0;
        imp = _cache_getImp(superCls|0, sel|0)|0;
        if(!imp) {
            imp = __class_lookupMethodAndLoadCache3(self|0, sel|0, superCls|0)|0;
        }
        arguments[0] = self;
        if(imp >= 0) {
            return Module['wasmTable'].get(imp).apply(null, arguments);
        } else {
            return __objc_msgForward.apply(null, arguments);
        }
    },
    objc_msgSendSuper2: function(objcSuper, sel) {
        var self = 0, cls = 0, superCls = 0, imp = 0;
        self = HEAP32[(objcSuper+0)>>2]|0;
        cls = HEAP32[(objcSuper+4)>>2]|0;
        superCls = HEAP32[(cls+4)>>2]|0;
        imp = _cache_getImp(superCls|0, sel|0)|0;
        if(!imp) {
            imp = __class_lookupMethodAndLoadCache3(self|0, sel|0, superCls|0)|0;
        }
        arguments[0] = self;
        if(imp >= 0) {
            return Module['wasmTable'].get(imp).apply(null, arguments);
        } else {
            return __objc_msgForward.apply(null, arguments);
        }
    },
    objc_msgSend_stret: function(staddr, self, sel) {
        var cls = 0, imp = 0;
        if(!self) return 0;
        cls = HEAP32[(self+0)>>2]|0;
        imp = _cache_getImp(cls|0, sel|0)|0;
        if(!imp) {
            imp = __class_lookupMethodAndLoadCache3(self|0, sel|0, cls|0)|0;
        }
        if(imp >= 0) {
            return Module['wasmTable'].get(imp).apply(null, arguments);
        } else {
            return __objc_msgForward_stret.apply(null, Array.prototype.slice.call(arguments, 1));
        }
    },
    objc_msgSendSuper_stret: function(staddr,objcSuper,sel) {
        var self = 0, superCls = 0, imp = 0;
        self = HEAP32[(objcSuper+0)>>2]|0;
        superCls = HEAP32[(objcSuper+4)>>2]|0;
        imp = _cache_getImp(superCls|0, sel|0)|0;
        if(!imp) {
            imp = __class_lookupMethodAndLoadCache3(self|0, sel|0, superCls|0)|0;
        }
        arguments[1] = self;
        if(imp >= 0) {
            return Module['wasmTable'].get(imp).apply(null, arguments);
        } else {
            return __objc_msgForward_stret.apply(null, Array.prototype.slice.call(arguments, 1));
        }
    },
    objc_msgSendSuper2_stret: function(staddr, objcSuper, sel) {
        var self = 0, cls = 0, superCls = 0, imp = 0;
        self = HEAP32[(objcSuper+0)>>2]|0;
        cls = HEAP32[(objcSuper+4)>>2]|0;
        superCls = HEAP32[(cls+4)>>2]|0;
        imp = _cache_getImp(superCls|0, sel|0)|0;
        if(!imp) {
            imp = __class_lookupMethodAndLoadCache3(self|0, sel|0, superCls|0)|0;
        }
        arguments[1] = self;
        if(imp >= 0) {
            return Module['wasmTable'].get(imp).apply(null, arguments);
        } else {
            return __objc_msgForward_stret.apply(null, Array.prototype.slice.call(arguments, 1));
        }
    },
    _objc_ignored_method: function() {
        throw new Error("unimplemented");
    },
    method_invoke: function(self, method) {
        var imp = 0, sel = 0;
        imp = HEAP32[(method+8)>>2]|0;
        sel = HEAP32[(method)>>2]|0;
        arguments[1] = sel;
        return Module['wasmTable'].get(imp).apply(null, arguments);
    },
    method_invoke_stret: function(staddr, self, method) {
        var imp = 0, sel = 0;
        imp = HEAP32[(method+8)>>2]|0;
        sel = HEAP32[(method)>>2]|0;
        arguments[2] = sel;
        return Module['wasmTable'].get(imp).apply(null, arguments);
    },

    clang_arc_use: function() {
        // do nothing
    }
};

autoAddDeps(LibraryObjC, '$ObjC');
mergeInto(LibraryManager.library, LibraryObjC);
