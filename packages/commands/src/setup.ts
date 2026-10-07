import { isOnline, getLatestVersion, logger, ApxError } from '@apx/utils';
import {
  getFrameworkEntry,
  downloadAndCacheTemplate,
  FRAMEWORK_CONFIGS,
  getFrameworkAddons,
} from '@apx/core';
import type { FrameworkId, SetupOptions, CachedVersion } from '@apx/types';
import { execa } from 'execa';

export async function setupCommand(
  framework: FrameworkId,
  options: SetupOptions = {}
): Promise<CachedVersion | null> {
  if (!(framework in FRAMEWORK_CONFIGS)) {
    const supported = Object.keys(FRAMEWORK_CONFIGS).join(', ');
    throw new ApxError(
      'FRAMEWORK_NOT_FOUND',
      `Unsupported framework "${framework}".`,
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
      'Connect to the internet and re-run "apx setup ' + framework + '"'
    );
  }
  netSpinner.succeed('Connected to registry.npmjs.org');

  logger.step(2, 3, `Resolving ${FRAMEWORK_CONFIGS[framework].displayName} version`);
  const versionSpinner = logger.spin('Resolving target version...');
  const pkg = FRAMEWORK_CONFIGS[framework].versionPkg;
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
    const entry = await getFrameworkEntry(framework);
    if (entry?.versions.includes(targetVersion)) {
      logger.info(`${framework}@${targetVersion} is already cached locally.`);
      logger.card('⚡ Framework Ready Offline', [
        `Framework : ${framework}@${targetVersion}`,
        `Action    : Run "apx create ${framework} <project-name>"`,
        'Tip       : Use --force if you want to re-download the template',
      ]);
      return entry.cached.find((c) => c.version === targetVersion) ?? null;
    }
  }

  logger.step(3, 3, 'Scaffolding template & hydrating pnpm store');
  const downloadSpinner = logger.spin(
    `Downloading ${framework}@${targetVersion} & hydrating ~/.pnpm-store...`
  );

  try {
    const packagesToCache = options.packages ?? [];

    const cached = await downloadAndCacheTemplate(framework, targetVersion, packagesToCache);
    downloadSpinner.succeed(`Successfully cached ${framework}@${targetVersion}!`);

    logger.card('🎉 Offline Setup Complete', [
      `Framework       : ${FRAMEWORK_CONFIGS[framework].displayName} (${targetVersion})`,
      `Template Path   : ${cached.templatePath}`,
      `Hydrated Store  : Dependencies cached in ~/.pnpm-store`,
      `Instant Create  : apx create ${framework} my-app`,
    ]);

    return cached;
  } catch (err) {
    downloadSpinner.fail(`Setup failed: ${(err as Error).message}`);
    throw new ApxError('TEMPLATE_ERROR', `Failed to cache template: ${(err as Error).message}`);
  }
}
