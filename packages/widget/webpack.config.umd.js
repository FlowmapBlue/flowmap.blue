const resolve = require('path').resolve;
const join = require('path').join;
const HtmlWebpackPlugin = require('html-webpack-plugin');

const SRC_DIR = resolve(__dirname, './src');
const OUTPUT_DIR = resolve(__dirname, './dist-umd');

module.exports = (env, argv) => ({
  entry: {
    flowmapBlue: join(SRC_DIR, 'index-standalone.tsx'),
  },

  optimization: {
    minimize: argv.mode === 'production',
  },

  stats: {
    // Silence warnings about big bundles
    warnings: false,
  },

  output: {
    path: OUTPUT_DIR,
    filename: 'flowmap-blue.min.js',
    globalObject: 'this',
    library: '[name]',
    libraryTarget: 'umd',
  },

  // let's put everything in
  externals: {
    // react: {
    //   root: 'React',
    //   commonjs2: 'react',
    //   commonjs: 'react',
    //   amd: 'react',
    //   umd: 'react'
    // },
    // 'react-dom': {
    //   root: 'ReactDOM',
    //   commonjs2: 'react-dom',
    //   commonjs: 'react-dom',
    //   amd: 'react-dom',
    //   umd: 'react-dom'
    // },
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        exclude: /node_modules/,
        options: {
          // transpileOnly: true,
          configFile: 'tsconfig.build.esm.json',
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[ext]',
              // outputPath: 'assets/'
            },
          },
        ],
      },
    ],
  },

  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },

  node: {
    fs: 'empty',
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: resolve(__dirname, './index-standalone.template.html'),
    }),
  ],
});
