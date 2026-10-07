import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { execa } from 'execa';
import type { FrameworkId, CachedVersion, PackageAddon } from '@apx/types';
import { getTemplatesDir, getTempDir, registerVersion } from './registry.js';

export interface FrameworkConfig {
  displayName: string;
  description: string;
  versionPkg: string;
  scaffold: (tmpName: string, version?: string) => { cmd: string; args: string[] };
  addons: PackageAddon[];
}

export const FRAMEWORK_CONFIGS: Record<FrameworkId, FrameworkConfig> = {
  nextjs: {
    displayName: 'Next.js (App Router)',
    description: 'The React Framework for the Web with App Router & Tailwind CSS',
    versionPkg: 'next',
    scaffold: (n, v) => ({
      cmd: 'pnpm',
      args: [
        'create',
        v ? `next-app@${v}` : 'next-app',
        n,
        '--ts',
        '--eslint',
        '--tailwind',
        '--app',
        '--use-pnpm',
        '--yes',
        '--disable-git',
      ],
    }),
    addons: [
      { id: 'lucide-react', name: 'Lucide React', description: 'Beautiful & consistent icon set', category: 'ui' },
      { id: 'zustand', name: 'Zustand', description: 'Fast and scalable state management', category: 'state' },
      { id: '@tanstack/react-query', name: 'TanStack Query', description: 'Declarative async data fetching', category: 'state' },
      { id: 'zod', name: 'Zod', description: 'TypeScript-first schema validation', category: 'utils' },
      { id: 'clsx', name: 'clsx', description: 'Tiny utility for conditional classnames', category: 'ui' },
      { id: 'tailwind-merge', name: 'tailwind-merge', description: 'Merge Tailwind CSS classes efficiently', category: 'ui' },
    ],
  },
  'vite-react': {
    displayName: 'Vite React',
    description: 'Fast, lightweight React with Vite and TypeScript',
    versionPkg: 'vite',
    scaffold: (n, v) => ({
      cmd: 'pnpm',
      args: ['create', v ? `vite@${v}` : 'vite', n, '--template', 'react-ts'],
    }),
    addons: [
      { id: 'lucide-react', name: 'Lucide React', description: 'Clean icon library', category: 'ui' },
      { id: 'zustand', name: 'Zustand', description: 'Lightweight state management', category: 'state' },
      { id: '@tanstack/react-query', name: 'TanStack Query', description: 'Powerful asynchronous state manager', category: 'state' },
      { id: 'react-router-dom', name: 'React Router', description: 'Declarative routing for React', category: 'ui' },
      { id: 'vitest', name: 'Vitest', description: 'Vite-native unit testing framework', dev: true, category: 'testing' },
    ],
  },
  nestjs: {
    displayName: 'NestJS',
    description: 'A progressive Node.js framework for scalable server-side apps',
    versionPkg: '@nestjs/core',
    scaffold: (n) => ({
      cmd: 'pnpm',
      args: [
        'dlx',
        '@nestjs/cli',
        'new',
        n,
        '--package-manager',
        'pnpm',
        '--skip-git',
        '--strict',
      ],
    }),
    addons: [
      { id: '@nestjs/config', name: 'NestJS Config', description: 'Configuration module with dotenv support', category: 'utils' },
      { id: 'class-validator', name: 'class-validator', description: 'Decorator-based entity validation', category: 'utils' },
      { id: 'class-transformer', name: 'class-transformer', description: 'Transform plain objects to class instances', category: 'utils' },
      { id: '@prisma/client', name: 'Prisma Client', description: 'Next-generation ORM client', category: 'database' },
    ],
  },
  angular: {
    displayName: 'Angular',
    description: 'Enterprise-ready web development framework',
    versionPkg: '@angular/core',
    scaffold: (n) => ({
      cmd: 'pnpm',
      args: [
        'dlx',
        '@angular/cli',
        'new',
        n,
        '--package-manager',
        'pnpm',
        '--skip-git',
        '--routing',
        '--style=css',
      ],
    }),
    addons: [
      { id: '@angular/forms', name: 'Angular Forms', description: 'Reactive & template-driven forms', category: 'ui' },
    ],
  },
  expo: {
    displayName: 'Expo (React Native)',
    description: 'Cross-platform native apps with React and Expo',
    versionPkg: 'expo',
    scaffold: (n) => ({
      cmd: 'pnpm',
      args: ['create', 'expo-app', n, '--template', 'blank-typescript'],
    }),
    addons: [
      { id: '@react-navigation/native', name: 'React Navigation', description: 'Routing and navigation for Expo', category: 'ui' },
    ],
  },
};

export function getFrameworkAddons(framework: FrameworkId): PackageAddon[] {
  return FRAMEWORK_CONFIGS[framework]?.addons ?? [];
}

export async function downloadAndCacheTemplate(
  framework: FrameworkId,
  version: string,
  extraPackages: string[] = []
): Promise<CachedVersion> {
  const config = FRAMEWORK_CONFIGS[framework];
  const tempBase = getTempDir();
  await fs.ensureDir(tempBase);
  const tmpName = `apx-${framework}-${Date.now()}`;
  const tmpDir = path.join(tempBase, tmpName);
  const templatesDir = getTemplatesDir();
  const templateDest = path.join(templatesDir, framework, version, 'template');

  const { cmd, args } = config.scaffold(tmpName, version);
  await execa(cmd, args, {
    cwd: tempBase,
    stdio: 'pipe',
    stdin: 'ignore',
    env: {
      ...process.env,
      CI: '1',
      NEXT_TELEMETRY_DISABLED: '1',
    },
  });

  // If specific extra packages were requested, install them so pnpm caches their tarballs
  if (extraPackages.length > 0) {
    try {
      await execa('pnpm', ['add', ...extraPackages], {
        cwd: tmpDir,
        stdio: 'pipe',
        stdin: 'ignore',
        env: {
          ...process.env,
          CI: '1',
        },
      });
    } catch {
      // Continue even if an optional package failed to install
    }
  }

  // Ensure pnpm install runs in the scaffolded project to guarantee
  // pnpm-lock.yaml exists and ~/.pnpm-store is hydrated
  const hasLockfile = await fs.pathExists(path.join(tmpDir, 'pnpm-lock.yaml'));
  if (!hasLockfile) {
    await execa('pnpm', ['install'], {
      cwd: tmpDir,
      stdio: 'pipe',
      stdin: 'ignore',
      env: {
        ...process.env,
        CI: '1',
      },
    });
  }

  // Strip node_modules before storing template to conserve disk space and prevent symlink corruption
  const nodeModulesPath = path.join(tmpDir, 'node_modules');
  if (await fs.pathExists(nodeModulesPath)) {
    await fs.remove(nodeModulesPath);
  }

  await fs.ensureDir(path.dirname(templateDest));
  await fs.move(tmpDir, templateDest, { overwrite: true });

  const cached: CachedVersion = {
    version,
    cachedAt: new Date().toISOString(),
    templatePath: templateDest,
    packageManager: 'pnpm',
    compatibility: {
      node: process.version,
      os: [process.platform],
    },
    cachedPackages: extraPackages,
  };

  await registerVersion(framework, cached);
  return cached;
}

export async function copyTemplateToProject(
  templatePath: string,
  projectPath: string,
  projectName: string,
  selectedPackages: string[] = []
): Promise<void> {
  await fs.copy(templatePath, projectPath);

  const pkgPath = path.join(projectPath, 'package.json');
  if (await fs.pathExists(pkgPath)) {
    const pkg = await fs.readJson(pkgPath);
    pkg.name = projectName;

    // Inject selected addon packages if specified
    if (selectedPackages.length > 0) {
      pkg.dependencies = pkg.dependencies || {};
      for (const p of selectedPackages) {
        if (!pkg.dependencies[p] && (!pkg.devDependencies || !pkg.devDependencies[p])) {
          pkg.dependencies[p] = 'latest';
        }
      }
    }

    await fs.writeJson(pkgPath, pkg, { spaces: 2 });
  }
}
