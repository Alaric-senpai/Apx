import dns from 'dns/promises';

export async function isOnline(timeout = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(false);
      }
    }, timeout);
    if (timer.unref) timer.unref();

    dns
      .lookup('registry.npmjs.org')
      .then(() => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve(true);
        }
      })
      .catch(async () => {
        try {
          const res = await fetch('https://registry.npmjs.org', {
            signal: AbortSignal.timeout(2000),
            method: 'HEAD',
          });
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            resolve(res.ok || res.status < 500);
          }
        } catch {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            resolve(false);
          }
        }
      });
  });
}

export async function getLatestVersion(pkg: string): Promise<string | null> {
  try {
    const encodedPkg = pkg.startsWith('@')
      ? `@${encodeURIComponent(pkg.slice(1))}`
      : encodeURIComponent(pkg);

    const res = await fetch(`https://registry.npmjs.org/${encodedPkg}/latest`, {
      signal: AbortSignal.timeout(5000),
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as { version?: string };
    return typeof data.version === 'string' ? data.version : null;
  } catch {
    return null;
  }
}
