import type { Client } from 'ssh2';

let clientCtorPromise: Promise<typeof Client> | null = null;

/**
 * Lazy-load ssh2 so Nest can boot in packaged Electron (native ABI differs from CI Node).
 */
export async function loadSshClientCtor(): Promise<typeof Client> {
  if (!clientCtorPromise) {
    clientCtorPromise = import('ssh2')
      .then((mod) => mod.Client)
      .catch((err: unknown) => {
        clientCtorPromise = null;
        const detail = err instanceof Error ? err.message : String(err);
        throw new Error(
          `SSH module failed to load (${detail}). Infra VPS actions require a compatible ssh2 build.`,
        );
      });
  }
  return clientCtorPromise;
}
