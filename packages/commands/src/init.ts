import { logger, ApxError } from '@apx/utils';
import { ensureApxDirs, getApxDir } from '@apx/core';
import { doctorCommand } from './doctor.js';

export async function initCommand(): Promise<void> {
  logger.banner();
  const spinner = logger.spin('Initializing APX environment...');

  try {
    await ensureApxDirs();
    spinner.succeed('APX local environment initialized!');
    logger.dim(`Storage root: ${getApxDir()}`);

    logger.info('Executing system diagnostic checks...');
    await doctorCommand();

    logger.card('🚀 APX Ready for Offline Development', [
      '1. Cache your preferred framework:  apx setup nextjs',
      '2. Create an offline project:        apx create nextjs my-app',
      '3. View cached framework inventory: apx list',
      '4. Verify offline system health:     apx doctor',
    ]);
  } catch (err) {
    spinner.fail(`Init failed: ${(err as Error).message}`);
    throw new ApxError('TEMPLATE_ERROR', `Failed to initialize APX: ${(err as Error).message}`);
  }
}
