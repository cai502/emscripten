const webpack = require('webpack');
const WrapperPlugin = require('wrapper-webpack-plugin');

const isProduction = process.env.NODE_ENV === 'production';
const outputFileName = `../src/library_tombopffs${isProduction ? '.min' : ''}.js`;

const babel_plugins = [];
const webpack_plugins = [
  new WrapperPlugin({
    header: '',
    footer: 'mergeInto(LibraryManager.library, tombopffs);'
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
    library: 'tombopffs',
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
