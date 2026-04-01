import { MessageCircle } from 'lucide-react';
import { toWhatsAppHref } from '../../lib/contact';

type WhatsAppCTAProps = {
  phone?: string | null;
  label?: string;
  message?: string;
  className?: string;
};

export function WhatsAppCTA({
  phone,
  label = 'WhatsApp us',
  message,
  className,
}: WhatsAppCTAProps) {
  return (
    <a
      href={toWhatsAppHref(phone, message)}
      target="_blank"
      rel="noreferrer"
      className={`group ${
        className ||
        'interactive-button border border-brand-cyan/40 bg-brand-cyan/10 text-brand-cyan hover:bg-brand-cyan/20'
      }`}
    >
      <MessageCircle size={16} className="transition duration-200 group-hover:translate-x-0.5" />
      {label}
    </a>
  );
}
