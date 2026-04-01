type SectionHeadingProps = {
  title: string;
  subtitle?: string;
  description?: string;
};

export function SectionHeading({ title, subtitle, description }: SectionHeadingProps) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      {subtitle && <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-brand-sky">{subtitle}</p>}
      <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h2>
      {description && <p className="mt-4 text-base leading-7 text-slate-400">{description}</p>}
    </div>
  );
}
