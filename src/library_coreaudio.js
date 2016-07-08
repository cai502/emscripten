var LibraryCoreAudio = {
    $CoreAudio__deps: [],
    $CoreAudio__postset: "CoreAudio.init();",
    $CoreAudio: {
        context: null,
        audioBuffers: {},
        init: function() {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            CoreAudio.context = new AudioContext();
            
            // disable audio plugin and use mine
            Module["noAudioDecoding"] = true;
            Module["noImageDecoding"] = true;
            
            var decodeAudioPlugin = {};
            decodeAudioPlugin['canHandle'] = function decodeAudioPlugin_canHandle(name) {
                return name.substr(-4) in { '.caf': 1, '.ogg': 1, '.wav': 1, '.mp3': 1 };
            };
            decodeAudioPlugin['handle'] = function decodeAudioPlugin_handle(byteArray, name, onload, onerror) {
                CoreAudio.context.decodeAudioData(Uint8Array.from(byteArray).buffer, function(decoded){
                    CoreAudio.audioBuffers[name] = decoded;
                    if(onload) onload(byteArray);
                },
                function(err){
                    if(onerror) onerror();
                });
            };
            if (!Module["preloadPlugins"]) Module["preloadPlugins"] = [];
            Module['preloadPlugins'].push(decodeAudioPlugin);
        }
    },
    
    audioBuffer_sampleRate: function(name) {
        var _name = Pointer_stringify(name);
        var audioBuffer = CoreAudio.audioBuffers[_name];
        return audioBuffer.sampleRate;
    },
    audioBuffer_length: function(name) {
        var _name = Pointer_stringify(name);
        var audioBuffer = CoreAudio.audioBuffers[_name];
        return audioBuffer.length;
    },
    audioBuffer_numberOfChannels: function(name) {
        var _name = Pointer_stringify(name);
        var audioBuffer = CoreAudio.audioBuffers[_name];
        return audioBuffer.numberOfChannels;
    },
    audioBuffer_read: function(name, channels, bytes, data) {
        var _name = Pointer_stringify(name);
        var audioBuffer = CoreAudio.audioBuffers[_name];
        
        var dat = [];
        for(var ch = 0; ch < channels; ch++)
            dat[ch] = audioBuffer.getChannelData(ch);
        
        for (var i = 0; i < audioBuffer.length; i++) {
            for (var ch = 0; ch < channels; ch++) {
                var val = dat[ch][i]; // [-1.0, 1.0]
                switch (bytes) {
                case 1:
                    {{{ makeSetValue('data', 'i*channels+ch', '(val+1.0)*255/2', 'i8') }}};
                    break;
                case 2:
                    {{{ makeSetValue('data', '2*(i*channels+ch)', 'val*32768', 'i16') }}};
                    break;
                case 4:
                    {{{ makeSetValue('data', '4*(i*channels+ch)', 'val', 'float') }}};
                    break;
                }
            }
        }
    },
};



autoAddDeps(LibraryCoreAudio, '$CoreAudio');
mergeInto(LibraryManager.library, LibraryCoreAudio);
