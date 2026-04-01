import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

type ContactActionLinkProps = {
  href: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  external?: boolean;
};

export function ContactActionLink({
  href,
  label,
  description,
  icon: Icon,
  external = false,
}: ContactActionLinkProps) {
  const className = 'contact-action-card group block';

  const content = (
    <>
      <div className="flex items-start gap-3">
        <span className="icon-pill transition duration-200 group-hover:border-brand-cyan/70 group-hover:bg-brand-cyan/20">
          <Icon size={18} strokeWidth={2} />
        </span>
        <div>
          <p className="text-sm font-semibold text-white transition group-hover:text-brand-cyan">{label}</p>
          {description ? <p className="mt-1 text-xs text-slate-400">{description}</p> : null}
        </div>
      </div>
    </>
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}
