var XHRWrapper = {
    $XHRWrapper__deps: ["dispatch_async_f","dispatch_sync_f"],
    $XHRWrapper: {
        nextId: 0,
        xhrs: {}
    },
    _xhr_create: function() {
        if(typeof XMLHttpRequest === "undefined" && ENVIRONMENT_IS_NODE) XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
        var id = XHRWrapper.nextId++;
        XHRWrapper.xhrs[id] = new XMLHttpRequest();
        return id;
    },
    _xhr_open: function(id, method, url, async, user, pass) {
        var xhr = XHRWrapper.xhrs[id];
        var method = Pointer_stringify(method);
        var url = Pointer_stringify(url);
        async = !!async;
        var user = user ? Pointer_stringify(user) : null;
        var pass = pass ? Pointer_stringify(pass) : null;
        xhr.open(method, url, async, user, pass);
        xhr.overrideMimeType('text/plain; charset=x-user-defined');
        xhr.async = async;
    },
    _xhr_clean: function(id) {
        delete XHRWrapper.xhrs[id];
    },
    _xhr_set_onload: function(id, queue, ctx, func) {
        var xhr = XHRWrapper.xhrs[id];
        xhr.onload = function(e) {
            if(xhr.async) {
                _dispatch_async_f(queue, ctx, func);
            } else {
                _dispatch_sync_f(queue, ctx, func);
            }
        }
    },
    _xhr_set_onerror: function(id, queue, ctx, func) {
        var xhr = XHRWrapper.xhrs[id];
        xhr.onerror = function(e) {
            if(xhr.async) {
                _dispatch_async_f(queue, ctx, func);
            } else {
                _dispatch_sync_f(queue, ctx, func);
            }
        }
    },
    _xhr_set_request_header: function(id, key, value) {
        var xhr = XHRWrapper.xhrs[id];
        var key = Pointer_stringify(key);
        var value = Pointer_stringify(value);
        if(key == "User-Agent") return;
        xhr.setRequestHeader(key, value);
    },
    _xhr_set_with_credentials: function(id, withCredentials) {
        var xhr = XHRWrapper.xhrs[id];
        xhr.withCredentials = !!withCredentials;
    },
    _xhr_set_timeout: function(id, timeout) {
        var xhr = XHRWrapper.xhrs[id];
        xhr.timeout = timeout;
    },
    _xhr_send: function(id, data, length) {
        var xhr = XHRWrapper.xhrs[id];
        try {
            if(data && length) {
                xhr.send(HEAPU8.subarray(data, data+length));
            } else {
                xhr.send();
            }
        } catch(e) {
            console.log(e);
        }
    },
    _xhr_get_ready_state: function(id) {
        var xhr = XHRWrapper.xhrs[id];
        return xhr.readyState;
    },
    _xhr_get_status: function(id) {
        var xhr = XHRWrapper.xhrs[id];
        return xhr.status;
    },
    _xhr_get_status_text: function(id, text) {
        var xhr = XHRWrapper.xhrs[id];
        var statusText = xhr.statusText 
        var length = statusText.length;
        var buf = _malloc(length);
        writeAsciiToMemory(statusText, buf);
        {{{ makeSetValue('text', '0', 'buf', 'i32') }}}
        return length;
    },
    _xhr_get_response_text: function(id, data) {
        var xhr = XHRWrapper.xhrs[id];
        var responseText = xhr.responseText;
        var length = responseText.length;
        var buf = _malloc(length);
        for(var i = 0; i < length; i++) {
            var c = responseText.charCodeAt(i) & 0xff;
            {{{ makeSetValue('buf', 'i', 'c', 'i8') }}}
        }
        {{{ makeSetValue('data', '0', 'buf', 'i32') }}}
        return length;
    },
    _xhr_get_all_response_headers: function(id, data) {
        var xhr = XHRWrapper.xhrs[id];
        var headers = xhr.getAllResponseHeaders();
        var length = headers.length+1;
        var buf = _malloc(length);
        writeAsciiToMemory(headers, buf);
        {{{ makeSetValue('data', '0', 'buf', 'i32') }}}
        return length;
    }
};

autoAddDeps(XHRWrapper, '$XHRWrapper');
mergeInto(LibraryManager.library, XHRWrapper);

DEFAULT_LIBRARY_FUNCS_TO_INCLUDE.splice(-1,0,
"_xhr_create",
"_xhr_open",
"_xhr_clean",
"_xhr_set_onload",
"_xhr_set_onerror",
"_xhr_set_request_header",
"_xhr_set_with_credentials",
"_xhr_set_timeout",
"_xhr_send",
"_xhr_get_ready_state",
"_xhr_get_status",
"_xhr_get_status_text",
"_xhr_get_response_text",
"_xhr_get_all_response_headers"
);
