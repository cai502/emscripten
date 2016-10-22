const webpack = require('webpack');
const WrapperPlugin = require('wrapper-webpack-plugin');

const isProduction = process.env.NODE_ENV === 'production';
const outputFileName = `../../src/library_tombopffs${isProduction ? '.min' : ''}.js`;
const libraryVarName = 'tombopffs';

const babel_plugins = [];
const webpack_plugins = [
  new WrapperPlugin({
    header: `
mergeInto(LibraryManager.library, {
  $TOMBOPFFS__deps: ['$FS', '$MEMFS', '$PATH'],
  $TOMBOPFFS: {
    mount: function() {
`,
    footer: `
      // replace TOMBOPFFS
      delete this.mount;
      for (var key in ${libraryVarName}) {
        if (${libraryVarName}.hasOwnProperty(key)) {
          this[key] = ${libraryVarName}[key];
        }
      }
      return TOMBOPFFS.mount(arguments);
    }
  }
});
`
  })
];
if (isProduction) {
  babel_plugins.push('transform-remove-console');
  webpack_plugins.push(
    new webpack.optimize.UglifyJsPlugin({
      compress: { warnings: false }
    })
  );
}

module.exports = {
  entry: ['./tombopffs.js'],
  output: {
    path: __dirname,
    filename: outputFileName,
    library: libraryVarName,
    libraryTarget: 'var'
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        loader: 'babel',
        exclude: /(node_modules|bower_components)/,
        query: {
          presets: ['es2015'],
          plugins: babel_plugins,
        },
      },
    ]
  },
  plugins: webpack_plugins
};
