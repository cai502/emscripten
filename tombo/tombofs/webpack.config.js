const webpack = require('webpack');
const WrapperPlugin = require('wrapper-webpack-plugin');
const EmscriptenPreProcessorPlugin = require('./webpack-plugins/emscripten-pre-processor-plugin');

const isProduction = process.env.NODE_ENV === 'production';
const outputFileName = '../../src/library_tombofs.js';
const libraryVarName = 'tombofs';

const babel_plugins = [];
const webpack_plugins = [];

// emscripten module load
// TOMBOFS.mount() is called in FS module in booting.
// So we use a little bit tricky method to replace the $TOMBOFS properties
// from the variable initialized in $TOMBOFS.mount().
webpack_plugins.push(
  new WrapperPlugin({
    header: `
mergeInto(LibraryManager.library, {
  $TOMBOFS__deps: ['$FS', '$PATH'],
  $TOMBOFS: {
    mount: function() {
`,
    footer: `
      // replace TOMBOFS
      delete this.mount;
      for (var key in ${libraryVarName}) {
        if (${libraryVarName}.hasOwnProperty(key)) {
          this[key] = ${libraryVarName}[key];
        }
      }
      return TOMBOFS.mount(arguments);
    }
  }
});
`
  })
);

if (isProduction) {
  babel_plugins.push('transform-remove-console');
  webpack_plugins.push(
    new webpack.optimize.UglifyJsPlugin({
      compress: { warnings: false }
    })
  );
}

webpack_plugins.push(
  new EmscriptenPreProcessorPlugin({
  })
);

module.exports = {
  entry: ['./src/tombofs.js'],
  output: {
    path: __dirname,
    filename: outputFileName,
    library: libraryVarName,
    libraryTarget: 'var'
  },
  module: {
    noParse: [
      // Stop the message 'This seems to be a pre-built javascript file.'
      /aws\-sdk/
    ],
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        use: [
          {
            loader: 'babel-loader',
            query: {
              presets: ['es2015'],
              plugins: babel_plugins,
            }
          },
        ]
      },
    ]
  },
  plugins: webpack_plugins
};
