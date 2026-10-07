import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { listCommand } from '../list.js';
import { registerVersion } from '@apx/core';
import { logger } from '@apx/utils';

describe('list command', () => {
  let tempApxDir: string;

  beforeEach(async () => {
    logger.setSilent(true);
    tempApxDir = await fs.mkdtemp(path.join(os.tmpdir(), 'apx-test-list-'));
    process.env.APX_HOME = tempApxDir;
  });

  afterEach(async () => {
    delete process.env.APX_HOME;
    await fs.remove(tempApxDir);
    logger.setSilent(false);
  });

  it('returns empty registry when nothing is cached', async () => {
    const reg = await listCommand();
    expect(reg.frameworks).toEqual({});
  });

  it('returns populated registry with cached versions', async () => {
    await registerVersion('nextjs', {
      version: '15.0.0',
      cachedAt: new Date().toISOString(),
      templatePath: '/fake/path',
      packageManager: 'pnpm',
      compatibility: { node: 'v20.0.0', os: ['linux'] },
      cachedPackages: ['lucide-react', 'zustand'],
    });

    const reg = await listCommand();
    expect(reg.frameworks.nextjs).toBeDefined();
    expect(reg.frameworks.nextjs?.default).toBe('15.0.0');
    expect(reg.frameworks.nextjs?.versions).toContain('15.0.0');
  });
});
