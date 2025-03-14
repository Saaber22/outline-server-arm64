/* eslint-disable @typescript-eslint/no-var-requires */
// Copyright 2020 The Outline Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

const OUTPUT_BASE = path.resolve(__dirname, '../../build/server_manager/web_app/static');

const GENERATE_CSS_RTL_LOADER = path.resolve(__dirname, 'css-in-js-rtl-loader.js');

const CIRCLE_FLAGS_PATH = path.dirname(require.resolve('circle-flags/package.json'));

exports.makeConfig = (options) => {
  return {
    mode: options.defaultMode,
    entry: [
      require.resolve('@webcomponents/webcomponentsjs/webcomponents-loader.js'),
      path.resolve(__dirname, './web_app/ui_components/style.css'),
      options.main,
    ],
    target: options.target,
    devtool: 'inline-source-map',
    // Run the dev server with `npm run webpack-dev-server --workspace=outline-manager --open`
    devServer: {
      client: {
        overlay: true,
      },
    },
    output: {path: OUTPUT_BASE, filename: 'main.js'},
    module: {
      rules: [
        {
          test: /\.ts(x)?$/,
          exclude: /node_modules/,
          use: ['ts-loader', GENERATE_CSS_RTL_LOADER],
        },
        {
          test: /\.js$/,
          exclude: /node_modules/,
          loader: GENERATE_CSS_RTL_LOADER,
        },
        {
          test: /\.css?$/,
          use: ['style-loader', 'css-loader'],
        },
      ],
    },
    resolve: {extensions: ['.tsx', '.ts', '.js']},
    plugins: [
      new webpack.DefinePlugin({
        'outline.gcpAuthEnabled': JSON.stringify(process.env.GCP_AUTH_ENABLED !== 'false'),
        // Hack to protect against @sentry/electron not having process.type defined.
        'process.type': JSON.stringify('renderer'),
        // Statically link the Roboto font, rather than link to fonts.googleapis.com
        'window.polymerSkipLoadingFontRoboto': JSON.stringify(true),
      }),
      // @sentry/electron depends on electron code, even though it's never activated
      // in the browser. Webpack still tries to build it, but fails with missing APIs.
      // The IgnorePlugin prevents the compilation of the electron dependency.
      new webpack.IgnorePlugin({resourceRegExp: /^electron$/, contextRegExp: /@sentry\/electron/}),
      new CopyPlugin(
        [
          {from: 'index.html', to: '.'},
          {from: `${CIRCLE_FLAGS_PATH}/flags`, to: 'images/flags'},
          {from: 'images', to: 'images'}, // Overwrite any colliding flags.
          {from: 'messages', to: 'messages'},
        ],
        {context: __dirname}
      ),
      new HtmlWebpackPlugin({
        template: options.template || path.resolve(__dirname, './index.html'),
      }),
    ],
  };
};
