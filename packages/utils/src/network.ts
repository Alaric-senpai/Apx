import dns from 'dns/promises';

export async function isOnline(timeout = 3000): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeout);
    dns
      .lookup('registry.npmjs.org')
      .then(() => {
        clearTimeout(timer);
        resolve(true);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(false);
      });
  });
}

export async function getLatestVersion(
  pkg: string
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://registry.npmjs.org/${pkg}/latest`,
      { signal: AbortSignal.timeout(5000) }
    );
    const data = (await res.json()) as { version: string };
    return data.version;
  } catch {
    return null;
  }
}
