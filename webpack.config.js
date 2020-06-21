'use strict';

const webpack = require('webpack');
const path = require('path');

// Plugins
const WebpackAssetsManifest = require('webpack-assets-manifest');
// const ServiceWorkerWebpackPlugin = require('serviceworker-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: './scripts/index.js',
  // devtool: 'source-map',
  target: 'web',
  output: {
    path: path.resolve(__dirname, 'assets/scripts'),
    filename: 'index.min.js',
    chunkFilename: '[id]-[chunkhash].js'
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify('production'),
        APP_ENV: JSON.stringify('browser')
      }
    }),
    new WebpackAssetsManifest({
      publicPath: '/scripts',
      integrity: true,
      output: '../assets/manifest.json',
      merge: true
    }),
    /* new ServiceWorkerWebpackPlugin({
      entry: path.join(__dirname, 'scripts/worker.js'),
      filename: '../worker.js'
    }) */
  ]
};
