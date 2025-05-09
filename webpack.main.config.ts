import type { Configuration } from 'webpack';

import { rules } from './webpack.rules';

export const mainConfig: Configuration = {
  /**
   * This is the main entry point for your application, it's the first file
   * that runs in the main process.
   */

  // entry: {
  //   index: './src/index.ts',
  //   api: './src/api/api.ts',
  // },
  entry: './src/index.ts',
  module: {
    rules,
  },
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.json'],
  },
  watchOptions: {
    // ignored: ['./**'],
  },
  // output: {
  //   filename: '[name].js',
  // },
};
