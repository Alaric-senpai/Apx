import chalk from 'chalk';
import ora, { type Ora } from 'ora';

const tag = chalk.bold.cyan('APX');

export const logger = {
  info: (msg: string) =>
    console.log(`${tag} ${chalk.blue('ℹ')} ${msg}`),
  success: (msg: string) =>
    console.log(`${tag} ${chalk.green('✓')} ${msg}`),
  warn: (msg: string) =>
    console.log(`${tag} ${chalk.yellow('⚠')} ${msg}`),
  error: (msg: string) =>
    console.log(`${tag} ${chalk.red('✖')} ${msg}`),
  dim: (msg: string) =>
    console.log(chalk.dim(`    ${msg}`)),
  spin: (msg: string): Ora =>
    ora({ text: msg, prefixText: tag }).start(),
};
