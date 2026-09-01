import path from 'path';
import fs from 'fs-extra';
import { execa } from 'execa';
import inquirer from 'inquirer';
import { isOnline, getLatestVersion, logger } from '@apx/utils';
import {
  getFrameworkEntry,
  copyTemplateToProject,
  downloadAndCacheTemplate,
  FRAMEWORK_CONFIGS,
} from '@apx/core';
import type { FrameworkId, InitOptions } from '@apx/types';

export async function createCommand(
  framework: FrameworkId,
  projectName: string,
  options: InitOptions = {}
): Promise<void> {
  if (!(framework in FRAMEWORK_CONFIGS)) {
    logger.error(`Unknown framework: ${framework}`);
    logger.dim('Supported: nextjs, vite-react, nestjs, angular, expo');
    return;
  }

  const spinner = logger.spin('Reading cache...');

  try {
    const entry = await getFrameworkEntry(framework);

    if (!entry || entry.cached.length === 0) {
      spinner.fail(`No cached version found for ${framework}.`);
      logger.info(`Run: apx setup ${framework}`);
      return;
    }

    let targetVersion = options.version ?? entry.default;

    if (!options.offline) {
      spinner.text = 'Checking for updates...';
      const online = await isOnline();

      if (online) {
        const pkg = FRAMEWORK_CONFIGS[framework].versionPkg;
        const latest = await getLatestVersion(pkg);

        if (latest && latest !== targetVersion) {
          spinner.stop();
          logger.warn('Newer version available:');
          logger.dim(`Cached : ${targetVersion}`);
          logger.dim(`Latest : ${latest}`);

          const { choice } = await inquirer.prompt([
            {
              type: 'list',
              name: 'choice',
              message: 'How would you like to proceed?',
              choices: [
                {
                  name: `Use cached (${targetVersion}) — instant ⚡`,
                  value: 'cached',
                },
                {
                  name: `Download latest (${latest}) — requires internet`,
                  value: 'latest',
                },
                { name: 'Cancel', value: 'cancel' },
              ],
            },
          ]);

          if (choice === 'cancel') {
            logger.info('Cancelled.');
            return;
          }

          if (choice === 'latest') {
            const s = logger.spin(`Downloading ${framework}@${latest}...`);
            await downloadAndCacheTemplate(framework, latest);
            s.succeed(`${framework}@${latest} cached.`);
            targetVersion = latest;
          }
        }
      }
    } else {
      spinner.text = 'Operating in offline mode...';
      const cachedVersion = entry.cached.find(c => c.version === targetVersion);
      if (!cachedVersion) {
        spinner.fail(`${framework}@${targetVersion} not found in cache.`);
        logger.info(`Available versions: ${entry.versions.join(', ')}`);
        return;
      }
    }

    const projectPath = path.resolve(process.cwd(), projectName);

    if (await fs.pathExists(projectPath)) {
      spinner.fail(`Directory "${projectName}" already exists.`);
      return;
    }

    const cachedEntry =
      entry.cached.find(c => c.version === targetVersion) ??
      entry.cached[entry.cached.length - 1];

    spinner.text = 'Copying template...';
    await copyTemplateToProject(
      cachedEntry.templatePath,
      projectPath,
      projectName
    );

    spinner.text = 'Installing dependencies (offline)...';
    await execa('pnpm', ['install', '--offline'], {
      cwd: projectPath,
      stdio: 'pipe',
    });

    spinner.succeed(
      `${projectName} created with ${framework}@${cachedEntry.version}`
    );
    logger.dim(`cd ${projectName} && pnpm dev`);
  } catch (err) {
    spinner.fail(`Create failed: ${(err as Error).message}`);
    process.exit(1);
  }
}
