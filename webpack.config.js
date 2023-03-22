const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const pack = require('./package.json');
const TerserPlugin = require('terser-webpack-plugin');
const NodemonPlugin = require('nodemon-webpack-plugin');

module.exports = function (env, argv) {
  const DEV_MODE = argv.mode !== 'production';
  const DIST_DIR = path.join(__dirname, 'dist');
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true });
  }
  return {
    mode: DEV_MODE ? 'development' : 'production',
    devtool: DEV_MODE ? 'source-map' : false,
    watch: DEV_MODE,
    watchOptions: {
      ignored: ['node_modules/**']
    },
    stats: DEV_MODE ? 'errors-only' : { modules: false },
    target: 'node',
    context: path.join(__dirname, 'src'),
    externals: fs.readdirSync(path.join(__dirname, 'node_modules')).reduce((res, mod) => {
      res[mod] = 'commonjs ' + mod;
      return res;
    }, {}),
    entry: {
      server: 'server.mjs'
    },
    output: {
      path: DIST_DIR,
      filename: '[name].js'
    },
    resolve: {
      modules: [
        path.join(__dirname, 'src'),
        path.join(__dirname, 'node_modules')
      ]
    },
    performance: {
      hints: false
    },
    module: {
      rules: [{
        test: /\.js(\?|$)/,
        exclude: [/node_modules/],
        use: [{
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
            targets: {
              node: 'current'
            }
          }
        }]
      }]
    },
    optimization: {
      minimize: !DEV_MODE,
      minimizer: [
        new TerserPlugin({
          extractComments: false,
          terserOptions: {
            output: {
              comments: false
            }
          }
        })
      ]
    },
    plugins: [
      new webpack.DefinePlugin({
        VERSION: `'${pack.version}'`,
        APPNAME: `'${pack.name}'`,
        PRODUCTION: !DEV_MODE
      }),
      new NodemonPlugin({
        script: path.join(DIST_DIR, 'server.js'),
        watch: path.join(DIST_DIR, 'server.js'),
        verbose: false
      })
    ]
  };
};
