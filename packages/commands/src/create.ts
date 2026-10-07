import path from 'path';
import fs from 'fs-extra';
import { execa } from 'execa';
import inquirer from 'inquirer';
import { isOnline, getLatestVersion, logger, ApxError } from '@apx/utils';
import {
  getFrameworkEntry,
  copyTemplateToProject,
  downloadAndCacheTemplate,
  FRAMEWORK_CONFIGS,
  getFrameworkAddons,
} from '@apx/core';
import type { FrameworkId, CreateOptions } from '@apx/types';

export async function createCommand(
  framework: FrameworkId,
  projectName: string,
  options: CreateOptions = {}
): Promise<{ projectPath: string; version: string; packages: string[] }> {
  if (!(framework in FRAMEWORK_CONFIGS)) {
    const supported = Object.keys(FRAMEWORK_CONFIGS).join(', ');
    throw new ApxError(
      'FRAMEWORK_NOT_FOUND',
      `Unknown framework "${framework}".`,
      `Supported frameworks are: ${supported}`
    );
  }

  logger.step(1, 4, 'Reading local template cache');
  const spinner = logger.spin(`Verifying offline cache for ${framework}...`);

  const entry = await getFrameworkEntry(framework);
  if (!entry || entry.cached.length === 0) {
    spinner.fail(`No cached template found for ${framework}.`);
    throw new ApxError(
      'CACHE_EMPTY',
      `No offline template cached for "${framework}".`,
      `Run "apx setup ${framework}" first with an internet connection.`
    );
  }

  let targetVersion = options.version ?? entry.default;
  spinner.succeed(`Found cached template: ${framework}@${targetVersion}`);

  // Step 2: Version verification / update check
  logger.step(2, 4, 'Checking version compatibility');
  if (!options.offline) {
    const netSpinner = logger.spin('Checking for upstream updates...');
    const online = await isOnline(2000);

    if (online) {
      const pkg = FRAMEWORK_CONFIGS[framework].versionPkg;
      const latest = await getLatestVersion(pkg);

      if (latest && latest !== targetVersion) {
        netSpinner.stop();
        logger.warn(`Newer upstream version available: ${latest} (cached: ${targetVersion})`);

        if (!options.yes) {
          const { choice } = await inquirer.prompt([
            {
              type: 'list',
              name: 'choice',
              message: 'How would you like to proceed?',
              choices: [
                {
                  name: `Use cached (${targetVersion}) — Instant & Offline ⚡`,
                  value: 'cached',
                },
                {
                  name: `Download latest (${latest}) — Online update`,
                  value: 'latest',
                },
                { name: 'Cancel operation', value: 'cancel' },
              ],
            },
          ]);

          if (choice === 'cancel') {
            logger.info('Project creation cancelled.');
            return { projectPath: '', version: targetVersion, packages: [] };
          }

          if (choice === 'latest') {
            const dlSpinner = logger.spin(`Fetching ${framework}@${latest}...`);
            await downloadAndCacheTemplate(framework, latest);
            dlSpinner.succeed(`Updated cache with ${framework}@${latest}`);
            targetVersion = latest;
          }
        }
      } else {
        netSpinner.succeed(`Using current template: ${framework}@${targetVersion}`);
      }
    } else {
      netSpinner.succeed('Offline mode: Using locally cached version');
    }
  }

  // Step 3: Interactive Package Selection
  logger.step(3, 4, 'Configuring packages and addons');
  let selectedPackages: string[] = options.packages ?? [];

  if (!options.yes && (!options.packages || options.packages.length === 0)) {
    const addons = getFrameworkAddons(framework);
    if (addons.length > 0) {
      const { packages } = await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'packages',
          message: 'Select optional packages to install into this project:',
          choices: addons.map((addon) => ({
            name: `${addon.name.padEnd(20)} ${addon.description}`,
            value: addon.id,
            checked: false,
          })),
        },
      ]);
      selectedPackages = packages;
    }
  }

  if (selectedPackages.length > 0) {
    logger.info(`Selected packages: ${selectedPackages.join(', ')}`);
  } else {
    logger.dim('No extra packages selected. Using standard scaffold.');
  }

  // Step 4: Project Generation & Offline Install
  logger.step(4, 4, 'Generating project & linking offline packages');
  const projectPath = path.resolve(process.cwd(), projectName);

  if (await fs.pathExists(projectPath)) {
    throw new ApxError(
      'PROJECT_EXISTS',
      `Directory "${projectName}" already exists in ${process.cwd()}.`,
      'Choose a different project name or remove the existing directory.'
    );
  }

  const cachedEntry =
    entry.cached.find((c) => c.version === targetVersion) ??
    entry.cached[entry.cached.length - 1];

  const copySpinner = logger.spin(`Copying template files to ./${projectName}...`);
  await copyTemplateToProject(cachedEntry.templatePath, projectPath, projectName, selectedPackages);
  copySpinner.succeed(`Template copied to ./${projectName}`);

  if (!options.skipInstall) {
    const installSpinner = logger.spin('Linking packages from ~/.pnpm-store (offline)...');
    try {
      await execa('pnpm', ['install', '--offline'], {
        cwd: projectPath,
        stdio: 'pipe',
      });
      installSpinner.succeed('Packages linked offline via pnpm store!');
    } catch {
      installSpinner.warn('Offline install encountered missing local tarballs. Falling back to pnpm install...');
      await execa('pnpm', ['install'], {
        cwd: projectPath,
        stdio: 'pipe',
      });
      installSpinner.succeed('Dependencies installed successfully.');
    }
  }

  logger.card('🚀 Project Ready for Development', [
    `Name       : ${projectName}`,
    `Framework  : ${FRAMEWORK_CONFIGS[framework].displayName} (${cachedEntry.version})`,
    `Location   : ${projectPath}`,
    `Packages   : ${selectedPackages.length > 0 ? selectedPackages.join(', ') : 'Default'}`,
    '',
    'Next steps:',
    `  cd ${projectName}`,
    '  pnpm dev',
  ]);

  return {
    projectPath,
    version: cachedEntry.version,
    packages: selectedPackages,
  };
}
