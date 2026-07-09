import { computeMaxReplicas, parseBackendCapacityJson } from './vps-backend-capacity.util';

describe('computeMaxReplicas', () => {
  it('caps replicas by RAM and CPU for a 4 vCPU / 8 GB VPS', () => {
    expect(computeMaxReplicas(4, 8192)).toBe(2);
  });

  it('returns at least 1 on tiny hosts', () => {
    expect(computeMaxReplicas(1, 1024)).toBe(1);
  });

  it('allows more replicas on larger hosts', () => {
    expect(computeMaxReplicas(8, 16384)).toBe(6);
  });
});

describe('parseBackendCapacityJson', () => {
  it('parses remote capacity JSON line', () => {
    const parsed = parseBackendCapacityJson(
      'noise\n{"current_scale":2,"max_replicas":3,"autoscale_enabled":1,"redis_configured":1,"deploy_lock":0,"cpu_count":4,"mem_total_mb":8192}\n',
    );
    expect(parsed).toEqual({
      current_scale: 2,
      max_replicas: 3,
      autoscale_enabled: true,
      redis_configured: true,
      deploy_lock: false,
      cpu_count: 4,
      mem_total_mb: 8192,
    });
  });
});
