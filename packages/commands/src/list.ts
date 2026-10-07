import chalk from 'chalk';
import { readRegistry } from '@apx/core';
import { logger } from '@apx/utils';
import type { Registry } from '@apx/types';

export async function listCommand(): Promise<Registry> {
  const registry = await readRegistry();
  const entries = Object.entries(registry.frameworks);

  if (entries.length === 0) {
    logger.warn('No framework templates cached yet.');
    logger.card('Get Started with APX', [
      'Cache your first framework for offline use:',
      '  apx setup nextjs      (Next.js App Router)',
      '  apx setup vite-react  (React + Vite)',
      '  apx setup nestjs      (NestJS Backend)',
    ]);
    return registry;
  }

  if (!logger.isSilent()) {
    console.log(`\n${chalk.bgCyan.black.bold(' APX ')} ${chalk.bold.white('Cached Framework Inventory')}\n`);

    for (const [id, data] of entries) {
      if (!data) continue;
      console.log(`  ${chalk.cyan('●')} ${chalk.bold.cyanBright(id.toUpperCase())}`);
      console.log(`    ${chalk.dim('Default Version :')} ${chalk.green.bold(data.default)}`);
      console.log(`    ${chalk.dim('Cached Versions :')} ${chalk.white(data.versions.join(', '))}`);

      const latestCache = data.cached.at(-1);
      if (latestCache) {
        console.log(`    ${chalk.dim('Last Cached     :')} ${chalk.dim(latestCache.cachedAt.slice(0, 10))}`);
        if (latestCache.cachedPackages && latestCache.cachedPackages.length > 0) {
          console.log(`    ${chalk.dim('Addons Hydrated :')} ${chalk.yellow(latestCache.cachedPackages.join(', '))}`);
        }
      }
      console.log();
    }
  }

  return registry;
}
