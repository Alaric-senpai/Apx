import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { createCommand } from '../create.js';
import { registerVersion } from '@apx/core';
import { logger, ApxError } from '@apx/utils';
import * as execaModule from 'execa';

vi.mock('execa', () => ({
  execa: vi.fn().mockResolvedValue({ stdout: 'Done' }),
}));

describe('create command', () => {
  let tempApxDir: string;
  let workDir: string;
  let fakeTemplateDir: string;

  beforeEach(async () => {
    logger.setSilent(true);
    tempApxDir = await fs.mkdtemp(path.join(os.tmpdir(), 'apx-test-create-apx-'));
    workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'apx-test-work-'));
    fakeTemplateDir = path.join(tempApxDir, 'templates', 'nextjs', '15.0.0', 'template');

    await fs.ensureDir(fakeTemplateDir);
    await fs.writeJson(path.join(fakeTemplateDir, 'package.json'), {
      name: 'cached-template',
      dependencies: { next: '15.0.0' },
    });
    await fs.writeFile(path.join(fakeTemplateDir, 'pnpm-lock.yaml'), 'lockfile-content');

    process.env.APX_HOME = tempApxDir;
    vi.spyOn(process, 'cwd').mockReturnValue(workDir);
  });

  afterEach(async () => {
    delete process.env.APX_HOME;
    await fs.remove(tempApxDir);
    await fs.remove(workDir);
    logger.setSilent(false);
  });

  it('throws CACHE_EMPTY if framework is not cached', async () => {
    await expect(
      createCommand('vite-react', 'my-vite-app', { yes: true })
    ).rejects.toMatchObject({
      code: 'CACHE_EMPTY',
    });
  });

  it('creates project from cached template offline', async () => {
    await registerVersion('nextjs', {
      version: '15.0.0',
      cachedAt: new Date().toISOString(),
      templatePath: fakeTemplateDir,
      packageManager: 'pnpm',
      compatibility: { node: 'v20.0.0', os: ['linux'] },
    });

    const res = await createCommand('nextjs', 'my-test-app', {
      offline: true,
      yes: true,
      packages: ['lucide-react', 'zustand'],
      skipInstall: true,
    });

    expect(res.projectPath).toBe(path.join(workDir, 'my-test-app'));
    expect(res.version).toBe('15.0.0');
    expect(res.packages).toEqual(['lucide-react', 'zustand']);

    const projectPkg = await fs.readJson(path.join(res.projectPath, 'package.json'));
    expect(projectPkg.name).toBe('my-test-app');
    expect(projectPkg.dependencies['lucide-react']).toBe('latest');
    expect(projectPkg.dependencies['zustand']).toBe('latest');
  });

  it('throws PROJECT_EXISTS if directory already exists', async () => {
    await registerVersion('nextjs', {
      version: '15.0.0',
      cachedAt: new Date().toISOString(),
      templatePath: fakeTemplateDir,
      packageManager: 'pnpm',
      compatibility: { node: 'v20.0.0', os: ['linux'] },
    });

    await fs.ensureDir(path.join(workDir, 'existing-app'));

    await expect(
      createCommand('nextjs', 'existing-app', { offline: true, yes: true })
    ).rejects.toMatchObject({
      code: 'PROJECT_EXISTS',
    });
  });

  it('uses default project name <framework>-app if project name omitted with yes flag', async () => {
    await registerVersion('nextjs', {
      version: '15.0.0',
      cachedAt: new Date().toISOString(),
      templatePath: fakeTemplateDir,
      packageManager: 'pnpm',
      compatibility: { node: 'v20.0.0', os: ['linux'] },
    });

    const res = await createCommand('nextjs', undefined, {
      offline: true,
      yes: true,
      skipInstall: true,
    });

    expect(res.projectPath).toBe(path.join(workDir, 'nextjs-app'));
    const projectPkg = await fs.readJson(path.join(res.projectPath, 'package.json'));
    expect(projectPkg.name).toBe('nextjs-app');
  });

  it('throws CACHE_EMPTY if framework omitted and no cached frameworks exist with yes flag', async () => {
    await expect(
      createCommand(undefined, 'my-app', { yes: true })
    ).rejects.toMatchObject({
      code: 'CACHE_EMPTY',
    });
  });
});
