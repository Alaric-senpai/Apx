import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import dns from 'dns/promises';
import { isOnline, getLatestVersion } from '../network.js';

describe('network utils', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isOnline', () => {
    it('returns true when dns lookup succeeds', async () => {
      vi.spyOn(dns, 'lookup').mockResolvedValueOnce({ address: '104.16.0.0', family: 4 } as any);
      const online = await isOnline(1000);
      expect(online).toBe(true);
    });

    it('returns false when dns lookup rejects', async () => {
      vi.spyOn(dns, 'lookup').mockRejectedValueOnce(new Error('ENOTFOUND'));
      const online = await isOnline(1000);
      expect(online).toBe(false);
    });

    it('returns false when timeout expires first', async () => {
      vi.spyOn(dns, 'lookup').mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({} as any), 500))
      );
      const online = await isOnline(50);
      expect(online).toBe(false);
    });
  });

  describe('getLatestVersion', () => {
    it('fetches version for standard package', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ version: '15.0.0' }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const version = await getLatestVersion('next');
      expect(version).toBe('15.0.0');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://registry.npmjs.org/next/latest',
        expect.any(Object)
      );
    });

    it('properly encodes scoped packages like @nestjs/core', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ version: '10.3.0' }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const version = await getLatestVersion('@nestjs/core');
      expect(version).toBe('10.3.0');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://registry.npmjs.org/@nestjs%2Fcore/latest',
        expect.any(Object)
      );
    });

    it('returns null on 404 response', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
      });
      vi.stubGlobal('fetch', mockFetch);

      const version = await getLatestVersion('non-existent-apx-pkg-xyz');
      expect(version).toBeNull();
    });

    it('returns null on network/fetch error', async () => {
      const mockFetch = vi.fn().mockRejectedValueOnce(new Error('Network offline'));
      vi.stubGlobal('fetch', mockFetch);

      const version = await getLatestVersion('next');
      expect(version).toBeNull();
    });
  });
});
