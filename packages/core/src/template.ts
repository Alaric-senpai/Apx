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
      args: ['create', 'next-app', n, '--ts', '--eslint',
             '--no-git', '--tailwind' ,'--app', '--use-pnpm'],
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
