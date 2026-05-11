import { isOnline, getLatestVersion, logger } from '@apx/utils';
import {
  getFrameworkEntry,
  downloadAndCacheTemplate,
  FRAMEWORK_CONFIGS,
} from '@apx/core';
import type { FrameworkId, SetupOptions } from '@apx/types';

export async function setupCommand(
  framework: FrameworkId,
  options: SetupOptions = {}
): Promise<void> {
  if (!(framework in FRAMEWORK_CONFIGS)) {
    logger.error(`Unknown framework: ${framework}`);
    logger.dim('Supported: nextjs, vite-react, nestjs, angular, expo');
    return;
  }

  const spinner = logger.spin(`Setting up ${framework}...`);

  try {
    spinner.text = 'Checking internet...';
    const online = await isOnline();

    if (!online) {
      spinner.fail('No internet connection. Required for initial setup.');
      return;
    }

    spinner.text = 'Fetching latest version...';
    const pkg = FRAMEWORK_CONFIGS[framework].versionPkg;
    const latest = await getLatestVersion(pkg);

    if (!latest) {
      spinner.fail('Could not resolve latest version.');
      return;
    }

    const target = options.version ?? latest;

    if (!options.force) {
      const entry = await getFrameworkEntry(framework);
      if (entry?.versions.includes(target)) {
        spinner.succeed(`${framework}@${target} already cached.`);
        logger.dim(`Run: apx init ${framework} <project-name>`);
        return;
      }
    }

    spinner.text = `Downloading ${framework}@${target}...`;
    await downloadAndCacheTemplate(framework, target);

    spinner.succeed(`${framework}@${target} cached successfully!`);
    logger.dim(`Run: apx init ${framework} <project-name>`);
  } catch (err) {
    spinner.fail(`Setup failed: ${(err as Error).message}`);
    process.exit(1);
  }
}
