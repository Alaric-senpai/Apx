#!/usr/bin/env bash
set -e

echo ""
echo "  ▲ APX — Scaffolding monorepo..."
echo ""

# ── Directories ────────────────────────────────────────────────────────────────
mkdir -p apps/cli/src
mkdir -p packages/types/src
mkdir -p packages/utils/src
mkdir -p packages/core/src
mkdir -p packages/commands/src

echo "  ✓ Directories created"

# ══════════════════════════════════════════════════════════════════════════════
# ROOT
# ══════════════════════════════════════════════════════════════════════════════

cat > pnpm-workspace.yaml << 'EOF'
packages:
  - "apps/*"
  - "packages/*"
EOF

cat > package.json << 'EOF'
{
  "name": "apx-monorepo",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "clean": "turbo clean"
  },
  "devDependencies": {
    "turbo": "latest",
    "typescript": "^5.4.0"
  }
}
EOF

cat > turbo.json << 'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "clean": {
      "cache": false
    }
  }
}
EOF

cat > tsconfig.base.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
EOF

echo "  ✓ Root files written"

# ══════════════════════════════════════════════════════════════════════════════
# packages/types
# ══════════════════════════════════════════════════════════════════════════════

cat > packages/types/package.json << 'EOF'
{
  "name": "@apx/types",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts"
}
EOF

cat > packages/types/src/index.ts << 'EOF'
export type PackageManager = 'pnpm' | 'npm' | 'yarn' | 'bun';

export type FrameworkId =
  | 'nextjs'
  | 'vite-react'
  | 'nestjs'
  | 'angular'
  | 'expo';

export interface CachedVersion {
  version: string;
  cachedAt: string;
  templatePath: string;
  packageManager: PackageManager;
  compatibility: {
    node: string;
    os: string[];
  };
}

export interface FrameworkRegistry {
  versions: string[];
  default: string;
  cached: CachedVersion[];
}

export interface Registry {
  version: string;
  updatedAt: string;
  frameworks: Partial<Record<FrameworkId, FrameworkRegistry>>;
}

export interface SetupOptions {
  version?: string;
  force?: boolean;
}

export interface InitOptions {
  version?: string;
  offline?: boolean;
}

export interface DoctorResult {
  check: string;
  status: 'ok' | 'warn' | 'fail';
  message: string;
}
EOF

echo "  ✓ packages/types"

# ══════════════════════════════════════════════════════════════════════════════
# packages/utils
# ══════════════════════════════════════════════════════════════════════════════

cat > packages/utils/package.json << 'EOF'
{
  "name": "@apx/utils",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "dev": "tsc -p tsconfig.json --watch"
  },
  "dependencies": {
    "@apx/types": "workspace:*",
    "chalk": "^5.3.0",
    "ora": "^8.0.1"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}
EOF

cat > packages/utils/tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
EOF

cat > packages/utils/src/logger.ts << 'EOF'
import chalk from 'chalk';
import ora, { type Ora } from 'ora';

const tag = chalk.bold.cyan('APX');

export const logger = {
  info: (msg: string) =>
    console.log(`${tag} ${chalk.blue('ℹ')} ${msg}`),
  success: (msg: string) =>
    console.log(`${tag} ${chalk.green('✓')} ${msg}`),
  warn: (msg: string) =>
    console.log(`${tag} ${chalk.yellow('⚠')} ${msg}`),
  error: (msg: string) =>
    console.log(`${tag} ${chalk.red('✖')} ${msg}`),
  dim: (msg: string) =>
    console.log(chalk.dim(`    ${msg}`)),
  spin: (msg: string): Ora =>
    ora({ text: msg, prefixText: tag }).start(),
};
EOF

cat > packages/utils/src/network.ts << 'EOF'
import dns from 'dns/promises';

export async function isOnline(timeout = 3000): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeout);
    dns
      .lookup('registry.npmjs.org')
      .then(() => {
        clearTimeout(timer);
        resolve(true);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(false);
      });
  });
}

export async function getLatestVersion(
  pkg: string
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://registry.npmjs.org/${pkg}/latest`,
      { signal: AbortSignal.timeout(5000) }
    );
    const data = (await res.json()) as { version: string };
    return data.version;
  } catch {
    return null;
  }
}
EOF

cat > packages/utils/src/index.ts << 'EOF'
export { logger } from './logger.js';
export { isOnline, getLatestVersion } from './network.js';
EOF

echo "  ✓ packages/utils"

# ══════════════════════════════════════════════════════════════════════════════
# packages/core
# ══════════════════════════════════════════════════════════════════════════════

cat > packages/core/package.json << 'EOF'
{
  "name": "@apx/core",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "dev": "tsc -p tsconfig.json --watch"
  },
  "dependencies": {
    "@apx/types": "workspace:*",
    "execa": "^9.0.0",
    "fs-extra": "^11.2.0"
  },
  "devDependencies": {
    "@types/fs-extra": "^11.0.4",
    "typescript": "^5.4.0"
  }
}
EOF

cat > packages/core/tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
EOF

cat > packages/core/src/registry.ts << 'EOF'
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import type { Registry, FrameworkId, CachedVersion } from '@apx/types';

export const APX_DIR       = path.join(os.homedir(), '.apx');
export const REGISTRY_PATH = path.join(APX_DIR, 'registry.json');
export const TEMPLATES_DIR = path.join(APX_DIR, 'templates');
export const LOGS_DIR      = path.join(APX_DIR, 'logs');

const EMPTY_REGISTRY: Registry = {
  version: '1',
  updatedAt: new Date().toISOString(),
  frameworks: {},
};

export async function ensureApxDirs(): Promise<void> {
  await fs.ensureDir(APX_DIR);
  await fs.ensureDir(TEMPLATES_DIR);
  await fs.ensureDir(LOGS_DIR);
}

export async function readRegistry(): Promise<Registry> {
  await ensureApxDirs();
  if (!(await fs.pathExists(REGISTRY_PATH))) {
    await fs.writeJson(REGISTRY_PATH, EMPTY_REGISTRY, { spaces: 2 });
    return structuredClone(EMPTY_REGISTRY);
  }
  return fs.readJson(REGISTRY_PATH) as Promise<Registry>;
}

export async function writeRegistry(reg: Registry): Promise<void> {
  reg.updatedAt = new Date().toISOString();
  await fs.writeJson(REGISTRY_PATH, reg, { spaces: 2 });
}

export async function registerVersion(
  framework: FrameworkId,
  cached: CachedVersion
): Promise<void> {
  const reg = await readRegistry();
  const entry = reg.frameworks[framework];

  if (!entry) {
    reg.frameworks[framework] = {
      versions: [cached.version],
      default: cached.version,
      cached: [cached],
    };
  } else {
    if (!entry.versions.includes(cached.version)) {
      entry.versions.push(cached.version);
    }
    entry.default = cached.version;
    const idx = entry.cached.findIndex(c => c.version === cached.version);
    if (idx >= 0) entry.cached[idx] = cached;
    else entry.cached.push(cached);
  }

  await writeRegistry(reg);
}

export async function getFrameworkEntry(framework: FrameworkId) {
  const reg = await readRegistry();
  return reg.frameworks[framework] ?? null;
}
EOF

cat > packages/core/src/template.ts << 'EOF'
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { execa } from 'execa';
import type { FrameworkId, CachedVersion } from '@apx/types';
import { TEMPLATES_DIR, registerVersion } from './registry.js';

type FrameworkConfig = {
  scaffold: (tmpName: string) => { cmd: string; args: string[] };
  versionPkg: string;
};

export const FRAMEWORK_CONFIGS: Record<FrameworkId, FrameworkConfig> = {
  nextjs: {
    scaffold: (n) => ({
      cmd: 'pnpm',
      args: ['create', 'next-app', n, '--typescript',
             '--no-git', '--no-turbopack', '--yes'],
    }),
    versionPkg: 'next',
  },
  'vite-react': {
    scaffold: (n) => ({
      cmd: 'pnpm',
      args: ['create', 'vite', n, '--template', 'react-ts'],
    }),
    versionPkg: 'vite',
  },
  nestjs: {
    scaffold: (n) => ({
      cmd: 'pnpm',
      args: ['dlx', '@nestjs/cli', 'new', n,
             '--package-manager', 'pnpm', '--skip-git'],
    }),
    versionPkg: '@nestjs/core',
  },
  angular: {
    scaffold: (n) => ({
      cmd: 'pnpm',
      args: ['dlx', '@angular/cli', 'new', n,
             '--package-manager', 'pnpm', '--skip-git'],
    }),
    versionPkg: '@angular/core',
  },
  expo: {
    scaffold: (n) => ({
      cmd: 'pnpm',
      args: ['create', 'expo-app', n, '--template', 'blank-typescript'],
    }),
    versionPkg: 'expo',
  },
};

export async function downloadAndCacheTemplate(
  framework: FrameworkId,
  version: string
): Promise<CachedVersion> {
  const config = FRAMEWORK_CONFIGS[framework];
  const tmpName = `apx-${framework}-${Date.now()}`;
  const templateDest = path.join(
    TEMPLATES_DIR, framework, version, 'template'
  );

  const { cmd, args } = config.scaffold(tmpName);
  await execa(cmd, args, { cwd: os.tmpdir(), stdio: 'pipe' });

  await fs.ensureDir(path.dirname(templateDest));
  await fs.move(path.join(os.tmpdir(), tmpName), templateDest, {
    overwrite: true,
  });

  const cached: CachedVersion = {
    version,
    cachedAt: new Date().toISOString(),
    templatePath: templateDest,
    packageManager: 'pnpm',
    compatibility: {
      node: process.version,
      os: [process.platform],
    },
  };

  await registerVersion(framework, cached);
  return cached;
}

export async function copyTemplateToProject(
  templatePath: string,
  projectPath: string,
  projectName: string
): Promise<void> {
  await fs.copy(templatePath, projectPath);

  const pkgPath = path.join(projectPath, 'package.json');
  if (await fs.pathExists(pkgPath)) {
    const pkg = await fs.readJson(pkgPath);
    pkg.name = projectName;
    await fs.writeJson(pkgPath, pkg, { spaces: 2 });
  }
}
EOF

cat > packages/core/src/index.ts << 'EOF'
export {
  APX_DIR,
  REGISTRY_PATH,
  TEMPLATES_DIR,
  LOGS_DIR,
  ensureApxDirs,
  readRegistry,
  writeRegistry,
  registerVersion,
  getFrameworkEntry,
} from './registry.js';

export {
  FRAMEWORK_CONFIGS,
  downloadAndCacheTemplate,
  copyTemplateToProject,
} from './template.js';
EOF

echo "  ✓ packages/core"

# ══════════════════════════════════════════════════════════════════════════════
# packages/commands
# ══════════════════════════════════════════════════════════════════════════════

cat > packages/commands/package.json << 'EOF'
{
  "name": "@apx/commands",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "dev": "tsc -p tsconfig.json --watch"
  },
  "dependencies": {
    "@apx/core": "workspace:*",
    "@apx/types": "workspace:*",
    "@apx/utils": "workspace:*",
    "chalk": "^5.3.0",
    "execa": "^9.0.0",
    "fs-extra": "^11.2.0",
    "inquirer": "^9.2.0"
  },
  "devDependencies": {
    "@types/fs-extra": "^11.0.4",
    "@types/inquirer": "^9.0.7",
    "typescript": "^5.4.0"
  }
}
EOF

cat > packages/commands/tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
EOF

cat > packages/commands/src/setup.ts << 'EOF'
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
EOF

cat > packages/commands/src/init.ts << 'EOF'
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

export async function initCommand(
  framework: FrameworkId,
  projectName: string,
  options: InitOptions = {}
): Promise<void> {
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
    spinner.fail(`Init failed: ${(err as Error).message}`);
    process.exit(1);
  }
}
EOF

cat > packages/commands/src/list.ts << 'EOF'
import chalk from 'chalk';
import { readRegistry } from '@apx/core';
import { logger } from '@apx/utils';

export async function listCommand(): Promise<void> {
  const registry = await readRegistry();
  const entries = Object.entries(registry.frameworks);

  if (entries.length === 0) {
    logger.warn('No frameworks cached yet.');
    logger.dim('Run: apx setup nextjs');
    return;
  }

  console.log(
    `\n${chalk.bold.cyan('APX')} ${chalk.dim('local cache:')}\n`
  );

  for (const [id, data] of entries) {
    console.log(`  ${chalk.green('●')} ${chalk.bold(id)}`);
    console.log(
      `    ${chalk.dim('default:')}  ${chalk.yellow(data.default)}`
    );
    console.log(
      `    ${chalk.dim('versions:')} ${data.versions.join(', ')}`
    );
    const latest = data.cached.at(-1);
    if (latest) {
      console.log(
        `    ${chalk.dim('cached:')}   ${latest.cachedAt.slice(0, 10)}`
      );
    }
    console.log();
  }
}
EOF

cat > packages/commands/src/doctor.ts << 'EOF'
import chalk from 'chalk';
import { execa } from 'execa';
import fs from 'fs-extra';
import { isOnline } from '@apx/utils';
import { readRegistry, APX_DIR } from '@apx/core';
import type { DoctorResult } from '@apx/types';

async function checkBin(bin: string): Promise<string | null> {
  try {
    const { stdout } = await execa(bin, ['--version']);
    return stdout.trim().split('\n')[0];
  } catch {
    return null;
  }
}

export async function doctorCommand(): Promise<void> {
  const checks: DoctorResult[] = [];

  const node = await checkBin('node');
  checks.push({
    check: 'Node.js',
    status: node ? 'ok' : 'fail',
    message: node ?? 'Not found',
  });

  const pnpm = await checkBin('pnpm');
  checks.push({
    check: 'pnpm',
    status: pnpm ? 'ok' : 'fail',
    message: pnpm ?? 'Install: npm i -g pnpm',
  });

  const apxExists = await fs.pathExists(APX_DIR);
  checks.push({
    check: 'APX directory',
    status: apxExists ? 'ok' : 'warn',
    message: apxExists ? APX_DIR : 'Not initialized yet',
  });

  const reg = await readRegistry();
  const count = Object.keys(reg.frameworks).length;
  checks.push({
    check: 'Registry',
    status: count > 0 ? 'ok' : 'warn',
    message: count > 0 ? `${count} framework(s) cached` : 'Empty',
  });

  const online = await isOnline();
  checks.push({
    check: 'Internet',
    status: online ? 'ok' : 'warn',
    message: online ? 'Connected' : 'Offline — cache only mode',
  });

  console.log(
    `\n${chalk.bold.cyan('APX')} ${chalk.dim('doctor:')}\n`
  );

  for (const r of checks) {
    const icon =
      r.status === 'ok'
        ? chalk.green('✓')
        : r.status === 'warn'
        ? chalk.yellow('⚠')
        : chalk.red('✖');
    console.log(
      `  ${icon}  ${chalk.bold(r.check.padEnd(16))} ${chalk.dim(r.message)}`
    );
  }

  const failed = checks.filter(c => c.status === 'fail');
  console.log();
  if (failed.length > 0) {
    console.log(
      chalk.red(`  ${failed.length} issue(s) require attention.\n`)
    );
  } else {
    console.log(chalk.green('  All systems go.\n'));
  }
}
EOF

cat > packages/commands/src/index.ts << 'EOF'
export { setupCommand }  from './setup.js';
export { initCommand }   from './init.js';
export { listCommand }   from './list.js';
export { doctorCommand } from './doctor.js';
EOF

echo "  ✓ packages/commands"

# ══════════════════════════════════════════════════════════════════════════════
# apps/cli
# ══════════════════════════════════════════════════════════════════════════════

cat > apps/cli/package.json << 'EOF'
{
  "name": "apx",
  "version": "0.1.0",
  "description": "Offline-first scaffolding CLI for JS/TS frameworks",
  "bin": { "apx": "./dist/index.js" },
  "type": "module",
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@apx/commands": "workspace:*",
    "@apx/types": "workspace:*",
    "commander": "^12.0.0"
  },
  "devDependencies": {
    "tsx": "^4.7.0",
    "typescript": "^5.4.0"
  }
}
EOF

cat > apps/cli/tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
EOF

cat > apps/cli/src/index.ts << 'EOF'
#!/usr/bin/env node
import { Command } from 'commander';
import {
  setupCommand,
  initCommand,
  listCommand,
  doctorCommand,
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
  .command('init <framework> <project-name>')
  .description('Create a new project from cached template')
  .option('-v, --version <version>', 'Cached version to use')
  .option('--offline', 'Skip update check, use cache only')
  .action((fw: string, name: string, opts) =>
    initCommand(fw as FrameworkId, name, opts)
  );

program
  .command('list')
  .description('Show all cached frameworks')
  .action(() => listCommand());

program
  .command('doctor')
  .description('Check APX system health')
  .action(() => doctorCommand());

program.parse();
EOF

echo "  ✓ apps/cli"

# ══════════════════════════════════════════════════════════════════════════════
# .gitignore
# ══════════════════════════════════════════════════════════════════════════════

cat > .gitignore << 'EOF'
node_modules/
dist/
.turbo/
*.log
.env
.env.*
!.env.example
EOF

echo "  ✓ .gitignore"
echo ""
echo "  ✅ APX monorepo scaffolded successfully!"
echo ""
echo "  Next steps:"
echo "    pnpm install"
echo "    cd apps/cli && pnpm dev doctor"
echo ""
