import {
  getConfiguredFlags,
  getVpsEnvironmentConfigs,
} from './vps-environment.config';

describe('vps-environment.config', () => {
  const envBackup = { ...process.env };

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it('detects configured flags from env', () => {
    process.env.VPS_STAGING_SSH_HOST = 'staging.example.com';
    process.env.VPS_STAGING_SSH_USER = 'deploy';
    process.env.VPS_STAGING_SSH_PRIVATE_KEY = 'fake-key';
    process.env.VPS_STAGING_HEALTH_URL = 'https://api.example/health';
    process.env.VPS_STAGING_METRICS_URL = 'https://api.example/metrics';
    process.env.VPS_STAGING_METRICS_BEARER_TOKEN = 'secret';

    const staging = getVpsEnvironmentConfigs().find((c) => c.id === 'staging');
    expect(staging).toBeDefined();
    expect(getConfiguredFlags(staging!)).toEqual({
      ssh: true,
      health: true,
      metrics: true,
    });
  });

  it('requires key path or inline key for ssh', () => {
    process.env.VPS_PRODUCTION_SSH_HOST = 'prod.example.com';
    process.env.VPS_PRODUCTION_SSH_USER = 'deploy';
    delete process.env.VPS_PRODUCTION_SSH_KEY_PATH;
    delete process.env.VPS_PRODUCTION_SSH_PRIVATE_KEY;

    const prod = getVpsEnvironmentConfigs().find((c) => c.id === 'production');
    expect(prod?.ssh).toBeNull();
    expect(getConfiguredFlags(prod!)).toEqual({
      ssh: false,
      health: false,
      metrics: false,
    });
  });
});
