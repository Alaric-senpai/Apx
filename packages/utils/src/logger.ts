import chalk from 'chalk';
import ora, { type Ora } from 'ora';

const TAG = chalk.bgCyan.black.bold(' APX ');

let silent = false;

export const logger = {
  setSilent(isSilent: boolean): void {
    silent = isSilent;
  },

  isSilent(): boolean {
    return silent;
  },

  banner(): void {
    if (silent) return;
    const art = `
  ${chalk.cyan.bold('   ___    ____  _  __')}
  ${chalk.cyan.bold('  /   |  / __ \\| |/ /')}
  ${chalk.cyan.bold(' / /| | / /_/ /|   / ')}
  ${chalk.cyan.bold('/ ___ |/ ____//   |  ')}
  ${chalk.cyan.bold('/_/  |_/_/    /_/|_| ')}  ${chalk.dim('v0.1.0')}
  ${chalk.dim.italic('Offline-First JavaScript & TypeScript Scaffolding Engine')}
`;
    console.log(art);
  },

  info(msg: string): void {
    if (silent) return;
    console.log(`${TAG} ${chalk.blue('ℹ')} ${msg}`);
  },

  success(msg: string): void {
    if (silent) return;
    console.log(`${TAG} ${chalk.green('✓')} ${msg}`);
  },

  warn(msg: string): void {
    if (silent) return;
    console.log(`${TAG} ${chalk.yellow('⚠')} ${msg}`);
  },

  error(msg: string, suggestion?: string): void {
    if (silent) return;
    console.log(`${TAG} ${chalk.red.bold('✖')} ${chalk.red(msg)}`);
    if (suggestion) {
      console.log(`    ${chalk.dim('Tip:')} ${chalk.yellow(suggestion)}`);
    }
  },

  dim(msg: string): void {
    if (silent) return;
    console.log(chalk.dim(`    ${msg}`));
  },

  step(stepNumber: number, totalSteps: number, title: string): void {
    if (silent) return;
    const badge = chalk.bold.cyan(`[${stepNumber}/${totalSteps}]`);
    console.log(`\n${badge} ${chalk.bold.white(title)}`);
  },

  badge(label: string, color: 'green' | 'blue' | 'yellow' | 'magenta' = 'green'): string {
    const colorMap = {
      green: chalk.bgGreen.black.bold,
      blue: chalk.bgBlue.white.bold,
      yellow: chalk.bgYellow.black.bold,
      magenta: chalk.bgMagenta.white.bold,
    };
    return colorMap[color](` ${label} `);
  },

  card(title: string, lines: string[]): void {
    if (silent) return;
    const width = Math.max(title.length + 4, ...lines.map((l) => l.length + 4), 48);
    const border = '─'.repeat(width);
    
    console.log(`\n  ${chalk.cyan('┌' + border + '┐')}`);
    console.log(`  ${chalk.cyan('│')} ${chalk.bold.white(title.padEnd(width - 2))} ${chalk.cyan('│')}`);
    console.log(`  ${chalk.cyan('├' + border + '┤')}`);
    for (const line of lines) {
      console.log(`  ${chalk.cyan('│')} ${line.padEnd(width - 2)} ${chalk.cyan('│')}`);
    }
    console.log(`  ${chalk.cyan('└' + border + '┘')}\n`);
  },

  spin(msg: string): Ora {
    if (silent) {
      const dummy = ora({ isSilent: true });
      return dummy;
    }
    return ora({
      text: chalk.white(msg),
      prefixText: TAG,
      spinner: 'dots',
    }).start();
  },
};
