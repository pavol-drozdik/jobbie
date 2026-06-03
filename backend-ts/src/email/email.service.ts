import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import type { Transporter } from 'nodemailer';

function smtpErrorDetail(err: unknown): string {
  if (!(err instanceof Error)) {
    return String(err);
  }
  const smtpErr = err as Error & {
    code?: string;
    responseCode?: number;
    command?: string;
  };
  const parts = [smtpErr.message]
  if (smtpErr.code) {
    parts.push(`code=${smtpErr.code}`)
  }
  if (smtpErr.responseCode != null) {
    parts.push(`response=${smtpErr.responseCode}`)
  }
  if (smtpErr.command) {
    parts.push(`command=${smtpErr.command}`)
  }
  return parts.join(' ')
}

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null | undefined;
  private verifyOnBootDone = false;

  constructor(private readonly config: ConfigService) {}

  /** True when `SMTP_HOST` and `SMTP_FROM` are set (minimum to send). */
  isConfigured(): boolean {
    const host = this.config.get<string>('SMTP_HOST')?.trim();
    const from = this.config.get<string>('SMTP_FROM')?.trim();
    return Boolean(host && from);
  }

  async onModuleInit(): Promise<void> {
    const verifyFlag = this.config
      .get<string>('SMTP_VERIFY_ON_BOOT')
      ?.trim()
      .toLowerCase();
    if (verifyFlag !== 'true' && verifyFlag !== '1') {
      return;
    }
    if (!this.isConfigured()) {
      this.logger.warn(
        'SMTP_VERIFY_ON_BOOT is set but SMTP_HOST/SMTP_FROM are missing',
      );
      return;
    }
    await this.verifyTransporterOnBoot();
  }

  private async verifyTransporterOnBoot(): Promise<void> {
    if (this.verifyOnBootDone) {
      return;
    }
    this.verifyOnBootDone = true;
    try {
      const transporter = this.getTransporter();
      await transporter.verify();
      this.logger.log('SMTP transporter verified on boot');
    } catch (err) {
      this.logger.warn(`SMTP verify on boot failed: ${smtpErrorDetail(err)}`);
    }
  }

  async sendHtmlEmail(params: {
    to: string;
    subject: string;
    html: string;
  }): Promise<boolean> {
    if (!this.isConfigured()) {
      this.logger.warn(
        'SMTP not configured (SMTP_HOST, SMTP_FROM); skipping email send',
      );
      return false;
    }
    const from = this.config.get<string>('SMTP_FROM')!.trim();
    try {
      const transporter = this.getTransporter();
      await transporter.sendMail({
        from,
        to: params.to,
        subject: params.subject,
        html: params.html,
      });
      return true;
    } catch (err) {
      this.logger.warn(`SMTP send failed: ${smtpErrorDetail(err)}`);
      return false;
    }
  }

  private getTransporter(): Transporter {
    if (this.transporter !== undefined) {
      return this.transporter!;
    }
    const host = this.config.get<string>('SMTP_HOST')!.trim();
    const portRaw = this.config.get<string>('SMTP_PORT')?.trim();
    const port = portRaw ? Number.parseInt(portRaw, 10) : 587;
    const secureExplicit = this.config
      .get<string>('SMTP_SECURE')
      ?.trim()
      .toLowerCase();
    const secure =
      secureExplicit === 'true' || secureExplicit === '1'
        ? true
        : secureExplicit === 'false' || secureExplicit === '0'
          ? false
          : port === 465;
    const user = this.config.get<string>('SMTP_USER')?.trim();
    const pass = this.config.get<string>('SMTP_PASS');

    const options: SMTPTransport.Options = {
      host,
      port: Number.isFinite(port) ? port : 587,
      secure,
      auth: user ? { user, pass: pass ?? '' } : undefined,
    };
    this.transporter = nodemailer.createTransport(options);
    return this.transporter;
  }
}
