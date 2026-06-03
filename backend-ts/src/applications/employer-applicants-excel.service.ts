import { Injectable } from '@nestjs/common';
import { Workbook } from 'exceljs';
import {
  STATUS_SK_LABELS,
  type ApplicationStatus,
} from './applicant-status.constants';

export type ApplicantExcelRow = {
  full_name: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  applied_at: string;
  status: string;
  availability: string | null;
  salary_display: string | null;
  top_skills: string[];
  internal_note: string | null;
};

@Injectable()
export class EmployerApplicantsExcelService {
  async buildWorkbook(rows: ApplicantExcelRow[]): Promise<Buffer> {
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet('Uchádzači');
    sheet.columns = [
      { header: 'Meno', key: 'name', width: 28 },
      { header: 'E-mail', key: 'email', width: 28 },
      { header: 'Telefón', key: 'phone', width: 16 },
      { header: 'Lokalita', key: 'location', width: 18 },
      { header: 'Prihlásený', key: 'applied', width: 20 },
      { header: 'Status', key: 'status', width: 18 },
      { header: 'Nástup', key: 'availability', width: 16 },
      { header: 'Plat', key: 'salary', width: 16 },
      { header: 'Zručnosti', key: 'skills', width: 36 },
      { header: 'Poznámka', key: 'note', width: 40 },
    ];
    sheet.getRow(1).font = { bold: true };
    for (const row of rows) {
      sheet.addRow({
        name: row.full_name,
        email: row.email ?? '',
        phone: row.phone ?? '',
        location: row.location ?? '',
        applied: this.formatAppliedAt(row.applied_at),
        status: this.statusLabel(row.status),
        availability: row.availability ?? '',
        salary: row.salary_display ?? '',
        skills: row.top_skills.join(', '),
        note: row.internal_note ?? '',
      });
    }
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private statusLabel(status: string): string {
    const key = status as ApplicationStatus;
    return STATUS_SK_LABELS[key] ?? status;
  }

  private formatAppliedAt(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('sk-SK', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
