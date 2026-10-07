import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import {
  ensureApxDirs,
  readRegistry,
  writeRegistry,
  registerVersion,
  getFrameworkEntry,
  removeCachedVersion,
  getApxDir,
} from '../registry.js';
import type { CachedVersion } from '@apx/types';

describe('registry core', () => {
  let tempApxDir: string;

  beforeEach(async () => {
    tempApxDir = await fs.mkdtemp(path.join(os.tmpdir(), 'apx-test-reg-'));
    process.env.APX_HOME = tempApxDir;
  });

  afterEach(async () => {
    delete process.env.APX_HOME;
    await fs.remove(tempApxDir);
  });

  it('respects APX_HOME environment variable', () => {
    expect(getApxDir()).toBe(tempApxDir);
  });

  it('ensureApxDirs creates required directories', async () => {
    await ensureApxDirs();
    expect(await fs.pathExists(tempApxDir)).toBe(true);
    expect(await fs.pathExists(path.join(tempApxDir, 'templates'))).toBe(true);
    expect(await fs.pathExists(path.join(tempApxDir, 'logs'))).toBe(true);
  });

  it('readRegistry returns empty registry on initialization', async () => {
    const reg = await readRegistry();
    expect(reg.version).toBe('1');
    expect(reg.frameworks).toEqual({});
    expect(await fs.pathExists(path.join(tempApxDir, 'registry.json'))).toBe(true);
  });

  it('registerVersion adds a new framework version and sets default', async () => {
    const mockCache: CachedVersion = {
      version: '15.0.0',
      cachedAt: new Date().toISOString(),
      templatePath: '/dummy/template/path',
      packageManager: 'pnpm',
      compatibility: { node: 'v20.0.0', os: ['linux'] },
      cachedPackages: ['lucide-react', 'zustand'],
    };

    await registerVersion('nextjs', mockCache);
    const entry = await getFrameworkEntry('nextjs');

    expect(entry).not.toBeNull();
    expect(entry?.default).toBe('15.0.0');
    expect(entry?.versions).toContain('15.0.0');
    expect(entry?.cached).toHaveLength(1);
    expect(entry?.cached[0].cachedPackages).toEqual(['lucide-react', 'zustand']);
  });

  it('registerVersion updates existing entry with newer version', async () => {
    const v14: CachedVersion = {
      version: '14.0.0',
      cachedAt: new Date().toISOString(),
      templatePath: '/path/14',
      packageManager: 'pnpm',
      compatibility: { node: 'v20.0.0', os: ['linux'] },
    };
    const v15: CachedVersion = {
      version: '15.0.0',
      cachedAt: new Date().toISOString(),
      templatePath: '/path/15',
      packageManager: 'pnpm',
      compatibility: { node: 'v20.0.0', os: ['linux'] },
    };

    await registerVersion('nextjs', v14);
    await registerVersion('nextjs', v15);

    const entry = await getFrameworkEntry('nextjs');
    expect(entry?.default).toBe('15.0.0');
    expect(entry?.versions).toEqual(['14.0.0', '15.0.0']);
    expect(entry?.cached).toHaveLength(2);
  });

  it('removeCachedVersion removes version and recalculates default', async () => {
    const v14: CachedVersion = {
      version: '14.0.0',
      cachedAt: new Date().toISOString(),
      templatePath: '/path/14',
      packageManager: 'pnpm',
      compatibility: { node: 'v20.0.0', os: ['linux'] },
    };
    const v15: CachedVersion = {
      version: '15.0.0',
      cachedAt: new Date().toISOString(),
      templatePath: '/path/15',
      packageManager: 'pnpm',
      compatibility: { node: 'v20.0.0', os: ['linux'] },
    };

    await registerVersion('nextjs', v14);
    await registerVersion('nextjs', v15);

    const removed = await removeCachedVersion('nextjs', '15.0.0');
    expect(removed).toBe(true);

    const entry = await getFrameworkEntry('nextjs');
    expect(entry?.default).toBe('14.0.0');
    expect(entry?.versions).toEqual(['14.0.0']);
  });

  it('writeRegistry saves registry to disk atomically', async () => {
    const reg = await readRegistry();
    reg.version = '2';
    await writeRegistry(reg);

    const saved = await readRegistry();
    expect(saved.version).toBe('2');
  });
});
