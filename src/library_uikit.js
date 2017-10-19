var LibraryUIKit = {
    $UIKit__deps: [],
    $UIKit__postset: "UIKit.init();",
    $UIKit: {
        init: function() {
        }
    },
    
    UIKit_openUrl: function(urlString, isJapanese) {
        // To avoid link error on emscripten, we need to encode
        // encodeURI("ポップアップブロックを解除してください")

        var url = Pointer_stringify(urlString);
        var ret = window.open(url, '_blank') != null ? 1 : 0;
        if(!ret) {
            if(isJapanese) {
                alert(decodeURI("%E3%83%9D%E3%83%83%E3%83%97%E3%82%A2%E3%83%83%E3%83%97%E3%83%96%E3%83%AD%E3%83%83%E3%82%AF%E3%82%92%E8%A7%A3%E9%99%A4%E3%81%97%E3%81%A6%E3%81%8F%E3%81%A0%E3%81%95%E3%81%84"));
            } else {
                alert("Please allow pop-ups!");
            }
        }
        return ret;
    },
    
    UIKit_getInitialDeviceOrientation: function() {
        return Module['initialDeviceOrientation'] || 0;
    },
    
    UIKit_syncfs: function() {
        FS.syncfs(false, function(){});
    },
    
    UIKit_downloadImage: function(data, length) {
        // cf. http://qiita.com/ukyo/items/d623209655a003b13add
        var a = document.createElement('a');
        var blob = new Blob([HEAPU8.subarray(data, data+length)], {type: 'image/png'});
        var url = window.URL.createObjectURL(blob);
        a.href = url;
        a.download = 'image'+(new Date().toISOString().replace(/[-:.TZ]/g,''))+'.png';
        var e = document.createEvent('MouseEvent');
        e.initEvent("click", true, true, window, 1, 0, 0, 0, 0, false, false, false, false, 0, null);
        a.dispatchEvent(e);
    },
    
    UIKit_getScreenModeNumber: function() {
        return Module['screenModes'] ? Module['screenModes'].length : 0;
    },
    
    UIKit_getScreenWidthAt: function(idx) {
        return Module['screenModes'][idx].width;
    },
    
    UIKit_getScreenHeightAt: function(idx) {
        return Module['screenModes'][idx].height;
    },
    
    UIKit_getScreenScaleAt: function(idx) {
        return Module['screenModes'][idx].scale;
    },
    
    UIKit_shouldPreserveDrawingBuffer: function() {
        return Module['shouldPreserveDrawingBuffer'] ? 1 : 0;
    },

    UIKit_initScreen: function() {
        Module.useWebGL = true;
        Browser.moduleContextCreatedCallbacks.forEach(function(callback) { callback() });
    },
    
    __getStackTrace: function(arrays) {
        var error = new Error();
        var stacktrace = error.stack;
        if(!stacktrace) {
            return 0;
        }
        var lines = stacktrace.split("\n");
        var buffers = _malloc(lines.length * 4);
        for(var i = 0; i < lines.length; i++) {
            var line = lines[i];
            var buffer = _malloc(line.length+1);
            {{{ makeSetValue('buffers', 'i*4', 'buffer', 'i32') }}};
            stringToAscii(line, buffer);
        }
        {{{ makeSetValue('arrays', 0, 'buffers', 'i32') }}};
        return lines.length;
    }
};

autoAddDeps(LibraryUIKit, '$UIKit');
mergeInto(LibraryManager.library, LibraryUIKit);
