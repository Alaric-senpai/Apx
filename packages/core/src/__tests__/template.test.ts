import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import {
  FRAMEWORK_CONFIGS,
  getFrameworkAddons,
  copyTemplateToProject,
  downloadAndCacheTemplate,
} from '../template.js';
import * as execaModule from 'execa';

vi.mock('execa', () => ({
  execa: vi.fn().mockResolvedValue({ stdout: '', stderr: '' }),
}));

describe('template core', () => {
  let tempDir: string;
  let tempApxDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'apx-test-tmpl-'));
    tempApxDir = await fs.mkdtemp(path.join(os.tmpdir(), 'apx-test-apx-'));
    process.env.APX_HOME = tempApxDir;
    vi.clearAllMocks();
  });

  afterEach(async () => {
    delete process.env.APX_HOME;
    await fs.remove(tempDir);
    await fs.remove(tempApxDir);
  });

  it('defines all supported framework configurations', () => {
    const frameworks = ['nextjs', 'vite-react', 'nestjs', 'angular', 'expo'];
    for (const fw of frameworks) {
      expect(FRAMEWORK_CONFIGS).toHaveProperty(fw);
      expect(FRAMEWORK_CONFIGS[fw as keyof typeof FRAMEWORK_CONFIGS].versionPkg).toBeDefined();
      expect(FRAMEWORK_CONFIGS[fw as keyof typeof FRAMEWORK_CONFIGS].scaffold).toBeTypeOf('function');
    }
  });

  it('returns addons for frameworks', () => {
    const nextAddons = getFrameworkAddons('nextjs');
    expect(nextAddons.length).toBeGreaterThan(0);
    expect(nextAddons.some((a) => a.id === 'lucide-react')).toBe(true);

    const viteAddons = getFrameworkAddons('vite-react');
    expect(viteAddons.some((a) => a.id === 'zustand')).toBe(true);
  });

  it('copyTemplateToProject copies files and updates package.json', async () => {
    const templatePath = path.join(tempDir, 'template');
    const projectPath = path.join(tempDir, 'my-new-app');

    await fs.ensureDir(templatePath);
    await fs.writeJson(path.join(templatePath, 'package.json'), {
      name: 'temp-template-name',
      version: '0.1.0',
      dependencies: {
        next: '15.0.0',
      },
    });
    await fs.writeFile(path.join(templatePath, 'README.md'), '# Scaffold');

    await copyTemplateToProject(templatePath, projectPath, 'my-new-app', ['lucide-react', 'zod']);

    expect(await fs.pathExists(projectPath)).toBe(true);
    expect(await fs.pathExists(path.join(projectPath, 'README.md'))).toBe(true);

    const pkg = await fs.readJson(path.join(projectPath, 'package.json'));
    expect(pkg.name).toBe('my-new-app');
    expect(pkg.dependencies['next']).toBe('15.0.0');
    expect(pkg.dependencies['lucide-react']).toBe('latest');
    expect(pkg.dependencies['zod']).toBe('latest');
  });

  it('downloadAndCacheTemplate scaffolds and caches template', async () => {
    // Mock the scaffolding command by creating the temp folder when execa is called
    (vi.mocked(execaModule.execa) as any).mockImplementation(async (cmd: any, args: any) => {
      // Find the folder argument in args (tmpName)
      const folderArg = (args as string[]).find((a) => a.startsWith('apx-nextjs-'));
      if (folderArg) {
        const scaffoldDir = path.join(tempApxDir, 'temp', folderArg);
        await fs.ensureDir(scaffoldDir);
        await fs.writeJson(path.join(scaffoldDir, 'package.json'), {
          name: 'scaffold-app',
          dependencies: { next: '15.0.0' },
        });
        await fs.writeFile(path.join(scaffoldDir, 'pnpm-lock.yaml'), 'lockfile-content');
        await fs.ensureDir(path.join(scaffoldDir, 'node_modules'));
      }
      return { stdout: '', stderr: '' } as any;
    });

    const cached = await downloadAndCacheTemplate('nextjs', '15.0.0', ['lucide-react']);

    expect(cached.version).toBe('15.0.0');
    expect(cached.packageManager).toBe('pnpm');
    expect(cached.cachedPackages).toEqual(['lucide-react']);
    expect(await fs.pathExists(cached.templatePath)).toBe(true);
    // Ensure node_modules was stripped to keep template lightweight
    expect(await fs.pathExists(path.join(cached.templatePath, 'node_modules'))).toBe(false);
  });
});
