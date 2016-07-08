var LibraryCoreAudio = {
    $CoreAudio__deps: [],
    $CoreAudio__postset: "CoreAudio.init();",
    $CoreAudio: {
        context: null,
        audioBuffers: {},
        audioPlayers: {},
        playerIdCounter: 1,
        init: function() {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            CoreAudio.context = new AudioContext();
            
            // disable audio plugin and use mine
            Module["noAudioDecoding"] = true;
            Module["noImageDecoding"] = true;
            
            if (!Module["preloadPlugins"]) Module["preloadPlugins"] = [];
            Module['preloadPlugins'].push({
                canHandle: function(name) {
                    return name.substr(-4) in { '.caf': 1, '.ogg': 1, '.wav': 1, '.mp3': 1 };
                },
                handle: function(byteArray, name, onload, onerror) {
                    CoreAudio.context.decodeAudioData(Uint8Array.from(byteArray).buffer, function(decoded){
                        CoreAudio.audioBuffers[name] = decoded;
                        if(onload) onload(byteArray);
                    },
                    function(err){
                        if(onerror) onerror();
                    });
                }
            });
        },
        
        calcPosition: function(now, begin, duration) {
            var pos = now - begin;
            while(pos >= duration) pos -= duration;
            return pos;
        }
    },
    
    // audipBuffer* are used from ExtAudioFile+ in AudioToolBox
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
    
    // audipPlayer* are used from AVAudioPlayer in AVFoundation
    audioPlayer_create: function(name) {
        var _name = Pointer_stringify(name);
        var playerId = CoreAudio.playerIdCounter++;
        
        CoreAudio.audioPlayers[playerId] = {
            buffer: CoreAudio.audioBuffers[_name],
            volume: 1.0,
            numberOfLoops: 1,
            beginAt: 0.0,
            offset: 0.0
        };
        return playerId;
    },
    audioPlayer_play: function(playerId, delay) {
        var player = CoreAudio.audioPlayers[playerId];
        var source = player.source = CoreAudio.context.createBufferSource();
        var gain = CoreAudio.context.createGain();
        
        source.buffer = player.buffer;
        source.connect(gain);
        
        gain.value = player.volume;
        gain.connect(CoreAudio.context.destination);
        
        var beginAt = player.beginAt = CoreAudio.context.currentTime + delay;
        var offset = player.offset;
        if(player.numberOfLoops > 0) {
            source.loop = true;
            var duration = player.buffer.duration;
            source.start(beginAt, offset, player.numberOfLoops*duration);
        } else {
            source.loop = true;
            source.start(beginAt, offset);
        }
    },
    audioPlayer_stop: function(playerId) {
        var player = CoreAudio.audioPlayers[playerId];
        var source = player.source;
        if(source) {
            source.stop();
            delete player.source;
        }
        player.offset = CoreAudio.calcPosition(CoreAudio.context.currentTime, player.beginAt, player.buffer.duration);
    },
    audioPlayer_isPlaying: function(playerId) {
        var player = CoreAudio.audioPlayers[playerId];
        return player.source ? 1 : 0;
    },
    audioPlayer_setVolume: function(playerId, volume) {
        var player = CoreAudio.audioPlayers[playerId];
        player.volume = volume;
    },
    audioPlayer_setNumberOfLoops: function(playerId, numberOfLoops) {
        var player = CoreAudio.audioPlayers[playerId];
        if(numberOfLoops == 0) numberOfLoops = 1;
        player.numberOfLoops = numberOfLoops;
    },
    audioPlayer_setOffset: function(playerId, offset) {
        var player = CoreAudio.audioPlayers[playerId];
        player.offset = offset;
    },
    audioPlayer_getPosition: function(playerId) {
        var player = CoreAudio.audioPlayers[playerId];
        if(player.source) {
            return CoreAudio.calcPosition(CoreAudio.context.currentTime, player.beginAt, player.buffer.duration);
        } else {
            return player.offset;
        }
    },
    audioPlayer_destroy: function(playerId) {
        delete CoreAudio.audioPlayers[playerId];
    }
};



autoAddDeps(LibraryCoreAudio, '$CoreAudio');
mergeInto(LibraryManager.library, LibraryCoreAudio);
