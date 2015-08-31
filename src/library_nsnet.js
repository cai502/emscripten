var NSNetwork = {
    $NSNetwork__deps: ["dispatch_async_f"],
    $NSNetwork: {
        nextId: 0,
        xhrs: {}
    },
    _xhr_create: function() {
        if(typeof XMLHttpRequest === "undefined" && ENVIRONMENT_IS_NODE) XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
        var id = NSNetwork.nextId++;
        NSNetwork.xhrs[id] = new XMLHttpRequest();
    },
    _xhr_open: function(id, method, url, async, user, pass) {
        var xhr = NSNetwork.xhrs[id];
        var method = Pointer_stringify(method);
        var url = Pointer_stringify(url);
        var async = async != 0;
        var user = user ? Pointer_stringify(user) : null;
        var pass = pass ? Pointer_stringify(pass) : null;
        xhr.open(method, url, async, user, pass);
    },
    _xhr_set_onload: function(id, queue, ctx, func) {
        console.log("called", arguments);
        var xhr = NSNetwork.xhrs[id];
        xhr.onload = function(e) {
            console.log("onload", id, xhr.readyState, xhr.responseText, ctx, func);
            _dispatch_async_f(queue, ctx, func);
        }
    },
    _xhr_set_request_header: function(id, key, value) {
        var xhr = NSNetwork.xhrs[id];
        var key = Pointer_stringify(key);
        var value = Pointer_stringify(value);
        if(key == "User-Agent") return;
        xhr.setRequestHeader(key, value);
    },
    _xhr_send: function(id, data) {
        var xhr = NSNetwork.xhrs[id];
        //var data = Pointer_stringify(data); // binary
        xhr.send();
    },
    _xhr_get_ready_state: function(id) {
        var xhr = NSNetwork.xhrs[id];
        return xhr.readyState;
    },
    _xhr_get_status: function(id) {
        var xhr = NSNetwork.xhrs[id];
        return xhr.status;
    },
    _xhr_get_status_text: function(id, text) {
        var xhr = NSNetwork.xhrs[id];
        var statusText = xhr.statusText 
        var length = statusText.length+1;
        var buf = _malloc(length);
        writeAsciiToMemory(statusText, buf);
        {{{ makeSetValue('text', '0', 'buf', 'i32') }}}
        return length;
    },
    _xhr_get_response_text: function(id, data) {
        var xhr = NSNetwork.xhrs[id];
        var responseText = xhr.responseText;
        var length = responseText.length+1;
        var buf = _malloc(length);
        for(var i = 0; i < length; i++) {
            var c = responseText.charCodeAt(i) & 0xff;
            {{{ makeSetValue('buf', 'i', 'c', 'i8') }}}
        }
        {{{ makeSetValue('buf', 'i', '0', 'i8') }}}
        {{{ makeSetValue('data', '0', 'buf', 'i32') }}}
        return length;
    },
    _xhr_get_all_response_headers: function(id, data) {
        var xhr = NSNetwork.xhrs[id];
        var headers = xhr.getAllResponseHeaders();
        var length = headers.length+1;
        var buf = _malloc(length);
        writeAsciiToMemory(headers, buf);
        {{{ makeSetValue('data', '0', 'buf', 'i32') }}}
        return length;
    }
};

autoAddDeps(NSNetwork, '$NSNetwork');
mergeInto(LibraryManager.library, NSNetwork);
