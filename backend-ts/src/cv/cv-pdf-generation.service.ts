import { Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import { SupabaseService } from '../supabase/supabase.service'
import { CvService } from './cv.service'
import { CvPdfService } from './cv-pdf.service'
import { CvPdfStorageService } from './cv-pdf-storage.service'
import { hashCvDocumentExportData } from './cv-pdf-content-hash.util'
import { getSafeCvFileName } from './document/cv-document-utils'
import type { CvDocumentExportData } from './document/cv-document.types'
import type { CvAggregateResponseDto } from './cv.dto'

type CvPdfShellRow = {
  id: string
  user_id: string
  pdf_storage_path: string | null
  pdf_content_hash: string | null
  pdf_generation_status: string | null
  display_title: string | null
}

function cvOwnerIdsMatch(shellUserId: string, ownerUserId: string): boolean {
  const a = String(shellUserId ?? '').trim().toLowerCase()
  const b = String(ownerUserId ?? '').trim().toLowerCase()
  return Boolean(a && b && a === b)
}

function isPdfInfraError(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes('playwright') ||
    m.includes('executable') ||
    m.includes('browser') ||
    m.includes('chromium') ||
    m.includes('cv-pdfs') ||
    m.includes('bucket not found') ||
    m.includes('storage')
  )
}

function toPdfUserFacingError(err: unknown): ServiceUnavailableException {
  const msg = err instanceof Error ? err.message : String(err)
  if (msg.includes('Bucket not found') || msg.toLowerCase().includes('cv-pdfs')) {
    return new ServiceUnavailableException(
      'Úložisko PDF nie je pripravené. Aplikujte migráciu 20260629120000_cv_pdfs_storage v Supabase.',
    )
  }
  if (
    msg.includes('Executable') ||
    msg.toLowerCase().includes('playwright') ||
    msg.toLowerCase().includes('chromium')
  ) {
    return new ServiceUnavailableException(
      'PDF renderer nie je nainštalovaný. V priečinku backend-ts spustite: npx playwright install chromium',
    )
  }
  if (isPdfInfraError(msg)) {
    return new ServiceUnavailableException(
      'PDF sa nepodarilo vygenerovať. Skúste znova o chvíľu.',
    )
  }
  return new ServiceUnavailableException(
    'PDF sa nepodarilo vygenerovať. Skúste znova o chvíľu.',
  )
}

function mapShellRowFromDb(row: Record<string, unknown>): CvPdfShellRow {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    pdf_storage_path: (row.pdf_storage_path as string | null | undefined) ?? null,
    pdf_content_hash: (row.pdf_content_hash as string | null | undefined) ?? null,
    pdf_generation_status: (row.pdf_generation_status as string | null | undefined) ?? 'pending',
    display_title: (row.display_title as string | null | undefined) ?? null,
  }
}

@Injectable()
export class CvPdfGenerationService {
  private readonly logger = new Logger(CvPdfGenerationService.name)

  constructor(
    private readonly supabase: SupabaseService,
    private readonly cvPdf: CvPdfService,
    private readonly cvPdfStorage: CvPdfStorageService,
    private readonly moduleRef: ModuleRef,
  ) {}

  buildFilenameFromShell(shell: CvPdfShellRow, agg?: CvAggregateResponseDto): string {
    const cv = agg?.cv
    const first = getSafeCvFileName((cv?.first_name ?? '').trim() || 'uzivatel')
    const last = getSafeCvFileName((cv?.last_name ?? '').trim() || 'cv')
    const titleSlug = getSafeCvFileName(
      (shell.display_title ?? cv?.display_title ?? '').trim() || 'zivotopis',
    )
    const hasPersonalName = Boolean((cv?.first_name ?? '').trim() || (cv?.last_name ?? '').trim())
    if (!hasPersonalName && titleSlug !== 'jobbie-cv') {
      return `jobbie-zivotopis-${titleSlug}.pdf`
    }
    return `jobbie-zivotopis-${first}-${last}.pdf`
  }

  async generateAndStore(cvId: string, userId: string): Promise<void> {
    const shell = await this.loadShell(cvId)
    if (!shell) {
      throw new NotFoundException('CV neexistuje.')
    }
    if (!cvOwnerIdsMatch(shell.user_id, userId)) {
      this.logger.warn(
        `generateAndStore owner mismatch cv=${cvId} row=${shell.user_id} req=${userId}`,
      )
      throw new NotFoundException('CV neexistuje.')
    }
    const aggregate = await this.loadOwnerAggregate(cvId, userId)
    if (!aggregate) {
      this.logger.warn(`generateAndStore aggregate missing cv=${cvId} user=${userId}`)
      throw new NotFoundException('CV neexistuje.')
    }
    const fullExport = await this.cvPdf.buildExportData(aggregate)
    const fullHash = hashCvDocumentExportData(fullExport)
    if (
      shell.pdf_generation_status === 'ready' &&
      shell.pdf_storage_path &&
      shell.pdf_content_hash === fullHash
    ) {
      return
    }
    try {
      await this.generateAndStoreForOwner(cvId, userId, aggregate, fullExport, fullHash)
    } catch (err) {
      if (err instanceof NotFoundException) {
        throw err
      }
      this.logger.warn(`generateAndStore failed for ${cvId}: ${String(err)}`)
    }
  }

  /**
   * Returns stored PDF bytes, generating synchronously when missing or stale.
   */
  /** Owner download: full contact details; uses storage with sync fallback. */
  async getPdfBytesForCv(cvId: string, ownerUserId: string): Promise<{
    buffer: Buffer
    filename: string
  }> {
    try {
      const shell = await this.loadShell(cvId)
      if (!shell) {
        throw new NotFoundException('CV neexistuje.')
      }
      if (!cvOwnerIdsMatch(shell.user_id, ownerUserId)) {
        this.logger.warn(
          `getPdfBytesForCv owner mismatch cv=${cvId} row=${shell.user_id} req=${ownerUserId}`,
        )
        throw new NotFoundException('CV neexistuje.')
      }
      const aggregate = await this.loadOwnerAggregate(cvId, ownerUserId)
      if (!aggregate) {
        this.logger.warn(`getPdfBytesForCv aggregate missing cv=${cvId} user=${ownerUserId}`)
        throw new NotFoundException('CV neexistuje.')
      }
      const filename = this.buildFilenameFromShell(shell, aggregate)
      const fullExport = await this.cvPdf.buildExportData(aggregate)
      const fullHash = hashCvDocumentExportData(fullExport)
      const needsRender =
        shell.pdf_generation_status !== 'ready' ||
        !shell.pdf_storage_path ||
        shell.pdf_content_hash !== fullHash
      if (needsRender) {
        const bytes = await this.generateAndStoreForOwner(
          cvId,
          ownerUserId,
          aggregate,
          fullExport,
          fullHash,
        )
        const refreshed = await this.loadShell(cvId)
        const storedPath = refreshed?.pdf_storage_path ?? shell.pdf_storage_path
        if (
          refreshed?.pdf_generation_status === 'ready' &&
          storedPath
        ) {
          try {
            const buffer = await this.cvPdfStorage.downloadPdf(storedPath)
            return { buffer, filename: this.buildFilenameFromShell(refreshed ?? shell, aggregate) }
          } catch (downloadErr) {
            this.logger.warn(
              `getPdfBytesForCv storage download failed cv=${cvId}, returning rendered bytes: ${String(downloadErr)}`,
            )
          }
        }
        return { buffer: bytes, filename }
      }
      const objectPath =
        shell.pdf_storage_path ?? this.cvPdfStorage.buildObjectPath(ownerUserId, cvId)
      try {
        const buffer = await this.cvPdfStorage.downloadPdf(objectPath)
        return { buffer, filename }
      } catch (downloadErr) {
        this.logger.warn(
          `getPdfBytesForCv stale download failed cv=${cvId}, re-rendering: ${String(downloadErr)}`,
        )
        const bytes = await this.generateAndStoreForOwner(
          cvId,
          ownerUserId,
          aggregate,
          fullExport,
          fullHash,
        )
        return { buffer: bytes, filename }
      }
    } catch (err) {
      if (err instanceof NotFoundException || err instanceof ServiceUnavailableException) {
        throw err
      }
      this.logger.error(`getPdfBytesForCv failed cv=${cvId}: ${String(err)}`)
      throw toPdfUserFacingError(err)
    }
  }

  private async generateAndStoreForOwner(
    cvId: string,
    userId: string,
    aggregate: CvAggregateResponseDto,
    fullExport: CvDocumentExportData,
    fullHash: string,
  ): Promise<Buffer> {
    const objectPath = this.cvPdfStorage.buildObjectPath(userId, cvId)
    await this.markStatus(cvId, 'pending', { pdf_storage_path: objectPath })
    try {
      const bytes = await this.cvPdf.renderFromExportData(fullExport)
      await this.cvPdfStorage.uploadPdf(objectPath, bytes)
      const now = new Date().toISOString()
      const { error } = await this.supabase
        .getClient()
        .from('cvs')
        .update({
          pdf_storage_path: objectPath,
          pdf_content_hash: fullHash,
          pdf_generated_at: now,
          pdf_generation_status: 'ready',
          updated_at: now,
        })
        .eq('id', cvId)
      if (error) {
        const msg = error.message ?? ''
        if (msg.includes('pdf_')) {
          this.logger.warn(
            `PDF metadata update skipped (run migration 20260629120000_cv_pdfs_storage): cv=${cvId} — ${msg}`,
          )
          return bytes
        }
        throw new Error(msg)
      }
      return bytes
    } catch (err) {
      await this.markStatus(cvId, 'failed', {})
      this.logger.warn(`CV PDF generation failed for ${cvId}: ${String(err)}`)
      throw toPdfUserFacingError(err)
    }
  }

  async removeStoredPdf(userId: string, cvId: string, storagePath: string | null): Promise<void> {
    const path = storagePath ?? this.cvPdfStorage.buildObjectPath(userId, cvId)
    await this.cvPdfStorage.removePdf(path)
  }

  private async loadShell(cvId: string): Promise<CvPdfShellRow | null> {
    const { data, error } = await this.supabase
      .getClient()
      .from('cvs')
      .select('*')
      .eq('id', cvId)
      .maybeSingle()
    if (error) {
      this.logger.warn(`loadShell failed for cv ${cvId}: ${error.message}`)
      return null
    }
    if (!data) {
      return null
    }
    return mapShellRowFromDb(data as Record<string, unknown>)
  }

  private async loadOwnerAggregate(
    cvId: string,
    userId: string,
  ): Promise<CvAggregateResponseDto | null> {
    const cvService = this.moduleRef.get(CvService, { strict: false }) as CvService & {
      getOwnerAggregateByCvId?: (
        cvId: string,
        ownerUserId: string,
      ) => Promise<CvAggregateResponseDto | null>
    }
    if (typeof cvService.getOwnerAggregateByCvId === 'function') {
      return cvService.getOwnerAggregateByCvId(cvId, userId)
    }
    return cvService.getAggregateByCvId(cvId, userId)
  }

  private async markStatus(
    cvId: string,
    status: 'pending' | 'ready' | 'failed',
    extra: { pdf_storage_path?: string },
  ): Promise<void> {
    const { error } = await this.supabase
      .getClient()
      .from('cvs')
      .update({
        pdf_generation_status: status,
        ...extra,
      })
      .eq('id', cvId)
    if (error) {
      const msg = error.message ?? ''
      if (msg.includes('pdf_generation_status') || msg.includes('pdf_storage_path')) {
        this.logger.warn(
          `markStatus skipped (PDF columns missing on cvs?): cv=${cvId} — ${msg}`,
        )
        return
      }
      throw new Error(msg)
    }
  }
}
