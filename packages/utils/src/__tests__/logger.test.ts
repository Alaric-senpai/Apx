import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from '../logger.js';
import { ApxError } from '../errors.js';

describe('logger & error utils', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    logger.setSilent(false);
  });

  afterEach(() => {
    logger.setSilent(false);
  });

  it('toggles silent mode correctly', () => {
    expect(logger.isSilent()).toBe(false);
    logger.setSilent(true);
    expect(logger.isSilent()).toBe(true);
  });

  it('suppresses console logs when silent is true', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logger.setSilent(true);

    logger.info('Test info');
    logger.success('Test success');
    logger.warn('Test warn');
    logger.error('Test error');
    logger.dim('Test dim');
    logger.banner();
    logger.step(1, 3, 'Test step');
    logger.card('Title', ['line 1']);

    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('logs to console when silent is false', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logger.setSilent(false);

    logger.info('Test info');
    logger.success('Test success');
    logger.warn('Test warn');
    logger.error('Test error', 'Try this fix');

    expect(consoleSpy).toHaveBeenCalledTimes(5); // 4 logs + 1 tip
  });

  it('renders badges with different colors', () => {
    const badgeGreen = logger.badge('OK', 'green');
    expect(badgeGreen).toContain('OK');
    const badgeBlue = logger.badge('DEV', 'blue');
    expect(badgeBlue).toContain('DEV');
  });

  it('creates ApxError with code, message, and suggestion', () => {
    const err = new ApxError('NETWORK_REQUIRED', 'No internet connection', 'Plug in cable');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApxError);
    expect(err.name).toBe('ApxError');
    expect(err.code).toBe('NETWORK_REQUIRED');
    expect(err.message).toBe('No internet connection');
    expect(err.suggestion).toBe('Plug in cable');
  });
});
