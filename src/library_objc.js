var LibraryObjC = {
    $ObjC__deps: ["malloc"],
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
    
    _objc_msgForward_stret: function() {
      throw "not implemented";
    },
    
    objc_msgSend: true,
    objc_msgSendSuper: true,
    objc_msgSendSuper2: true,
    objc_msgSend_stret: true,
    _objc_ignored_method: true,
    method_invoke: true,
    method_invoke_stret: true
};

autoAddDeps(LibraryObjC, '$ObjC');
mergeInto(LibraryManager.library, LibraryObjC);
