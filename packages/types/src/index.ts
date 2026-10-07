export type PackageManager = 'pnpm' | 'npm' | 'yarn' | 'bun';

export type FrameworkId =
  | 'nextjs'
  | 'vite-react'
  | 'nestjs'
  | 'angular'
  | 'expo';

export interface PackageAddon {
  id: string;
  name: string;
  description: string;
  version?: string;
  dev?: boolean;
  category?: 'ui' | 'state' | 'utils' | 'testing' | 'database';
}

export interface CachedVersion {
  version: string;
  cachedAt: string;
  templatePath: string;
  packageManager: PackageManager;
  compatibility: {
    node: string;
    os: string[];
  };
  cachedPackages?: string[];
}

export interface FrameworkRegistry {
  versions: string[];
  default: string;
  cached: CachedVersion[];
}

export interface Registry {
  version: string;
  updatedAt: string;
  frameworks: Partial<Record<FrameworkId, FrameworkRegistry>>;
}

export interface SetupOptions {
  version?: string;
  force?: boolean;
  packages?: string[];
}

export interface CreateOptions {
  version?: string;
  offline?: boolean;
  packages?: string[];
  yes?: boolean;
  skipInstall?: boolean;
}

export interface UpdateOptions {
  version?: string;
  offline?: boolean;
  dryRun?: boolean;
}

export interface DoctorResult {
  check: string;
  status: 'ok' | 'warn' | 'fail';
  message: string;
  suggestion?: string;
}

export interface CommandResult {
  success: boolean;
  message?: string;
  error?: string;
}

export type ApxErrorCode =
  | 'NETWORK_REQUIRED'
  | 'FRAMEWORK_NOT_FOUND'
  | 'VERSION_NOT_FOUND'
  | 'PREREQUISITE_MISSING'
  | 'PROJECT_EXISTS'
  | 'CACHE_EMPTY'
  | 'TEMPLATE_ERROR'
  | 'UPDATE_ERROR';
