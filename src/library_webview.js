var LibraryIFrame = {
    $IFrame__deps: [],
    $IFrame__postset: "IFrame.init();",
    $IFrame: {
        iFrameIdCounter: 0,
        iframes: {},
        init: function() {
        }
    },
    
    iframe_create: function() {
        var iframe = document.createElement("iframe");
        var id = ++IFrame.iFrameIdCounter;
        iframe.id = "iframe"+id;
        IFrame.iframes[id] = iframe;
        return id;
    },

    iframe_destroy: function(id) {
        delete IFrame.iframes[id];
    },
    
    iframe_attach: function(id) {
        var iframe = IFrame.iframes[id];
        var parent = Module["canvas"].parentElement;
        parent.appendChild(iframe);
    },
    
    iframe_detach: function(id) {
        var iframe = IFrame.iframes[id];
        var parent = Module["canvas"].parentElement;
        parent.removeChild(iframe);
    },
    
    iframe_setFrame: function(id, left, top, width, height) {
        var iframe = IFrame.iframes[id];
        var canvas = Module["canvas"];
        iframe.width = width;
        iframe.height = height;
        iframe.style.position = "absolute";
        iframe.style.left = (canvas.offsetLeft+left) +"px";
        iframe.style.top = (canvas.offsetTop+top) +"px";
        iframe.style.borderWidth = "0px";
    },
    
    iframe_loadUrl: function(id, url) {
        var iframe = IFrame.iframes[id];
        iframe.removeAttribute("srcdoc");
        iframe.src = Pointer_stringify(url);
    },
    
    iframe_loadString: function(id, str) {
        var iframe = IFrame.iframes[id];
        iframe.srcdoc = Pointer_stringify(str);
    }, 
    
    iframe_stopLoading: function(id) {
        var iframe = IFrame.iframes[id];
        iframe.stop();
    },
    
    iframe_reload: function(id) {
        var iframe = IFrame.iframes[id];
        iframe.contentDocument.location.reload();
    },
    
    iframe_goBack: function(id) {
        var iframe = IFrame.iframes[id];
        iframe.contentWindow.history.back();
    },
    
    iframe_goForward: function(id) {
        var iframe = IFrame.iframes[id];
        iframe.contentWindow.history.forward();
    }
};

autoAddDeps(LibraryIFrame, '$IFrame');
mergeInto(LibraryManager.library, LibraryIFrame);
