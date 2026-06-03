import { ConfigService } from '@nestjs/config';
import { StorageUploadService } from './storage-upload.service';
import { ImageProcessService } from './image-process.service';
import { FileScanService } from './file-scan.service';
import type { SupabaseService } from '../supabase/supabase.service';

describe('StorageUploadService', () => {
  const uploadMock = jest.fn().mockResolvedValue({ error: null });
  const getPublicUrlMock = jest.fn().mockReturnValue({ data: { publicUrl: 'https://cdn.example/a.jpg' } });

  const supabase = {
    getClient: () => ({
      storage: {
        from: () => ({
          upload: uploadMock,
          getPublicUrl: getPublicUrlMock,
        }),
      },
    }),
  } as unknown as SupabaseService;

  const images = {
    processJobPhoto: jest.fn().mockResolvedValue({
      buffer: Buffer.from('jpeg'),
      contentType: 'image/jpeg',
      ext: 'jpg',
    }),
    processProfileAvatar: jest.fn().mockResolvedValue({
      buffer: Buffer.from('jpeg'),
      contentType: 'image/jpeg',
      ext: 'jpg',
    }),
    processCvPhoto: jest.fn().mockResolvedValue({
      buffer: Buffer.from('jpeg'),
      contentType: 'image/jpeg',
      ext: 'jpg',
    }),
    processChatImage: jest.fn().mockResolvedValue({
      buffer: Buffer.from('jpeg'),
      contentType: 'image/jpeg',
      ext: 'jpg',
    }),
  } as unknown as ImageProcessService;

  const fileScan = { scan: jest.fn().mockResolvedValue('skipped') } as unknown as FileScanService;

  let service: StorageUploadService;

  beforeEach(() => {
    jest.clearAllMocks();
    const config = {
      get: () => undefined,
    } as unknown as ConfigService;
    service = new StorageUploadService(supabase, images, fileScan, config);
  });

  it('buildObjectKey uses uuid not client filename', () => {
    const key = service.buildObjectKey('user-1/cover', 'jpg');
    expect(key).toMatch(/^user-1\/cover\/[0-9a-f-]{36}\.jpg$/i);
    expect(key).not.toContain('evil');
  });
});
