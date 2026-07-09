import {
  parseBackendInstances,
  validateBackendContainerName,
} from './vps-backend-instances.util';
import type { VpsHostMetricsDto } from './admin-infrastructure.dto';

describe('parseBackendInstances', () => {
  const host: VpsHostMetricsDto = {
    hostname: 'vps',
    uptime_seconds: 100,
    cpu_count: 4,
    load_1: 0.2,
    load_5: 0.1,
    load_15: 0.1,
    memory_total_bytes: 8_000_000_000,
    memory_available_bytes: 4_000_000_000,
    memory_used_bytes: 4_000_000_000,
    disk_root: null,
    disk_typesense: null,
    containers: [
      {
        Name: 'nestjs-typesense-backend-1',
        ID: 'abc',
        CPUPerc: '12.50%',
        MemUsage: '400MiB / 8GiB',
        MemPerc: '5.00%',
      },
      {
        Name: 'nestjs-typesense-backend-2',
        ID: 'def',
        CPUPerc: '33.10%',
        MemUsage: '420MiB / 8GiB',
        MemPerc: '5.20%',
      },
      {
        Name: 'nestjs-typesense-caddy-1',
        CPUPerc: '1.00%',
      },
    ],
    compose_ps: [
      {
        Name: 'nestjs-typesense-backend-1',
        Service: 'backend',
        Status: 'Up 2 hours (healthy)',
        Health: 'healthy',
      },
      {
        Name: 'nestjs-typesense-backend-2',
        Service: 'backend',
        Status: 'Up 2 hours (healthy)',
        Health: 'healthy',
      },
    ],
  };

  it('returns backend replicas with merged stats and compose status', () => {
    const rows = parseBackendInstances(host);
    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe('nestjs-typesense-backend-1');
    expect(rows[0].cpu_percent).toBe(12.5);
    expect(rows[0].health).toBe('healthy');
    expect(rows[1].cpu_percent).toBe(33.1);
  });
});

describe('validateBackendContainerName', () => {
  it('accepts compose backend container names', () => {
    expect(validateBackendContainerName('nestjs-typesense-backend-1')).toBe(
      true,
    );
  });

  it('rejects unrelated containers', () => {
    expect(validateBackendContainerName('nestjs-typesense-caddy-1')).toBe(false);
    expect(validateBackendContainerName('backend;rm -rf')).toBe(false);
  });
});
