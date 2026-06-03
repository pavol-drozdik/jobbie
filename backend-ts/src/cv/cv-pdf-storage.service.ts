import { Injectable, NotFoundException } from '@nestjs/common'
import { SupabaseService } from '../supabase/supabase.service'
import { BUCKET_CV_PDFS } from '../storage/upload-policy'

@Injectable()
export class CvPdfStorageService {
  constructor(private readonly supabase: SupabaseService) {}

  buildObjectPath(userId: string, cvId: string): string {
    return `${userId}/${cvId}/latest.pdf`
  }

  async uploadPdf(objectPath: string, buffer: Buffer): Promise<void> {
    const { error } = await this.supabase
      .getClient()
      .storage.from(BUCKET_CV_PDFS)
      .upload(objectPath, buffer, {
        contentType: 'application/pdf',
        upsert: true,
      })
    if (error) {
      throw new Error(error.message || 'CV PDF upload failed')
    }
  }

  async downloadPdf(objectPath: string): Promise<Buffer> {
    const { data, error } = await this.supabase
      .getClient()
      .storage.from(BUCKET_CV_PDFS)
      .download(objectPath)
    if (error || !data) {
      throw new NotFoundException('CV PDF not found')
    }
    return Buffer.from(await data.arrayBuffer())
  }

  async removePdf(objectPath: string | null | undefined): Promise<void> {
    const path = (objectPath ?? '').trim()
    if (!path) {
      return
    }
    await this.supabase.getClient().storage.from(BUCKET_CV_PDFS).remove([path])
  }
}
