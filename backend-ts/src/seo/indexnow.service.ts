import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolvePublicAppOrigin } from '../common/public-urls.util';

const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

@Injectable()
export class IndexNowService {
  private readonly logger = new Logger(IndexNowService.name);

  constructor(private readonly config: ConfigService) {}

  private key(): string | null {
    const raw = this.config.get<string>('INDEXNOW_KEY')?.trim();
    return raw || null;
  }

  private origin(): string | null {
    const key = this.key();
    if (!key) return null;
    const origin = resolvePublicAppOrigin(this.config);
    if (!origin || origin.includes('localhost')) {
      return null;
    }
    return origin;
  }

  /** Notify search engines about a newly public listing URL path (e.g. `/ponuka/uuid`). */
  notifyPath(path: string): void {
    const origin = this.origin();
    const key = this.key();
    if (!origin || !key) return;
    const normalized = path.startsWith('/') ? path : `/${path}`;
    const url = `${origin}${normalized}`;
    const host = new URL(origin).host;
    const keyLocation = `${origin}/${key}.txt`;
    void this.postIndexNow({
      host,
      key,
      keyLocation,
      urlList: [url],
    });
  }

  notifyJobPublished(jobId: string): void {
    this.notifyPath(`/ponuka/${jobId}`);
  }

  notifyAdPublished(adId: string): void {
    this.notifyPath(`/profesionali/${adId}`);
  }

  private async postIndexNow(body: {
    host: string;
    key: string;
    keyLocation: string;
    urlList: string[];
  }): Promise<void> {
    try {
      const res = await fetch(INDEXNOW_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        this.logger.debug(
          `IndexNow responded ${res.status} for ${body.urlList.join(', ')}`,
        );
      }
    } catch (err) {
      this.logger.debug(
        `IndexNow request failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
