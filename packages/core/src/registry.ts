import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import type { Registry, FrameworkId, CachedVersion } from '@apx/types';

export function getApxDir(): string {
  return process.env.APX_HOME || path.join(os.homedir(), '.apx');
}

export function getRegistryPath(): string {
  return path.join(getApxDir(), 'registry.json');
}

export function getTemplatesDir(): string {
  return path.join(getApxDir(), 'templates');
}

export function getLogsDir(): string {
  return path.join(getApxDir(), 'logs');
}

export function getTempDir(): string {
  return path.join(getApxDir(), 'temp');
}

export const APX_DIR = getApxDir();
export const REGISTRY_PATH = getRegistryPath();
export const TEMPLATES_DIR = getTemplatesDir();
export const LOGS_DIR = getLogsDir();
export const TEMP_DIR = getTempDir();

const EMPTY_REGISTRY: Registry = {
  version: '1',
  updatedAt: new Date().toISOString(),
  frameworks: {},
};

export async function ensureApxDirs(): Promise<void> {
  const dir = getApxDir();
  const templates = getTemplatesDir();
  const logs = getLogsDir();
  const temp = getTempDir();

  await fs.ensureDir(dir);
  await fs.ensureDir(templates);
  await fs.ensureDir(logs);
  await fs.ensureDir(temp);
}

export async function readRegistry(): Promise<Registry> {
  await ensureApxDirs();
  const regPath = getRegistryPath();
  if (!(await fs.pathExists(regPath))) {
    const fresh = structuredClone(EMPTY_REGISTRY);
    fresh.updatedAt = new Date().toISOString();
    await fs.writeJson(regPath, fresh, { spaces: 2 });
    return fresh;
  }
  try {
    return (await fs.readJson(regPath)) as Registry;
  } catch {
    const fresh = structuredClone(EMPTY_REGISTRY);
    fresh.updatedAt = new Date().toISOString();
    await fs.writeJson(regPath, fresh, { spaces: 2 });
    return fresh;
  }
}

export async function writeRegistry(reg: Registry): Promise<void> {
  await ensureApxDirs();
  reg.updatedAt = new Date().toISOString();
  await fs.writeJson(getRegistryPath(), reg, { spaces: 2 });
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
    const idx = entry.cached.findIndex((c) => c.version === cached.version);
    if (idx >= 0) {
      entry.cached[idx] = cached;
    } else {
      entry.cached.push(cached);
    }
  }

  await writeRegistry(reg);
}

export async function getFrameworkEntry(framework: FrameworkId) {
  const reg = await readRegistry();
  return reg.frameworks[framework] ?? null;
}

export async function removeCachedVersion(
  framework: FrameworkId,
  version: string
): Promise<boolean> {
  const reg = await readRegistry();
  const entry = reg.frameworks[framework];
  if (!entry) return false;

  entry.versions = entry.versions.filter((v) => v !== version);
  entry.cached = entry.cached.filter((c) => c.version !== version);

  if (entry.default === version) {
    entry.default = entry.versions[entry.versions.length - 1] ?? '';
  }

  if (entry.versions.length === 0) {
    delete reg.frameworks[framework];
  }

  await writeRegistry(reg);
  return true;
}
