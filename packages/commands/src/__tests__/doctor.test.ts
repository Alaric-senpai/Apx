import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { doctorCommand } from '../doctor.js';
import { logger } from '@apx/utils';
import * as execaModule from 'execa';

vi.mock('execa', () => ({
  execa: vi.fn(),
}));

describe('doctor command', () => {
  let tempApxDir: string;

  beforeEach(async () => {
    logger.setSilent(true);
    tempApxDir = await fs.mkdtemp(path.join(os.tmpdir(), 'apx-test-doc-'));
    process.env.APX_HOME = tempApxDir;
    vi.clearAllMocks();
  });

  afterEach(async () => {
    delete process.env.APX_HOME;
    await fs.remove(tempApxDir);
    logger.setSilent(false);
  });

  it('runs all diagnostic checks and returns report', async () => {
    vi.mocked(execaModule.execa).mockImplementation(async (cmd) => {
      if (cmd === 'node') return { stdout: 'v20.10.0' } as any;
      if (cmd === 'pnpm') return { stdout: '9.0.0' } as any;
      return { stdout: '' } as any;
    });

    const results = await doctorCommand();
    expect(results).toHaveLength(5);

    const nodeCheck = results.find((r) => r.check === 'Node.js Runtime');
    expect(nodeCheck?.status).toBe('ok');
    expect(nodeCheck?.message).toBe('v20.10.0');

    const pnpmCheck = results.find((r) => r.check === 'pnpm Package Manager');
    expect(pnpmCheck?.status).toBe('ok');

    const storageCheck = results.find((r) => r.check === 'APX Storage Root');
    expect(storageCheck?.status).toBe('ok');
  });

  it('reports failure when pnpm is missing', async () => {
    vi.mocked(execaModule.execa).mockImplementation(async (cmd) => {
      if (cmd === 'node') return { stdout: 'v20.0.0' } as any;
      if (cmd === 'pnpm') throw new Error('pnpm: command not found');
      return { stdout: '' } as any;
    });

    const results = await doctorCommand();
    const pnpmCheck = results.find((r) => r.check === 'pnpm Package Manager');
    expect(pnpmCheck?.status).toBe('fail');
    expect(pnpmCheck?.suggestion).toContain('npm install -g pnpm');
  });
});
