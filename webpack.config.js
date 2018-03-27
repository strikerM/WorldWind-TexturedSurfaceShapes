const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');

module.exports = {
    entry: [
        './src/index.js'
    ],

    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'main.js'
    },

    mode: 'development',

    devtool: 'source-map',

    watch: true,

    watchOptions: {
        poll: true,
    },

    plugins: [
        new CleanWebpackPlugin(['dist'], {
            root: path.resolve(__dirname),
            verbose: true,
            dry: false,
        }),
        new HtmlWebpackPlugin({
            template: 'src/index.html'
        }),
        new CopyWebpackPlugin([
            {from: 'src/quickLook.jpeg', to: path.resolve('./dist')}
        ]),
    ],
}