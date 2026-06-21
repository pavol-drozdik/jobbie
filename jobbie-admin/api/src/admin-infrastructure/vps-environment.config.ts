export type VpsEnvironmentId = 'staging' | 'production';

export type VpsEnvironmentConfig = {
  id: VpsEnvironmentId;
  label: string;
  ssh: {
    host: string;
    user: string;
    keyPath: string | null;
    privateKey: string | null;
  } | null;
  healthUrl: string | null;
  metricsUrl: string | null;
  metricsBearerToken: string | null;
};

export type VpsConfiguredFlags = {
  ssh: boolean;
  health: boolean;
  metrics: boolean;
};

function envKey(prefix: string, suffix: string): string {
  return `${prefix}_${suffix}`;
}

function readEnv(name: string): string | null {
  const v = process.env[name]?.trim();
  return v || null;
}

function buildOne(
  id: VpsEnvironmentId,
  label: string,
  prefix: string,
): VpsEnvironmentConfig {
  const host = readEnv(envKey(prefix, 'SSH_HOST'));
  const user = readEnv(envKey(prefix, 'SSH_USER'));
  const keyPath = readEnv(envKey(prefix, 'SSH_KEY_PATH'));
  const privateKey = readEnv(envKey(prefix, 'SSH_PRIVATE_KEY'));

  const sshConfigured =
    Boolean(host && user && (keyPath || privateKey));

  return {
    id,
    label,
    ssh: sshConfigured
      ? {
          host: host!,
          user: user!,
          keyPath,
          privateKey,
        }
      : null,
    healthUrl: readEnv(envKey(prefix, 'HEALTH_URL')),
    metricsUrl: readEnv(envKey(prefix, 'METRICS_URL')),
    metricsBearerToken: readEnv(envKey(prefix, 'METRICS_BEARER_TOKEN')),
  };
}

export function getVpsEnvironmentConfigs(): VpsEnvironmentConfig[] {
  return [
    buildOne('staging', 'Staging', 'VPS_STAGING'),
    buildOne('production', 'Production', 'VPS_PRODUCTION'),
  ];
}

export function getConfiguredFlags(
  config: VpsEnvironmentConfig,
): VpsConfiguredFlags {
  return {
    ssh: config.ssh !== null,
    health: Boolean(config.healthUrl),
    metrics: Boolean(config.metricsUrl && config.metricsBearerToken),
  };
}
