var LibraryUIKit = {
    $UIKit__deps: [],
    $UIKit__postset: "UIKit.init();",
    $UIKit: {
        UIKitIdCounter: 0,
        UIKits: {},
        init: function() {
        }
    },
    
    UIKit_create: function() {
        var UIKit = document.createElement("UIKit");
        var id = ++UIKit.UIKitIdCounter;
        UIKit.id = "UIKit"+id;
        UIKit.UIKits[id] = UIKit;
        return id;
    },

    UIKit_destroy: function(id) {
        delete UIKit.UIKits[id];
    },
    
    UIKit_attach: function(id) {
        var UIKit = UIKit.UIKits[id];
        var parent = Module["canvas"].parentElement;
        parent.appendChild(UIKit);
    },
    
    UIKit_detach: function(id) {
        var UIKit = UIKit.UIKits[id];
        var parent = Module["canvas"].parentElement;
        if(parent.contains(UIKit)) {
            parent.removeChild(UIKit);
        }
    },
    
    UIKit_setFrame: function(id, left, top, width, height) {
        var UIKit = UIKit.UIKits[id];
        var canvas = Module["canvas"];
        UIKit.width = width;
        UIKit.height = height;
        UIKit.style.position = "absolute";
        UIKit.style.left = (canvas.offsetLeft+left) +"px";
        UIKit.style.top = (canvas.offsetTop+top) +"px";
        UIKit.style.borderWidth = "0px";
    },
    
    UIKit_loadUrl: function(id, url) {
        var UIKit = UIKit.UIKits[id];
        UIKit.removeAttribute("srcdoc");
        UIKit.src = Pointer_stringify(url);
    },
    
    UIKit_loadString: function(id, str) {
        var UIKit = UIKit.UIKits[id];
        UIKit.srcdoc = Pointer_stringify(str);
    }, 
    
    UIKit_stopLoading: function(id) {
        var UIKit = UIKit.UIKits[id];
        UIKit.stop();
    },
    
    UIKit_reload: function(id) {
        var UIKit = UIKit.UIKits[id];
        UIKit.contentDocument.location.reload();
    },
    
    UIKit_goBack: function(id) {
        var UIKit = UIKit.UIKits[id];
        UIKit.contentWindow.history.back();
    },
    
    UIKit_goForward: function(id) {
        var UIKit = UIKit.UIKits[id];
        UIKit.contentWindow.history.forward();
    }
};

autoAddDeps(LibraryUIKit, '$UIKit');
mergeInto(LibraryManager.library, LibraryUIKit);
