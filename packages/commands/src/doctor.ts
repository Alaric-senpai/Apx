import chalk from 'chalk';
import { execa } from 'execa';
import fs from 'fs-extra';
import { isOnline } from '@apx/utils';
import { readRegistry, APX_DIR } from '@apx/core';
import type { DoctorResult } from '@apx/types';

async function checkBin(bin: string): Promise<string | null> {
  try {
    const { stdout } = await execa(bin, ['--version']);
    return stdout.trim().split('\n')[0];
  } catch {
    return null;
  }
}

export async function doctorCommand(): Promise<void> {
  const checks: DoctorResult[] = [];

  const node = await checkBin('node');
  checks.push({
    check: 'Node.js',
    status: node ? 'ok' : 'fail',
    message: node ?? 'Not found',
  });

  const pnpm = await checkBin('pnpm');
  checks.push({
    check: 'pnpm',
    status: pnpm ? 'ok' : 'fail',
    message: pnpm ?? 'Install: npm i -g pnpm',
  });

  const apxExists = await fs.pathExists(APX_DIR);
  checks.push({
    check: 'APX directory',
    status: apxExists ? 'ok' : 'warn',
    message: apxExists ? APX_DIR : 'Not initialized yet',
  });

  const reg = await readRegistry();
  const count = Object.keys(reg.frameworks).length;
  checks.push({
    check: 'Registry',
    status: count > 0 ? 'ok' : 'warn',
    message: count > 0 ? `${count} framework(s) cached` : 'Empty',
  });

  const online = await isOnline();
  checks.push({
    check: 'Internet',
    status: online ? 'ok' : 'warn',
    message: online ? 'Connected' : 'Offline — cache only mode',
  });

  console.log(
    `\n${chalk.bold.cyan('APX')} ${chalk.dim('doctor:')}\n`
  );

  for (const r of checks) {
    const icon =
      r.status === 'ok'
        ? chalk.green('✓')
        : r.status === 'warn'
        ? chalk.yellow('⚠')
        : chalk.red('✖');
    console.log(
      `  ${icon}  ${chalk.bold(r.check.padEnd(16))} ${chalk.dim(r.message)}`
    );
  }

  const failed = checks.filter(c => c.status === 'fail');
  console.log();
  if (failed.length > 0) {
    console.log(
      chalk.red(`  ${failed.length} issue(s) require attention.\n`)
    );
  } else {
    console.log(chalk.green('  All systems go.\n'));
  }
}
