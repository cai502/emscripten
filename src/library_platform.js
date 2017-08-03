var LibraryA2OPlatform = {
    $A2OPlatform__deps: [],
    $A2OPlatform__postset: "A2OPlatform.init();",
    $A2OPlatform: {
        init: function() {
        }
    },
    
    a2oApiServerUrl: function() {
        var apiServerUrl = Module["apiServerUrl"] || "https://api.tombo.i";
        var length = apiServerUrl.length + 1;
        var buf = _malloc(length);
        writeAsciiToMemory(apiServerUrl, buf, false);
        return buf;
    },
    
    a2oGetUserJwt__deps: ["XHRWrapper"],
    a2oGetUserJwt: function() {
        var jwt = XHRWrapper.getUserJwt();
        if(jwt) {
            var length = jwt.length + 1;
            var buf = _malloc(length);
            writeAsciiToMemory(jwt, buf, false);
            return buf;
        } else {
            return 0;
        }
    }
};

autoAddDeps(LibraryA2OPlatform, '$A2OPlatform');
mergeInto(LibraryManager.library, LibraryA2OPlatform);
