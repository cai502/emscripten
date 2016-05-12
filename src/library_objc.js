var LibraryObjC = {
    $ObjC__deps: ["malloc"],
    $ObjC__postset: "ObjC.init();",
    $ObjC: {
        init: function() {
        }
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
