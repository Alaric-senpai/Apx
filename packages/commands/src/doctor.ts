import chalk from 'chalk';
import { execa } from 'execa';
import fs from 'fs-extra';
import { isOnline, logger } from '@apx/utils';
import { readRegistry, getApxDir } from '@apx/core';
import type { DoctorResult } from '@apx/types';

async function checkBin(bin: string): Promise<string | null> {
  try {
    const { stdout } = await execa(bin, ['--version']);
    return stdout.trim().split('\n')[0];
  } catch {
    return null;
  }
}

export async function doctorCommand(): Promise<DoctorResult[]> {
  const checks: DoctorResult[] = [];
  const apxDir = getApxDir();

  // 1. Node.js Check
  const node = await checkBin('node');
  checks.push({
    check: 'Node.js Runtime',
    status: node ? 'ok' : 'fail',
    message: node ? `v${node.replace(/^v/, '')}` : 'Not found in PATH',
    suggestion: node ? undefined : 'Install Node.js 18+ from https://nodejs.org',
  });

  // 2. pnpm Check
  const pnpm = await checkBin('pnpm');
  checks.push({
    check: 'pnpm Package Manager',
    status: pnpm ? 'ok' : 'fail',
    message: pnpm ? `v${pnpm}` : 'Not found in PATH',
    suggestion: pnpm ? undefined : 'Install pnpm globally: npm install -g pnpm',
  });

  // 3. APX Directory Check
  const apxExists = await fs.pathExists(apxDir);
  checks.push({
    check: 'APX Storage Root',
    status: apxExists ? 'ok' : 'warn',
    message: apxExists ? apxDir : 'Not initialized yet',
    suggestion: apxExists ? undefined : 'Run "apx init" to initialize the local environment',
  });

  // 4. Registry Integrity Check
  try {
    const reg = await readRegistry();
    const count = Object.keys(reg.frameworks).length;
    checks.push({
      check: 'Local Cache Registry',
      status: count > 0 ? 'ok' : 'warn',
      message: count > 0 ? `${count} framework(s) cached offline` : 'Registry initialized, 0 frameworks cached',
      suggestion: count > 0 ? undefined : 'Run "apx setup <framework>" (e.g. apx setup nextjs)',
    });
  } catch {
    checks.push({
      check: 'Local Cache Registry',
      status: 'fail',
      message: 'Registry file is corrupted or unreadable',
      suggestion: 'Run "apx init" to rebuild your local registry',
    });
  }

  // 5. Internet Connectivity
  const online = await isOnline(2500);
  checks.push({
    check: 'Network Connectivity',
    status: online ? 'ok' : 'warn',
    message: online ? 'Connected to npm registry' : 'Offline mode active (Cache operations enabled)',
  });

  if (!logger.isSilent()) {
    console.log(`\n${chalk.bgCyan.black.bold(' APX ')} ${chalk.bold.white('System Diagnostics')}\n`);

    for (const r of checks) {
      let icon = chalk.green('✓');
      let statusTag = chalk.bgGreen.black.bold(' PASS ');
      if (r.status === 'warn') {
        icon = chalk.yellow('⚠');
        statusTag = chalk.bgYellow.black.bold(' WARN ');
      } else if (r.status === 'fail') {
        icon = chalk.red('✖');
        statusTag = chalk.bgRed.white.bold(' FAIL ');
      }

      console.log(`  ${icon} ${statusTag} ${chalk.bold.white(r.check.padEnd(24))} ${chalk.dim(r.message)}`);
      if (r.suggestion) {
        console.log(`         ${chalk.dim('↳')} ${chalk.yellow(r.suggestion)}`);
      }
    }

    const failed = checks.filter((c) => c.status === 'fail');
    console.log();
    if (failed.length > 0) {
      logger.warn(`${failed.length} system requirement(s) need your attention.`);
    } else {
      logger.success('All core systems operational for offline development.');
    }
    console.log();
  }

  return checks;
}
