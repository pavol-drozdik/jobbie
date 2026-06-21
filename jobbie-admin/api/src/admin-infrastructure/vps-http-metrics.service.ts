import { Injectable } from '@nestjs/common';
import type {
  VpsApiHealthDto,
  VpsAppMetricsDto,
} from './admin-infrastructure.dto';
import { parsePrometheusAppMetrics } from './prometheus-metrics.parser';
import type { VpsEnvironmentConfig } from './vps-environment.config';

const HTTP_TIMEOUT_MS = 10_000;

@Injectable()
export class VpsHttpMetricsService {
  async fetchHealth(
    config: VpsEnvironmentConfig,
  ): Promise<VpsApiHealthDto> {
    if (!config.healthUrl) {
      throw new Error('Health URL not configured');
    }

    const started = Date.now();
    const res = await fetchWithTimeout(config.healthUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    const latency_ms = Date.now() - started;

    if (!res.ok) {
      throw new Error(`Health check HTTP ${res.status}`);
    }

    let health_ok = false;
    try {
      const body = (await res.json()) as { status?: string };
      health_ok = body.status === 'ok';
    } catch {
      health_ok = false;
    }

    return { health_ok, latency_ms };
  }

  async fetchAppMetrics(
    config: VpsEnvironmentConfig,
  ): Promise<VpsAppMetricsDto> {
    if (!config.metricsUrl || !config.metricsBearerToken) {
      throw new Error('Metrics URL or bearer token not configured');
    }

    const res = await fetchWithTimeout(config.metricsUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${config.metricsBearerToken}`,
        Accept: 'text/plain',
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(
        `Metrics HTTP ${res.status}${text ? `: ${text.slice(0, 120)}` : ''}`,
      );
    }

    const text = await res.text();
    return parsePrometheusAppMetrics(text);
  }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('HTTP request timed out');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
