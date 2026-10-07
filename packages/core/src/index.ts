export {
  APX_DIR,
  REGISTRY_PATH,
  TEMPLATES_DIR,
  LOGS_DIR,
  TEMP_DIR,
  getApxDir,
  getRegistryPath,
  getTemplatesDir,
  getLogsDir,
  getTempDir,
  ensureApxDirs,
  readRegistry,
  writeRegistry,
  registerVersion,
  getFrameworkEntry,
  removeCachedVersion,
} from './registry.js';

export {
  FRAMEWORK_CONFIGS,
  getFrameworkAddons,
  downloadAndCacheTemplate,
  copyTemplateToProject,
  type FrameworkConfig,
} from './template.js';
