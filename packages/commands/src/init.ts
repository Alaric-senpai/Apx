import { logger } from '@apx/utils';
import {
  ensureApxDirs,
} from '@apx/core';
import { doctorCommand } from './doctor.js';

export async function initCommand(): Promise<void> {
  const spinner = logger.spin('Initializing APX...');

  try {
    await ensureApxDirs();

    spinner.succeed('APX initialized successfully!');
    logger.info('Running system checks...');
    logger.dim('');

    await doctorCommand();

    logger.info('Next steps:');
    logger.dim('  1. Run: apx setup nextjs');
    logger.dim('  2. Run: apx create nextjs my-app');
    logger.dim('');
    logger.dim('Learn more: apx doctor');
  } catch (err) {
    spinner.fail(`Init failed: ${(err as Error).message}`);
    process.exit(1);
  }
}
