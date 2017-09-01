var LibraryTomboPlatform = {
    $TomboPlatform__deps: [],
    $TomboPlatform__postset: "TomboPlatform.init();",
    $TomboPlatform: {
        init: function() {
        },
        getUserJwtFromCookie: function() {
            var cookies = document.cookie.split("; ");
            for(var i = 0; i < cookies.length; i++) {
                var cookie = cookies[i].split("=", 2);
                if(cookie[0] == "user_jwt") {
                    return cookie[1];
                }
            }
            return null;
        },
    },
    
    getTomboApiServerUrl: function() {
        var apiServerUrl = Module["apiServerUrl"] || "https://api.tombo.i";
        var length = apiServerUrl.length + 1;
        var buf = _malloc(length);
        writeAsciiToMemory(apiServerUrl, buf, false);
        return buf;
    },
    
    getUserJwt: function() {
        var jwt = TomboPlatform.getUserJwtFromCookie();
        if(jwt) {
            var length = jwt.length + 1;
            var buf = _malloc(length);
            writeAsciiToMemory(jwt, buf, false);
            return buf;
        } else {
            return 0;
        }
    },
    
    getApplicationId: function() {
        var appId = Module['tombo']['appId'];
        if(appId) {
            var length = appId.length + 1;
            var buf = _malloc(length);
            writeAsciiToMemory(appId, buf, false);
            return buf;
        } else {
            return 0;
        }
    },
};

autoAddDeps(LibraryTomboPlatform, '$TomboPlatform');
mergeInto(LibraryManager.library, LibraryTomboPlatform);
