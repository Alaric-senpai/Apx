import path from 'path';
import fs from 'fs-extra';
import { execa } from 'execa';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { isOnline, getLatestVersion, logger, ApxError } from '@apx/utils';
import {
  readRegistry,
  getFrameworkEntry,
  copyTemplateToProject,
  downloadAndCacheTemplate,
  FRAMEWORK_CONFIGS,
  getFrameworkAddons,
} from '@apx/core';
import type { FrameworkId, CreateOptions } from '@apx/types';
import { setupCommand } from './setup.js';

export async function createCommand(
  framework?: FrameworkId,
  projectName?: string,
  options: CreateOptions = {}
): Promise<{ projectPath: string; version: string; packages: string[] }> {
  let selectedFramework = framework;

  // Peak Interactivity: Prompt for framework if not provided
  if (!selectedFramework) {
    const registry = await readRegistry();
    const cachedEntries = Object.entries(registry.frameworks).filter(
      ([_, data]) => data && data.cached && data.cached.length > 0
    );

    if (cachedEntries.length === 0) {
      if (options.yes) {
        throw new ApxError(
          'CACHE_EMPTY',
          'No offline templates cached in APX.',
          'Run "apx setup <framework>" first.'
        );
      }

      logger.warn('No cached frameworks found in your local APX storage.');
      const { runSetup } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'runSetup',
          message: 'Would you like to setup and cache a framework now?',
          default: true,
        },
      ]);

      if (runSetup) {
        const cached = await setupCommand();
        if (!cached) return { projectPath: '', version: '', packages: [] };
        const updatedReg = await readRegistry();
        const updatedEntries = Object.keys(updatedReg.frameworks);
        selectedFramework = updatedEntries[0] as FrameworkId;
      } else {
        throw new ApxError(
          'CACHE_EMPTY',
          'No offline templates available.',
          'Run "apx setup" to cache a framework.'
        );
      }
    } else {
      const { chosen } = await inquirer.prompt([
        {
          type: 'list',
          name: 'chosen',
          message: 'Select a cached framework for your new project:',
          choices: cachedEntries.map(([id, data]) => ({
            name: `${chalk.bold.cyan(
              (FRAMEWORK_CONFIGS[id as FrameworkId]?.displayName || id).padEnd(24)
            )} ${chalk.green(`(default: v${data!.default})`)} ${chalk.dim(
              `[${data!.versions.length} version(s) cached]`
            )}`,
            value: id as FrameworkId,
          })),
        },
      ]);
      selectedFramework = chosen;
    }
  }

  if (!selectedFramework || !(selectedFramework in FRAMEWORK_CONFIGS)) {
    const supported = Object.keys(FRAMEWORK_CONFIGS).join(', ');
    throw new ApxError(
      'FRAMEWORK_NOT_FOUND',
      `Unknown framework "${selectedFramework}".`,
      `Supported frameworks are: ${supported}`
    );
  }

  // Peak Interactivity: Prompt for project name if not provided
  let targetProjectName = projectName;
  if (!targetProjectName) {
    if (options.yes) {
      targetProjectName = `${selectedFramework}-app`;
    } else {
      const defaultName = `${selectedFramework}-app`;
      const { name } = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Enter project name / destination folder:',
          default: defaultName,
          validate: (input: string) => {
            const trimmed = input.trim();
            if (!trimmed) return 'Project name cannot be empty.';
            if (!/^[a-zA-Z0-9._-]+$/.test(trimmed)) {
              return 'Project name can only contain alphanumeric characters, hyphens, and underscores.';
            }
            if (fs.existsSync(path.resolve(process.cwd(), trimmed))) {
              return `Directory "${trimmed}" already exists in ${process.cwd()}.`;
            }
            return true;
          },
        },
      ]);
      targetProjectName = name.trim();
    }
  }

  const finalProjectName: string = targetProjectName || `${selectedFramework}-app`;

  logger.step(1, 4, 'Reading local template cache');
  const spinner = logger.spin(`Verifying offline cache for ${selectedFramework}...`);

  const entry = await getFrameworkEntry(selectedFramework);
  if (!entry || entry.cached.length === 0) {
    spinner.fail(`No cached template found for ${selectedFramework}.`);
    throw new ApxError(
      'CACHE_EMPTY',
      `No offline template cached for "${selectedFramework}".`,
      `Run "apx setup ${selectedFramework}" first with an internet connection.`
    );
  }

  // Peak Interactivity: Version Selection if multiple cached versions exist
  let targetVersion = options.version ?? entry.default;
  if (!options.version && entry.versions.length > 1 && !options.yes) {
    spinner.stop();
    const { pickedVersion } = await inquirer.prompt([
      {
        type: 'list',
        name: 'pickedVersion',
        message: `Multiple cached versions of ${selectedFramework} available. Select one:`,
        choices: entry.versions.map((v) => ({
          name: `${v}${v === entry.default ? chalk.green(' (default)') : ''}`,
          value: v,
        })),
        default: entry.default,
      },
    ]);
    targetVersion = pickedVersion;
    spinner.start();
  }

  spinner.succeed(`Found cached template: ${selectedFramework}@${targetVersion}`);

  // Step 2: Version verification / update check
  logger.step(2, 4, 'Checking version compatibility');
  if (!options.offline) {
    const netSpinner = logger.spin('Checking for upstream updates...');
    const online = await isOnline(2000);

    if (online) {
      const pkg = FRAMEWORK_CONFIGS[selectedFramework].versionPkg;
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
            const dlSpinner = logger.spin(`Fetching ${selectedFramework}@${latest}...`);
            await downloadAndCacheTemplate(selectedFramework, latest);
            dlSpinner.succeed(`Updated cache with ${selectedFramework}@${latest}`);
            targetVersion = latest;
          }
        }
      } else {
        netSpinner.succeed(`Using current template: ${selectedFramework}@${targetVersion}`);
      }
    } else {
      netSpinner.succeed('Offline mode: Using locally cached version');
    }
  }

  // Step 3: Interactive Package Selection
  logger.step(3, 4, 'Configuring packages and addons');
  let selectedPackages: string[] = options.packages ?? [];

  if (!options.yes && (!options.packages || options.packages.length === 0)) {
    const addons = getFrameworkAddons(selectedFramework);
    if (addons.length > 0) {
      const { packages } = await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'packages',
          message: 'Select optional packages to install into this project:',
          choices: addons.map((addon) => ({
            name: `${chalk.bold.white(addon.name.padEnd(20))} ${chalk.dim(addon.description)}`,
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
  const projectPath = path.resolve(process.cwd(), finalProjectName);

  if (await fs.pathExists(projectPath)) {
    throw new ApxError(
      'PROJECT_EXISTS',
      `Directory "${finalProjectName}" already exists in ${process.cwd()}.`,
      'Choose a different project name or remove the existing directory.'
    );
  }

  const cachedEntry =
    entry.cached.find((c) => c.version === targetVersion) ??
    entry.cached[entry.cached.length - 1];

  const copySpinner = logger.spin(`Copying template files to ./${finalProjectName}...`);
  await copyTemplateToProject(cachedEntry.templatePath, projectPath, finalProjectName, selectedPackages);
  copySpinner.succeed(`Template copied to ./${finalProjectName}`);

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
    `Name       : ${finalProjectName}`,
    `Framework  : ${FRAMEWORK_CONFIGS[selectedFramework].displayName} (${cachedEntry.version})`,
    `Location   : ${projectPath}`,
    `Packages   : ${selectedPackages.length > 0 ? selectedPackages.join(', ') : 'Default'}`,
    '',
    'Next steps:',
    `  cd ${finalProjectName}`,
    '  pnpm dev',
  ]);

  return {
    projectPath,
    version: cachedEntry.version,
    packages: selectedPackages,
  };
}
