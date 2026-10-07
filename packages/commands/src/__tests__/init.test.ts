import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { initCommand } from '../init.js';
import { logger } from '@apx/utils';
import * as execaModule from 'execa';

vi.mock('execa', () => ({
  execa: vi.fn().mockResolvedValue({ stdout: 'v20.0.0' }),
}));

describe('init command', () => {
  let tempApxDir: string;

  beforeEach(async () => {
    logger.setSilent(true);
    tempApxDir = await fs.mkdtemp(path.join(os.tmpdir(), 'apx-test-init-'));
    process.env.APX_HOME = tempApxDir;
  });

  afterEach(async () => {
    delete process.env.APX_HOME;
    await fs.remove(tempApxDir);
    logger.setSilent(false);
  });

  it('initializes directories and registry successfully', async () => {
    await initCommand();

    expect(await fs.pathExists(tempApxDir)).toBe(true);
    expect(await fs.pathExists(path.join(tempApxDir, 'templates'))).toBe(true);
    expect(await fs.pathExists(path.join(tempApxDir, 'logs'))).toBe(true);
    expect(await fs.pathExists(path.join(tempApxDir, 'registry.json'))).toBe(true);
  });
});
