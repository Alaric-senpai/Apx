import { isOnline, getLatestVersion, logger, ApxError } from '@apx/utils';
import {
  getFrameworkEntry,
  downloadAndCacheTemplate,
  FRAMEWORK_CONFIGS,
  getFrameworkAddons,
} from '@apx/core';
import type { FrameworkId, SetupOptions, CachedVersion } from '@apx/types';
import { execa } from 'execa';
import inquirer from 'inquirer';
import chalk from 'chalk';

export async function setupCommand(
  framework?: FrameworkId,
  options: SetupOptions = {}
): Promise<CachedVersion | null> {
  let targetFramework = framework;

  // Peak Interactivity: Prompt for framework if not provided
  if (!targetFramework) {
    if (options.yes) {
      targetFramework = 'nextjs';
    } else {
      const { chosen } = await inquirer.prompt([
        {
          type: 'list',
          name: 'chosen',
          message: 'Select a framework to setup and cache for offline development:',
          choices: Object.entries(FRAMEWORK_CONFIGS).map(([id, cfg]) => ({
            name: `${chalk.bold.cyan(cfg.displayName.padEnd(26))} ${chalk.dim(cfg.description)}`,
            value: id as FrameworkId,
          })),
        },
      ]);
      targetFramework = chosen;
    }
  }

  if (!targetFramework || !(targetFramework in FRAMEWORK_CONFIGS)) {
    const supported = Object.keys(FRAMEWORK_CONFIGS).join(', ');
    throw new ApxError(
      'FRAMEWORK_NOT_FOUND',
      `Unsupported framework "${targetFramework}".`,
      `Supported frameworks are: ${supported}`
    );
  }

  logger.step(1, 3, 'Verifying environment prerequisites');
  const spinner = logger.spin('Checking pnpm package manager...');

  try {
    await execa('pnpm', ['--version']);
    spinner.succeed('pnpm detected in system PATH');
  } catch {
    spinner.fail('pnpm is not installed.');
    throw new ApxError(
      'PREREQUISITE_MISSING',
      'pnpm is required for APX offline operations.',
      'Install it globally: npm install -g pnpm'
    );
  }

  const netSpinner = logger.spin('Verifying internet connectivity...');
  const online = await isOnline();
  if (!online) {
    netSpinner.fail('Internet connection required for initial setup.');
    throw new ApxError(
      'NETWORK_REQUIRED',
      'Cannot download framework templates without an active network connection.',
      'Connect to the internet and re-run "apx setup ' + targetFramework + '"'
    );
  }
  netSpinner.succeed('Connected to registry.npmjs.org');

  logger.step(2, 3, `Resolving ${FRAMEWORK_CONFIGS[targetFramework].displayName} version`);
  const versionSpinner = logger.spin('Resolving target version...');
  const pkg = FRAMEWORK_CONFIGS[targetFramework].versionPkg;
  const latest = await getLatestVersion(pkg);

  if (!latest && !options.version) {
    versionSpinner.fail('Could not resolve latest version from npm registry.');
    throw new ApxError(
      'VERSION_NOT_FOUND',
      `Unable to fetch the latest release version for package "${pkg}".`
    );
  }

  const targetVersion = options.version ?? latest!;
  versionSpinner.succeed(`Target version identified: ${targetVersion}`);

  if (!options.force) {
    const entry = await getFrameworkEntry(targetFramework);
    if (entry?.versions.includes(targetVersion)) {
      logger.info(`${targetFramework}@${targetVersion} is already cached locally.`);
      logger.card('⚡ Framework Ready Offline', [
        `Framework : ${targetFramework}@${targetVersion}`,
        `Action    : Run "apx create ${targetFramework} <project-name>"`,
        'Tip       : Use --force if you want to re-download the template',
      ]);
      return entry.cached.find((c) => c.version === targetVersion) ?? null;
    }
  }

  // Peak Interactivity: Ask if user wants to pre-cache any addons
  let packagesToCache = options.packages ?? [];
  if (!options.yes && !options.packages && !framework) {
    const addons = getFrameworkAddons(targetFramework);
    if (addons.length > 0) {
      const { selectedAddons } = await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'selectedAddons',
          message: 'Select optional packages to pre-cache into ~/.pnpm-store:',
          choices: addons.map((a) => ({
            name: `${chalk.bold(a.name.padEnd(20))} ${chalk.dim(a.description)}`,
            value: a.id,
            checked: false,
          })),
        },
      ]);
      packagesToCache = selectedAddons;
    }
  }

  logger.step(3, 3, 'Scaffolding template & hydrating pnpm store');
  const downloadSpinner = logger.spin(
    `Downloading ${targetFramework}@${targetVersion} & hydrating ~/.pnpm-store...`
  );

  try {
    const cached = await downloadAndCacheTemplate(targetFramework, targetVersion, packagesToCache);
    downloadSpinner.succeed(`Successfully cached ${targetFramework}@${targetVersion}!`);

    logger.card('🎉 Offline Setup Complete', [
      `Framework       : ${FRAMEWORK_CONFIGS[targetFramework].displayName} (${targetVersion})`,
      `Template Path   : ${cached.templatePath}`,
      `Hydrated Store  : Dependencies cached in ~/.pnpm-store`,
      `Pre-cached      : ${packagesToCache.length > 0 ? packagesToCache.join(', ') : 'Standard template only'}`,
      `Instant Create  : apx create ${targetFramework} my-app`,
    ]);

    return cached;
  } catch (err) {
    downloadSpinner.fail(`Setup failed: ${(err as Error).message}`);
    throw new ApxError('TEMPLATE_ERROR', `Failed to cache template: ${(err as Error).message}`);
  }
}
