#!/usr/bin/env node
import { Command,  } from 'commander';
import {
  setupCommand,
  initCommand,
  listCommand,
  doctorCommand,
  createCommand
} from '@apx/commands';
import type { FrameworkId } from '@apx/types';

const program = new Command();

program
  .name('apx')
  .description('Offline-first scaffolding CLI for JS/TS')
  .version('0.1.0');

program
  .command('setup <framework>')
  .description('Download and cache a framework template')
  .option('-v, --version <version>', 'Specific version to cache')
  .option('-f, --force', 'Force re-download even if cached')
  .action((fw: string, opts) =>
    setupCommand(fw as FrameworkId, opts)
  );

program
  .command('create <framework> <project-name>')
  .description('Create a new project from cached template')
  .option('-v, --version <version>', 'Cached version to use')
  .option('--offline', 'Skip update check, use cache only')
  .action((fw: string, name: string, opts) =>
    createCommand(fw as FrameworkId, name, opts)
  );

program
  .command("init")
  .description("Perform first time apx setups")
  .action(()=>{
    initCommand()
  })


program
  .command('list')
  .description('Show all cached frameworks')
  .action(() => listCommand());

program
  .command('doctor')
  .description('Check APX system health')
  .action(() => doctorCommand());

program.parse();
