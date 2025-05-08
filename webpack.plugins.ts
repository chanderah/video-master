/* eslint-disable @typescript-eslint/no-var-requires */
import type IForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import type ICopyPlugin from 'copy-webpack-plugin';

const ForkTsCheckerWebpackPlugin: typeof IForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const CopyPlugin: typeof ICopyPlugin = require('copy-webpack-plugin');

export const plugins = [
  new ForkTsCheckerWebpackPlugin({
    logger: 'webpack-infrastructure',
  }),
  new CopyPlugin({
    patterns: [{ from: 'public', to: '.' }],
  }),
];
