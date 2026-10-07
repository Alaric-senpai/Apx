import path from 'path';
import fs from 'fs-extra';
import { execa } from 'execa';
import { isOnline, getLatestVersion, logger, ApxError } from '@apx/utils';
import { getFrameworkEntry, FRAMEWORK_CONFIGS } from '@apx/core';
import type { FrameworkId, UpdateOptions } from '@apx/types';
import { setupCommand } from './setup.js';

export async function updateCommand(
  target?: string,
  options: UpdateOptions = {}
): Promise<{ updated: boolean; framework?: string; version?: string }> {
  // Case 1: Updating a cached framework template directly (e.g. `apx update nextjs`)
  if (target && target in FRAMEWORK_CONFIGS) {
    logger.info(`Refreshing offline cache for framework: ${target}`);
    const cached = await setupCommand(target as FrameworkId, {
      force: true,
      version: options.version,
    });
    return {
      updated: true,
      framework: target,
      version: cached?.version,
    };
  }

  // Case 2: Updating an existing project in the current working directory
  const cwd = process.cwd();
  const pkgPath = path.join(cwd, 'package.json');

  if (!(await fs.pathExists(pkgPath))) {
    throw new ApxError(
      'UPDATE_ERROR',
      'No package.json found in current directory.',
      'Run "apx update <framework>" to update a cached template, or run inside a project folder.'
    );
  }

  const pkg = await fs.readJson(pkgPath);
  const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

  // Detect which framework this project is built with
  let detectedFramework: FrameworkId | null = null;
  for (const [id, config] of Object.entries(FRAMEWORK_CONFIGS)) {
    if (config.versionPkg in allDeps) {
      detectedFramework = id as FrameworkId;
      break;
    }
  }

  if (!detectedFramework) {
    throw new ApxError(
      'UPDATE_ERROR',
      'Could not detect an APX-supported framework in this project.',
      'Supported frameworks: ' + Object.keys(FRAMEWORK_CONFIGS).join(', ')
    );
  }

  const config = FRAMEWORK_CONFIGS[detectedFramework];
  const currentVersion = allDeps[config.versionPkg] || 'unknown';
  logger.info(`Detected ${config.displayName} (Current version: ${currentVersion})`);

  let targetVersion: string | null = null;

  if (options.offline) {
    const entry = await getFrameworkEntry(detectedFramework);
    if (!entry || entry.cached.length === 0) {
      throw new ApxError(
        'CACHE_EMPTY',
        `No cached versions of ${detectedFramework} available offline.`,
        `Connect to the internet and run "apx setup ${detectedFramework}"`
      );
    }
    targetVersion = entry.default;
  } else {
    const online = await isOnline(2500);
    if (online) {
      targetVersion = await getLatestVersion(config.versionPkg);
    } else {
      logger.warn('No internet connection. Falling back to local offline cache.');
      const entry = await getFrameworkEntry(detectedFramework);
      targetVersion = entry?.default ?? null;
    }
  }

  if (!targetVersion) {
    throw new ApxError(
      'VERSION_NOT_FOUND',
      `Could not determine target update version for ${detectedFramework}.`
    );
  }

  if (currentVersion === targetVersion || currentVersion === `^${targetVersion}`) {
    logger.success(`Project is already on the target version (${targetVersion}).`);
    return { updated: false, framework: detectedFramework, version: targetVersion };
  }

  logger.step(1, 2, `Updating project dependencies to ${targetVersion}`);
  const spinner = logger.spin(`Updating package.json...`);

  if (!options.dryRun) {
    if (pkg.dependencies && pkg.dependencies[config.versionPkg]) {
      pkg.dependencies[config.versionPkg] = `^${targetVersion}`;
    }
    if (pkg.devDependencies && pkg.devDependencies[config.versionPkg]) {
      pkg.devDependencies[config.versionPkg] = `^${targetVersion}`;
    }
    await fs.writeJson(pkgPath, pkg, { spaces: 2 });
    spinner.succeed(`package.json updated to ${config.versionPkg}@^${targetVersion}`);

    logger.step(2, 2, 'Running pnpm update');
    const updateSpinner = logger.spin(options.offline ? 'Updating packages offline...' : 'Updating packages...');
    const pnpmArgs = ['update'];
    if (options.offline) {
      pnpmArgs.push('--offline');
    }

    try {
      await execa('pnpm', pnpmArgs, { cwd, stdio: 'pipe' });
      updateSpinner.succeed('Dependencies updated successfully!');
    } catch {
      updateSpinner.warn('pnpm update had warnings; please verify dependencies.');
    }
  } else {
    spinner.succeed(`[Dry Run] Would update ${config.versionPkg} to ^${targetVersion}`);
  }

  logger.card('🔄 Update Summary', [
    `Project   : ${pkg.name || path.basename(cwd)}`,
    `Framework : ${config.displayName}`,
    `Previous  : ${currentVersion}`,
    `Updated To: ${targetVersion}`,
  ]);

  return {
    updated: true,
    framework: detectedFramework,
    version: targetVersion,
  };
}
