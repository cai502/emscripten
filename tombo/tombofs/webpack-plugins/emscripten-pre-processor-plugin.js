'use strict';

var ConcatSource = require('webpack-core/lib/ConcatSource');

/**
 * @param args
 * @constructor
 */
function EmscriptenPreProcessorPlugin(args) {
  if (typeof args !== 'object') {
    throw new TypeError('Argument "args" must be an object.');
  }
}

function apply(compiler) {
  compiler.plugin('compilation', function (compilation) {
    compilation.plugin('optimize-chunk-assets', function (chunks, done) {
      wrapChunks(compilation, chunks);
      done();
    })
  });

  function replaceFile(compilation, fileName) {
    let source = compilation.assets[fileName].source();
    let replaced_source = source.replace(
      /EMSCRIPTEN_CDEFINE_([_A-Z]+)/g,
      function(match, p1, offset, str) {
        return `{{{ cDefine('${p1}') }}}`;
      }
    );
    compilation.assets[fileName] = new ConcatSource(
        replaced_source
    );
  }

  function wrapChunks(compilation, chunks) {
    chunks.forEach(function (chunk) {
      chunk.files.forEach(function (fileName) {
        replaceFile(compilation, fileName);
      });
    });
  }
}

Object.defineProperty(EmscriptenPreProcessorPlugin.prototype, 'apply', {
  value: apply,
  enumerable: false
});

module.exports = EmscriptenPreProcessorPlugin;
