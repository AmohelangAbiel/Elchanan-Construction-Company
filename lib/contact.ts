export const DEFAULT_PHONE_DISPLAY =
  process.env.NEXT_PUBLIC_COMPANY_PHONE_DISPLAY || '074 751 2226';

export const DEFAULT_WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '+27747512226';

function digitsOnly(value: string) {
  return value.replace(/\D/g, '');
}

export function toTelHref(phone?: string | null) {
  const source = phone?.trim() || DEFAULT_PHONE_DISPLAY;
  const digits = digitsOnly(source);
  return `tel:${digits || '0747512226'}`;
}

export function getDisplayPhone(phone?: string | null) {
  const source = phone?.trim() || DEFAULT_PHONE_DISPLAY;
  return source || DEFAULT_PHONE_DISPLAY;
}

export function toWhatsAppHref(phone?: string | null, text?: string) {
  const source = phone?.trim() || DEFAULT_WHATSAPP_NUMBER;
  const digits = digitsOnly(source) || '27747512226';

  if (!text) {
    return `https://wa.me/${digits}`;
  }

  const params = new URLSearchParams({ text });
  return `https://wa.me/${digits}?${params.toString()}`;
}

