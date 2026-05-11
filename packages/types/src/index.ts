export type PackageManager = 'pnpm' | 'npm' | 'yarn' | 'bun';

export type FrameworkId =
  | 'nextjs'
  | 'vite-react'
  | 'nestjs'
  | 'angular'
  | 'expo';

export interface CachedVersion {
  version: string;
  cachedAt: string;
  templatePath: string;
  packageManager: PackageManager;
  compatibility: {
    node: string;
    os: string[];
  };
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
}

export interface InitOptions {
  version?: string;
  offline?: boolean;
}

export interface DoctorResult {
  check: string;
  status: 'ok' | 'warn' | 'fail';
  message: string;
}
