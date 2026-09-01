import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import type { Registry, FrameworkId, CachedVersion } from '@apx/types';
import {logger} from '@apx/utils'
export const APX_DIR       = path.join(os.homedir(), '.apx');
export const REGISTRY_PATH = path.join(APX_DIR, 'registry.json');
export const TEMPLATES_DIR = path.join(APX_DIR, 'templates');
export const LOGS_DIR      = path.join(APX_DIR, 'logs');

const EMPTY_REGISTRY: Registry = {
  version: '1',
  updatedAt: new Date().toISOString(),
  frameworks: {},
};

/**
 * Method to ensure all needed directories exists
 */
export async function ensureApxDirs(): Promise<void> {

  logger.info("DIRECTORY CHECK: ensuring all needed directories exist")

  await fs.ensureDir(APX_DIR);
  await fs.ensureDir(TEMPLATES_DIR);
  await fs.ensureDir(LOGS_DIR);

  logger.success("SUCCESS: All necessary directories exist")
}

export async function readRegistry(): Promise<Registry> {
  await ensureApxDirs();
  if (!(await fs.pathExists(REGISTRY_PATH))) {
    await fs.writeJson(REGISTRY_PATH, EMPTY_REGISTRY, { spaces: 2 });
    return structuredClone(EMPTY_REGISTRY);
  }
  return fs.readJson(REGISTRY_PATH) as Promise<Registry>;
}

export async function writeRegistry(reg: Registry): Promise<void> {
  reg.updatedAt = new Date().toISOString();
  await fs.writeJson(REGISTRY_PATH, reg, { spaces: 2 });
}

export async function registerVersion(
  framework: FrameworkId,
  cached: CachedVersion
): Promise<void> {
  const reg = await readRegistry();
  const entry = reg.frameworks[framework];

  if (!entry) {
    reg.frameworks[framework] = {
      versions: [cached.version],
      default: cached.version,
      cached: [cached],
    };
  } else {
    if (!entry.versions.includes(cached.version)) {
      entry.versions.push(cached.version);
    }
    entry.default = cached.version;
    const idx = entry.cached.findIndex(c => c.version === cached.version);
    if (idx >= 0) entry.cached[idx] = cached;
    else entry.cached.push(cached);
  }

  await writeRegistry(reg);
}

export async function getFrameworkEntry(framework: FrameworkId) {
  const reg = await readRegistry();
  return reg.frameworks[framework] ?? null;
}
