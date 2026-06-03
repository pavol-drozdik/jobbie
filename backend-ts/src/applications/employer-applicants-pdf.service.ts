import { Injectable } from '@nestjs/common';
import PDFDocument = require('pdfkit');

type PdfDoc = InstanceType<typeof PDFDocument>;

function collectPdfBuffer(doc: PdfDoc): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

export type InvitedListRow = {
  full_name: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  applied_at: string;
};

@Injectable()
export class EmployerApplicantsPdfService {
  async buildInvitedListPdf(input: {
    jobTitle: string;
    companyName: string;
    rows: InvitedListRow[];
  }): Promise<Buffer> {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const done = collectPdfBuffer(doc);
    doc.fontSize(18).text('Zoznam pozvaných na pohovor', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#333333');
    doc.text(input.companyName);
    doc.text(`Ponuka: ${input.jobTitle}`);
    doc.moveDown();
    doc.fontSize(10);
    if (input.rows.length === 0) {
      doc.text('Žiadni pozvaní uchádzači.');
    } else {
      let y = doc.y;
      const col = { name: 50, contact: 200, loc: 340, date: 460 };
      doc.fontSize(9).fillColor('#000000');
      doc.text('Meno', col.name, y);
      doc.text('Kontakt', col.contact, y);
      doc.text('Lokalita', col.loc, y);
      doc.text('Dátum prihlásenia', col.date, y);
      y += 18;
      doc.moveTo(50, y).lineTo(545, y).stroke('#cccccc');
      y += 8;
      doc.fontSize(10).fillColor('#333333');
      for (const r of input.rows) {
        if (y > 720) {
          doc.addPage();
          y = 50;
        }
        const contact = [r.email, r.phone].filter(Boolean).join(' · ') || '—';
        doc.text(r.full_name, col.name, y, { width: 140 });
        doc.text(contact, col.contact, y, { width: 130 });
        doc.text(r.location ?? '—', col.loc, y, { width: 110 });
        doc.text(this.formatDate(r.applied_at), col.date, y, { width: 90 });
        y += 36;
      }
    }
    doc.end();
    return done;
  }

  private formatDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('sk-SK');
  }
}
