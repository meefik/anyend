const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const { execSync } = require('child_process');
const pack = require('./package.json');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const NodemonPlugin = require('nodemon-webpack-plugin');

module.exports = function (env, argv) {
  const DEV_MODE = argv.mode !== 'production';
  const DIST_DIR = path.join(__dirname, 'dist');
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true });
  }
  const COMMIT_HASH = execSync('git rev-parse --short HEAD').toString().slice(0, 7);
  return [{
    mode: DEV_MODE ? 'development' : 'production',
    devtool: DEV_MODE ? 'source-map' : false,
    watch: DEV_MODE,
    watchOptions: {
      ignored: ['node_modules/**']
    },
    stats: DEV_MODE ? 'errors-only' : { modules: false },
    target: 'node',
    context: path.join(__dirname, 'src/backend'),
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
        path.join(__dirname, 'src/backend'),
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
        VERSION: `'${pack.version}-${COMMIT_HASH}'`,
        APPNAME: `'${pack.name}'`,
        PRODUCTION: !DEV_MODE
      }),
      new NodemonPlugin({
        script: path.join(DIST_DIR, 'server.js'),
        watch: path.join(DIST_DIR, 'server.js'),
        verbose: false
      })
    ]
  }, {
    mode: DEV_MODE ? 'development' : 'production',
    devtool: DEV_MODE ? 'source-map' : false,
    watch: DEV_MODE,
    watchOptions: {
      ignored: ['node_modules/**']
    },
    stats: DEV_MODE ? 'errors-only' : { modules: false },
    context: path.join(__dirname, 'src/frontend'),
    entry: {
      app: 'app.js'
    },
    output: {
      path: path.join(DIST_DIR, 'public'),
      filename: '[name]-[fullhash:7].js',
      assetModuleFilename: 'assets/[hash][ext]'
    },
    performance: {
      hints: false
    },
    module: {
      rules: [{
        test: /\.m?js(\?|$)/,
        exclude: [/node_modules/],
        use: [{
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }]
      }, {
        test: /\.css(\?|$)/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              sourceMap: DEV_MODE
            }
          }, {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [
                  ['autoprefixer'],
                  ['postcss-preset-env', { stage: 3 }],
                  ['cssnano', {
                    preset: [
                      'default',
                      { discardComments: { removeAll: true } }
                    ]
                  }]
                ]
              }
            }
          }
        ]
      }, {
        test: /\.(png|jpe?g|gif|svg)(\?|$)/,
        type: 'asset/inline'
      }, {
        test: /\.(woff2?|ttf|eot)(\?|$)/,
        type: 'asset/resource'
      }]
    },
    resolve: {
      extensions: ['.mjs', '.js'],
      // conditionNames: ['require', 'node'],
      modules: [
        path.join(__dirname, 'src/frontend'),
        path.join(__dirname, 'node_modules')
      ]
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
      ],
      splitChunks: {
        cacheGroups: {
          chunks: 'all'
        }
      }
    },
    plugins: [
      new webpack.DefinePlugin({
        VERSION: `'${pack.version}-${COMMIT_HASH}'`,
        APPNAME: `'${pack.name}'`,
        DEBUG: DEV_MODE
      }),
      new MiniCssExtractPlugin({
        filename: '[name]-[fullhash:7].css'
      }),
      new HtmlWebpackPlugin({
        filename: 'index.html',
        title: '',
        favicon: path.join(__dirname, 'src/frontend/assets/favicon.ico'),
        inject: 'head',
        minify: {
          removeComments: true,
          collapseWhitespace: true
        },
        meta: {
          'mobile-web-app-capable': 'yes',
          'apple-mobile-web-app-capable': 'yes'
        }
      })
    ]
  }];
};
