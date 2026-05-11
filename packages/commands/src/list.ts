import chalk from 'chalk';
import { readRegistry } from '@apx/core';
import { logger } from '@apx/utils';

export async function listCommand(): Promise<void> {
  const registry = await readRegistry();
  const entries = Object.entries(registry.frameworks);

  if (entries.length === 0) {
    logger.warn('No frameworks cached yet.');
    logger.dim('Run: apx setup nextjs');
    return;
  }

  console.log(
    `\n${chalk.bold.cyan('APX')} ${chalk.dim('local cache:')}\n`
  );

  for (const [id, data] of entries) {
    console.log(`  ${chalk.green('●')} ${chalk.bold(id)}`);
    console.log(
      `    ${chalk.dim('default:')}  ${chalk.yellow(data.default)}`
    );
    console.log(
      `    ${chalk.dim('versions:')} ${data.versions.join(', ')}`
    );
    const latest = data.cached.at(-1);
    if (latest) {
      console.log(
        `    ${chalk.dim('cached:')}   ${latest.cachedAt.slice(0, 10)}`
      );
    }
    console.log();
  }
}
