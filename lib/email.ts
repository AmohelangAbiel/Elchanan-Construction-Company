import { sanitizeText } from './sanitize';
import { logInfo, logWarn } from './logger';

type EmailRecipient = string | string[];

type EmailMessage = {
  to: EmailRecipient;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

type EmailSendResult = {
  ok: boolean;
  provider: 'smtp' | 'console';
  skipped?: boolean;
  error?: string;
};

function sanitizeEmailText(value: unknown, maxLength = 20000) {
  if (typeof value !== 'string') return '';

  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLength);
}

function parseRecipientList(input: string | undefined) {
  if (!input) return [] as string[];

  return input
    .split(',')
    .map((item) => sanitizeText(item, 320).toLowerCase())
    .filter(Boolean);
}

function toAddressList(to: EmailRecipient) {
  if (Array.isArray(to)) {
    return to.map((email) => sanitizeText(email, 320).toLowerCase()).filter(Boolean);
  }

  const single = sanitizeText(to, 320).toLowerCase();
  return single ? [single] : [];
}

function resolveFromAddress() {
  return (
    sanitizeText(process.env.EMAIL_FROM, 320) ||
    sanitizeText(process.env.SEED_ADMIN_EMAIL, 320) ||
    'no-reply@localhost'
  );
}

function resolveReplyTo() {
  return sanitizeText(process.env.EMAIL_REPLY_TO, 320) || undefined;
}

function resolveProvider(): 'smtp' | 'console' {
  const value = sanitizeText(process.env.EMAIL_PROVIDER, 24).toLowerCase();
  return value === 'smtp' ? 'smtp' : 'console';
}

function getSmtpConfig() {
  const host = sanitizeText(process.env.SMTP_HOST, 255);
  const portValue = Number(process.env.SMTP_PORT || '587');
  const user = sanitizeText(process.env.SMTP_USER, 320);
  const pass = process.env.SMTP_PASS || '';
  const secureValue = sanitizeText(process.env.SMTP_SECURE, 12).toLowerCase();

  if (!host || !Number.isFinite(portValue) || !user || !pass) {
    return null;
  }

  return {
    host,
    port: portValue,
    secure: ['true', '1', 'yes'].includes(secureValue),
    user,
    pass,
  };
}

export function getAdminAlertRecipients() {
  return parseRecipientList(process.env.EMAIL_ADMIN_ALERTS);
}

export async function sendEmail(message: EmailMessage): Promise<EmailSendResult> {
  const recipients = toAddressList(message.to);
  if (!recipients.length) {
    return { ok: false, provider: 'console', skipped: true, error: 'No recipients provided.' };
  }

  const normalizedMessage = {
    from: resolveFromAddress(),
    to: recipients.join(', '),
    subject: sanitizeText(message.subject, 220),
    text: sanitizeEmailText(message.text, 20000),
    html: message.html,
    replyTo: message.replyTo || resolveReplyTo(),
  };

  if (resolveProvider() === 'smtp') {
    const smtpConfig = getSmtpConfig();

    if (smtpConfig) {
      try {
        const nodemailer = await import('nodemailer');
        const transport = nodemailer.createTransport({
          host: smtpConfig.host,
          port: smtpConfig.port,
          secure: smtpConfig.secure,
          auth: {
            user: smtpConfig.user,
            pass: smtpConfig.pass,
          },
        });

        await transport.sendMail(normalizedMessage);
        return { ok: true, provider: 'smtp' };
      } catch (error) {
        logWarn('email.smtp_send_failed', {
          subject: normalizedMessage.subject,
          reason: error instanceof Error ? error.message : 'SMTP send failed.',
        });
        return {
          ok: false,
          provider: 'smtp',
          error: error instanceof Error ? error.message : 'SMTP send failed.',
        };
      }
    }
  }

  logInfo('email.console_fallback', {
    to: normalizedMessage.to,
    subject: normalizedMessage.subject,
    textPreview: normalizedMessage.text.slice(0, 240),
  });

  return { ok: true, provider: 'console', skipped: true };
}


