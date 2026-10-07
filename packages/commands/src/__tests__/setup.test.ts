import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { setupCommand } from '../setup.js';
import { logger, ApxError } from '@apx/utils';
import * as execaModule from 'execa';
import * as networkModule from '@apx/utils';

vi.mock('execa', () => ({
  execa: vi.fn().mockResolvedValue({ stdout: '9.0.0' }),
}));

describe('setup command', () => {
  let tempApxDir: string;

  beforeEach(async () => {
    logger.setSilent(true);
    tempApxDir = await fs.mkdtemp(path.join(os.tmpdir(), 'apx-test-setup-'));
    process.env.APX_HOME = tempApxDir;
    vi.clearAllMocks();
  });

  afterEach(async () => {
    delete process.env.APX_HOME;
    await fs.remove(tempApxDir);
    logger.setSilent(false);
  });

  it('throws FRAMEWORK_NOT_FOUND for invalid framework', async () => {
    await expect(setupCommand('unknown-fw' as any)).rejects.toThrow(ApxError);
    await expect(setupCommand('unknown-fw' as any)).rejects.toMatchObject({
      code: 'FRAMEWORK_NOT_FOUND',
    });
  });

  it('throws NETWORK_REQUIRED when offline', async () => {
    vi.spyOn(networkModule, 'isOnline').mockResolvedValue(false);

    await expect(setupCommand('nextjs')).rejects.toThrow(ApxError);
    await expect(setupCommand('nextjs')).rejects.toMatchObject({
      code: 'NETWORK_REQUIRED',
    });
  });

  it('downloads and caches template when valid', async () => {
    vi.spyOn(networkModule, 'isOnline').mockResolvedValue(true);
    vi.spyOn(networkModule, 'getLatestVersion').mockResolvedValue('15.1.0');

    vi.mocked(execaModule.execa).mockImplementation(async (cmd, args) => {
      const folderArg = (args as string[] | undefined)?.find((a) => a.startsWith('apx-nextjs-'));
      if (folderArg) {
        const scaffoldDir = path.join(tempApxDir, 'temp', folderArg);
        await fs.ensureDir(scaffoldDir);
        await fs.writeJson(path.join(scaffoldDir, 'package.json'), {
          name: 'scaffold-app',
          dependencies: { next: '15.1.0' },
        });
        await fs.writeFile(path.join(scaffoldDir, 'pnpm-lock.yaml'), 'lock');
      }
      return { stdout: 'v9.0.0' } as any;
    });

    const cached = await setupCommand('nextjs', { version: '15.1.0' });

    expect(cached).not.toBeNull();
    expect(cached?.version).toBe('15.1.0');
    expect(await fs.pathExists(cached!.templatePath)).toBe(true);
  });

  it('defaults to nextjs when framework is omitted with yes flag', async () => {
    vi.spyOn(networkModule, 'isOnline').mockResolvedValue(true);
    vi.spyOn(networkModule, 'getLatestVersion').mockResolvedValue('15.1.0');

    vi.mocked(execaModule.execa).mockImplementation(async (cmd, args) => {
      const folderArg = (args as string[] | undefined)?.find((a) => a.startsWith('apx-nextjs-'));
      if (folderArg) {
        const scaffoldDir = path.join(tempApxDir, 'temp', folderArg);
        await fs.ensureDir(scaffoldDir);
        await fs.writeJson(path.join(scaffoldDir, 'package.json'), {
          name: 'scaffold-app',
          dependencies: { next: '15.1.0' },
        });
        await fs.writeFile(path.join(scaffoldDir, 'pnpm-lock.yaml'), 'lock');
      }
      return { stdout: 'v9.0.0' } as any;
    });

    const cached = await setupCommand(undefined, { yes: true, version: '15.1.0' });

    expect(cached).not.toBeNull();
    expect(cached?.version).toBe('15.1.0');
  });
});
