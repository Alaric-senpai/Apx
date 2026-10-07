#!/usr/bin/env node
import { Command } from 'commander';
import {
  setupCommand,
  initCommand,
  listCommand,
  doctorCommand,
  createCommand,
  updateCommand,
} from '@apx/commands';
import { logger, ApxError } from '@apx/utils';
import type { FrameworkId } from '@apx/types';

export function createProgram(): Command {
  const program = new Command();

  program
    .name('apx')
    .description('Offline-First Scaffolding & Project Management Engine for JS/TS')
    .version('0.1.0')
    .addHelpText('before', () => {
      logger.banner();
      return '';
    });

  // Setup command
  program
    .command('setup <framework>')
    .description('Download and cache a framework template & hydrate pnpm store')
    .option('-v, --version <version>', 'Specific framework version to cache')
    .option('-f, --force', 'Force re-download even if already cached')
    .option('-p, --packages <packages...>', 'Additional packages to pre-cache offline')
    .action(async (fw: string, opts) => {
      try {
        await setupCommand(fw as FrameworkId, {
          version: opts.version,
          force: opts.force,
          packages: opts.packages,
        });
      } catch (err) {
        handleCliError(err);
      }
    });

  // Create command
  program
    .command('create <framework> <project-name>')
    .description('Create a new project from locally cached template (works offline ✈️)')
    .option('-v, --version <version>', 'Specific cached version to use')
    .option('--offline', 'Force offline mode (skip online update checks)')
    .option('-y, --yes', 'Skip interactive questions and use defaults')
    .option('-p, --packages <packages...>', 'Extra packages to install into project')
    .option('--skip-install', 'Skip dependency installation step')
    .action(async (fw: string, name: string, opts) => {
      try {
        await createCommand(fw as FrameworkId, name, {
          version: opts.version,
          offline: opts.offline,
          yes: opts.yes,
          packages: opts.packages,
          skipInstall: opts.skipInstall,
        });
      } catch (err) {
        handleCliError(err);
      }
    });

  // Update command
  program
    .command('update [framework]')
    .description('Update project dependencies offline or refresh cached framework template')
    .option('-v, --version <version>', 'Target version to update to')
    .option('--offline', 'Update using local cache without internet access')
    .option('--dry-run', 'Preview changes without modifying package.json')
    .action(async (fw?: string, opts = {}) => {
      try {
        await updateCommand(fw, {
          version: opts.version,
          offline: opts.offline,
          dryRun: opts.dryRun,
        });
      } catch (err) {
        handleCliError(err);
      }
    });

  // Init command
  program
    .command('init')
    .description('Initialize local APX cache directories and run system health checks')
    .action(async () => {
      try {
        await initCommand();
      } catch (err) {
        handleCliError(err);
      }
    });

  // List command
  program
    .command('list')
    .description('Show all cached frameworks, versions, and hydrated packages')
    .action(async () => {
      try {
        await listCommand();
      } catch (err) {
        handleCliError(err);
      }
    });

  // Doctor command
  program
    .command('doctor')
    .description('Run comprehensive system and environment diagnostics')
    .action(async () => {
      try {
        await doctorCommand();
      } catch (err) {
        handleCliError(err);
      }
    });

  return program;
}

function handleCliError(err: unknown): void {
  if (err instanceof ApxError) {
    logger.error(err.message, err.suggestion);
  } else if (err instanceof Error) {
    logger.error(err.message);
  } else {
    logger.error(String(err));
  }
  process.exit(1);
}

// Execute program if executed as main CLI
const program = createProgram();
if (process.env.NODE_ENV !== 'test') {
  program.parse();
}
