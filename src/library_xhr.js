var LibraryXHR = {
    $XHRWrapper__deps: ["dispatch_async_f","dispatch_sync_f"],
    $XHRWrapper: {
        nextId: 1,
        xhrs: {},
        useProxy: function(url) {
            var prefixes = Module['httpProxyUrlPrefixes'] || [];
            for(var i = 0; i < prefixes.length; i++) {
                var prefix = prefixes[i];
                if(url.indexOf(prefix) == 0) return true;
            }
            return false;
        },
        logNetworkAccess: function(message) {
            if(Module['httpLogging']) {
                Module.print(message);
            }
        },
    },
    _xhr_create: function() {
        if(typeof XMLHttpRequest === "undefined" && ENVIRONMENT_IS_NODE) XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
        var id = XHRWrapper.nextId++;
        XHRWrapper.xhrs[id] = new XMLHttpRequest();
        return id;
    },
    _xhr_open: function(id, method, url, async, user, pass) {
        var xhr = XHRWrapper.xhrs[id];
        xhr.method = Pointer_stringify(method);
        xhr.url = Pointer_stringify(url);
        xhr.async = !!async;
        xhr.user = user ? Pointer_stringify(user) : null;
        xhr.pass = pass ? Pointer_stringify(pass) : null;
        xhr.useProxy = XHRWrapper.useProxy(xhr.url);

        if(xhr.useProxy) {
            var proxyUrl = Module["httpProxyServer"] || "https://api.tombo.io/proxy";
            xhr.open("POST", proxyUrl, xhr.async);
            xhr.headers = [];
            xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
            xhr.getResponseJson = function() {
                if(this.responseJson) return this.responseJson;
                if(this.status == 200) {
                    try {
                        this.responseJson = JSON.parse(this.responseText);
                    } catch(e) {
                        this.responseJson = {
                            status: 0,
                            error: {
                                message: "Failed to parse proxy response Error="+e.toString()+", Response="+this.responseText
                            }
                        }
                    }
                } else {
                    this.responseJson = {
                        status: 0,
                        error: {
                            message: "Failed to connect proxy server StatusCode="+xhr.status
                        }
                    }
                }
                return this.responseJson;
            }
            xhr.responseJson = null;
        } else {
            if(xhr.async) {
                xhr.responseType = "arraybuffer";
            }
            xhr.open(xhr.method, xhr.url, xhr.async, xhr.user, xhr.pass);
        }
    },
    _xhr_clean: function(id) {
        if(XHRWrapper.xhrs[id]) {
            delete XHRWrapper.xhrs[id];
        }
    },
    _xhr_abort: function(id) {
        var xhr = XHRWrapper.xhrs[id];
        xhr.abort();
    },
    _xhr_set_onload: function(id, queue, ctx, func) {
        var xhr = XHRWrapper.xhrs[id];
        xhr.onload = function(e) {
            if(xhr.useProxy) {
                var res = xhr.getResponseJson();
                if(res.error) {
                    xhr.onerror(new Error());
                    return;
                }
            }

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
        if(xhr.useProxy) {
            xhr.headers.push(key + ": "+value);
        } else {
            if(key == "User-Agent") return;
            xhr.setRequestHeader(key, value);
        }
    },
    _xhr_set_with_credentials: function(id, withCredentials) {
        var xhr = XHRWrapper.xhrs[id];
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
    _xhr_send__deps: ['TomboPlatform'],
    _xhr_send: function(id, data, length) {
        var xhr = XHRWrapper.xhrs[id];
        if(xhr.useProxy) {
            XHRWrapper.logNetworkAccess("HTTP[Proxy] "+xhr.method+" "+xhr.url);

            if(Module['httpLogging']) {
                xhr.addEventListener("error", function(e) {
                    XHRWrapper.logNetworkAccess("HTTP[Proxy] Error detected while accessing proxy server. See console for details");
                }, false);
            }

            try {
                var user_jwt = TomboPlatform.getUserJwtFromCookie();

                if(!Module["httpProxyServer"] && !user_jwt) {
                    XHRWrapper.logNetworkAccess("HTTP[Proxy] Trying to access platform proxy server but user_jwt doesn't exist");
                    setTimeout(xhr.onerror, 1);
                    return;
                }

                var req = "";
                req += "proxy[url]=" + encodeURIComponent(xhr.url);
                req += "&proxy[method]=" + encodeURIComponent(xhr.method);
                for(var i = 0; i < xhr.headers.length; i++) {
                    req += "&proxy[headers][]=" + encodeURIComponent(xhr.headers[i]);
                }
                req += "&proxy[body]=" + ((data && length) ? encodeURIComponent(String.fromCharCode.apply(null, HEAPU8.subarray(data, data+length))) : "");
                req += "&user_jwt=" + encodeURIComponent(user_jwt);

                xhr.send(req);

                if(!xhr.async && xhr.status == 200) {
                    // handle error of synchronouse request between origin and proxy server
                    var res = xhr.getResponseJson();
                    if(res.error) {
                        XHRWrapper.logNetworkAccess("HTTP[Proxy] Error response from proxy server: "+res.error.message);
                    }
                }
            } catch(e) {
                XHRWrapper.logNetworkAccess("HTTP[Proxy] Exception caught: "+e);
            }

        } else {
            XHRWrapper.logNetworkAccess("HTTP[Direct] "+xhr.method+" "+xhr.url);

            if(Module['httpLogging']) {
                xhr.addEventListener("error", function(e) {
                    XHRWrapper.logNetworkAccess("HTTP[Direct] Error detected. See console for details.");
                }, false);
            }

            try {
                if(data && length) {
                    xhr.send(HEAPU8.subarray(data, data+length));
                } else {
                    xhr.send();
                }
            } catch(e) {
                XHRWrapper.logNetworkAccess("HTTP[Direct] Exception caught: "+e);
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
        var buf, length;
        if(xhr.useProxy || !xhr.async) {
            var responseText = xhr.useProxy ? atob(xhr.getResponseJson().body) : xhr.responseText;
            length = responseText.length;
            buf = _malloc(length);
            if(Module['httpLogging']) {
                for(var i = 0; i < length; i++) {
                    var c = responseText.charCodeAt(i);
                    if(c > 0xff) {
                        XHRWrapper.logNetworkAccess("HTTP: Detect non-ascii character '"+c+"' at "+i);
                    }
                    {{{ makeSetValue('buf', 'i', 'c', 'i8') }}}
                }
            } else {
                for(var i = 0; i < length; i++) {
                    var c = responseText.charCodeAt(i);
                    {{{ makeSetValue('buf', 'i', 'c', 'i8') }}}
                }
            }
        } else {
            var arraybuffer = xhr.response;
            length = arraybuffer.byteLength;
            buf = _malloc(length);
            HEAPU8.set(new Uint8Array(arraybuffer), buf);
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

autoAddDeps(LibraryXHR, '$XHRWrapper');
mergeInto(LibraryManager.library, LibraryXHR);

DEFAULT_LIBRARY_FUNCS_TO_INCLUDE.splice(-1,0,
"_xhr_create",
"_xhr_open",
"_xhr_clean",
"_xhr_abort",
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
