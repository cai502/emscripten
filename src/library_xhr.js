var XHRWrapper = {
    $XHRWrapper__deps: ["dispatch_async_f","dispatch_sync_f"],
    $XHRWrapper: {
        nextId: 0,
        xhrs: {},
        getUserJwt: function() {
            var cookies = document.cookie.split("; ");
            for(var i = 0; i < cookies.length; i++) {
                var cookie = cookies[i].split("=", 2);
                if(cookie[0] == "user_jwt") {
                    return cookie[1];
                }
            }
        },
        useProxy: function(url) {
            var prefixes = Module['proxyUrlPrefixes'] || [];
            for(var i = 0; i < prefixes.length; i++) {
                var prefix = prefixes[i];
                if(url.indexOf(prefix) == 0) return true;
            }
            return false;
        }
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
        var async = !!async;
        var user = user ? Pointer_stringify(user) : null;
        var pass = pass ? Pointer_stringify(pass) : null;
        var useProxy = xhr.useProxy = XHRWrapper.useProxy(url);
        if(useProxy) {
            var proxyUrl = Module["proxyUrl"] || "http://api.tombo.io/proxy";
            xhr.open("POST", proxyUrl, async);
            xhr.method = method;
            xhr.url = url;
            xhr.async = async;
            xhr.user = user;
            xhr.pass = pass;
            xhr.headers = [];
            xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
            xhr.getResponseJson = function() {
                if(this.responseJson) return this.responseJson;
                try {
                    this.responseJson = JSON.parse(this.responseText);
                } catch(e) {
                    // TODO
                    console.log(e);
                    this.responseJson = {}
                }
                return this.responseJson;
            }
            xhr.responseJson = null;
        } else {
            xhr.open(method, url, async, user, pass);
            xhr.async = async;
        }
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
        if(xhr.useProxy) {
            // TODO
        } else {
            xhr.onerror = function(e) {
                if(xhr.async) {
                    _dispatch_async_f(queue, ctx, func);
                } else {
                    _dispatch_sync_f(queue, ctx, func);
                }
            }
        }
    },
    _xhr_set_request_header: function(id, key, value) {
        var xhr = XHRWrapper.xhrs[id];
        var key = Pointer_stringify(key);
        var value = Pointer_stringify(value);
        if(xhr.useProxy) {
            xhr.headers.push(key + ": "+value);
        } else {
            if(key == "User-Agent") return;
            xhr.setRequestHeader(key, value);
        }
    },
    _xhr_set_with_credentials: function(id, withCredentials) {
        if(xhr.useProxy) {
            // ignored
        } else {
            var xhr = XHRWrapper.xhrs[id];
            xhr.withCredentials = !!withCredentials;
        }
    },
    _xhr_set_timeout: function(id, timeout) {
        var xhr = XHRWrapper.xhrs[id];
        xhr.timeout = timeout;
    },
    _xhr_send: function(id, data, length) {
        var xhr = XHRWrapper.xhrs[id];
        if(xhr.useProxy) {
            var req = "";
            req += "proxy[url]=" + encodeURIComponent(xhr.url);
            req += "&proxy[method]=" + encodeURIComponent(xhr.method);
            for(var i = 0; i < xhr.headers.length; i++) {
                req += "&proxy[headers][]=" + encodeURIComponent(xhr.headers[i]);
            }
            req += "&proxy[body]=" + ((data && length) ? encodeURIComponent(String.fromCharCode.apply(null, HEAPU8.subarray(data, data+length))) : "");
            req += "&user_jwt=" + encodeURIComponent(XHRWrapper.getUserJwt());
            xhr.send(req);
        } else {
            try {
                if(data && length) {
                    xhr.send(HEAPU8.subarray(data, data+length));
                } else {
                    xhr.send();
                }
            } catch(e) {
                console.log(e);
            }
        }
    },
    _xhr_get_ready_state: function(id) {
        var xhr = XHRWrapper.xhrs[id];
        return xhr.readyState;
    },
    _xhr_get_status: function(id) {
        var xhr = XHRWrapper.xhrs[id];
        if(xhr.useProxy) {
            var res = xhr.getResponseJson();
            return res.status;
        } else {
            return xhr.status;
        }
    },
    _xhr_get_status_text: function(id, text) {
        var xhr = XHRWrapper.xhrs[id];
        var statusText = xhr.useProxy? xhr.getResponseJson().statusLine : xhr.statusText; // TODO exactly not same
        var length = statusText.length;
        var buf = _malloc(length);
        writeAsciiToMemory(statusText, buf);
        {{{ makeSetValue('text', '0', 'buf', 'i32') }}}
        return length;
    },
    _xhr_get_response_text: function(id, data) {
        var xhr = XHRWrapper.xhrs[id];
        var responseText = xhr.useProxy ? atob(xhr.getResponseJson().body) : xhr.responseText;
        var length = responseText.length;
        var buf = _malloc(length);
        for(var i = 0; i < length; i++) {
            var c = responseText.charCodeAt(i);
            {{{ makeSetValue('buf', 'i', 'c', 'i8') }}}
        }
        {{{ makeSetValue('data', '0', 'buf', 'i32') }}}
        return length;
    },
    _xhr_get_all_response_headers: function(id, data) {
        var xhr = XHRWrapper.xhrs[id];
        var headers = xhr.useProxy ? xhr.getResponseJson().headers : xhr.getAllResponseHeaders();
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
