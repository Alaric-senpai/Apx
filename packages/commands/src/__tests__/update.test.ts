import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { updateCommand } from '../update.js';
import { registerVersion } from '@apx/core';
import { logger, ApxError } from '@apx/utils';
import * as execaModule from 'execa';

vi.mock('execa', () => ({
  execa: vi.fn().mockResolvedValue({ stdout: 'Done' }),
}));

describe('update command', () => {
  let tempApxDir: string;
  let workDir: string;

  beforeEach(async () => {
    logger.setSilent(true);
    tempApxDir = await fs.mkdtemp(path.join(os.tmpdir(), 'apx-test-update-apx-'));
    workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'apx-test-update-work-'));
    process.env.APX_HOME = tempApxDir;
    vi.spyOn(process, 'cwd').mockReturnValue(workDir);
  });

  afterEach(async () => {
    delete process.env.APX_HOME;
    await fs.remove(tempApxDir);
    await fs.remove(workDir);
    logger.setSilent(false);
  });

  it('throws UPDATE_ERROR if no package.json in working directory and no framework argument given', async () => {
    await expect(updateCommand()).rejects.toMatchObject({
      code: 'UPDATE_ERROR',
    });
  });

  it('updates project package.json offline when newer cached version exists', async () => {
    // Project with next 14
    await fs.writeJson(path.join(workDir, 'package.json'), {
      name: 'my-legacy-app',
      dependencies: {
        next: '^14.0.0',
      },
    });

    // Cache has next 15
    await registerVersion('nextjs', {
      version: '15.0.0',
      cachedAt: new Date().toISOString(),
      templatePath: '/fake/template/15',
      packageManager: 'pnpm',
      compatibility: { node: 'v20.0.0', os: ['linux'] },
    });

    const res = await updateCommand(undefined, { offline: true });

    expect(res.updated).toBe(true);
    expect(res.framework).toBe('nextjs');
    expect(res.version).toBe('15.0.0');

    const updatedPkg = await fs.readJson(path.join(workDir, 'package.json'));
    expect(updatedPkg.dependencies.next).toBe('^15.0.0');
  });

  it('detects when project is already up-to-date', async () => {
    await fs.writeJson(path.join(workDir, 'package.json'), {
      name: 'my-current-app',
      dependencies: {
        next: '^15.0.0',
      },
    });

    await registerVersion('nextjs', {
      version: '15.0.0',
      cachedAt: new Date().toISOString(),
      templatePath: '/fake/template/15',
      packageManager: 'pnpm',
      compatibility: { node: 'v20.0.0', os: ['linux'] },
    });

    const res = await updateCommand(undefined, { offline: true });
    expect(res.updated).toBe(false);
  });
});
