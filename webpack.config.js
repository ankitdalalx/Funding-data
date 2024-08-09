const path = require('path');

module.exports = {
  entry: './src/index.js', // Set the entry point to your index.js file
  module: {
    rules: [
      {
        test: /\.js$/, // Adjusted to test for .js files instead of .ts/.tsx files
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader', // Use Babel to transpile JS files if needed
        },
      },
    ],
  },
  resolve: {
    extensions: ['.js'], // Resolve JavaScript files by default
  },
  output: {
    filename: 'bundle.js', // The output bundle name
    path: path.resolve(__dirname, 'dist'), // The output directory
  },
};
