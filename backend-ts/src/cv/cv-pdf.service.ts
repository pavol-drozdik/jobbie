import { Injectable } from '@nestjs/common'
import type { CvAggregateResponseDto } from './cv.dto'
import type { CvDocumentExportData } from './document/cv-document.types'
import { mapAggregateToCvDocumentData } from './document/cv-aggregate-to-export.mapper'
import { CvDocumentPaginateService } from './document/cv-document-paginate.service'
import { StorageUploadService } from '../storage/storage-upload.service'
@Injectable()
export class CvPdfService {
  constructor(
    private readonly documentPaginate: CvDocumentPaginateService,
    private readonly storageUpload: StorageUploadService,
  ) {}

  async buildExportData(model: CvAggregateResponseDto): Promise<CvDocumentExportData> {
    const photoDataUrl = await this.resolvePhotoDataUrl(model)
    return mapAggregateToCvDocumentData(model, {
      profilePhotoDataUrl: photoDataUrl ?? undefined,
    })
  }

  async render(model: CvAggregateResponseDto): Promise<Buffer> {
    const data = await this.buildExportData(model)
    return this.renderFromExportData(data)
  }

  async renderFromExportData(data: CvDocumentExportData): Promise<Buffer> {
    return this.documentPaginate.renderPdfFromExportData(data)
  }

  private async resolvePhotoDataUrl(model: CvAggregateResponseDto): Promise<string | null> {
    const storagePath = (model.cv.photo_storage_path ?? '').trim()
    if (storagePath && this.storageUpload.isPrivateCvPhotoPath(storagePath)) {
      try {
        const signedUrl = await this.storageUpload.createCvPhotoSignedUrl(storagePath, 300)
        return this.fetchUrlAsDataUrl(signedUrl)
      } catch {
        return null
      }
    }
    return this.fetchUrlAsDataUrl(model.cv.photo_url)
  }

  private async fetchUrlAsDataUrl(url: string | null | undefined): Promise<string | null> {
    const u = (url ?? '').trim()
    if (!u || !/^https?:\/\//i.test(u)) {
      return null
    }
    try {
      const res = await fetch(u)
      if (!res.ok) {
        return null
      }
      const buf = Buffer.from(await res.arrayBuffer())
      const mime = res.headers.get('content-type')?.split(';')[0]?.trim() || 'image/jpeg'
      return `data:${mime};base64,${buf.toString('base64')}`
    } catch {
      return null
    }
  }
}
