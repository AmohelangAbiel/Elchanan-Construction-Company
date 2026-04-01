type AdminFlashProps = {
  message: string;
  tone?: 'success' | 'warning' | 'error';
};

const toneClassMap: Record<NonNullable<AdminFlashProps['tone']>, string> = {
  success: 'border-emerald-400/35 bg-emerald-500/10 text-emerald-100',
  warning: 'border-amber-400/35 bg-amber-500/10 text-amber-100',
  error: 'border-rose-400/35 bg-rose-500/10 text-rose-100',
};

export function AdminFlash({ message, tone = 'success' }: AdminFlashProps) {
  return (
    <div className={`mb-6 rounded-2xl border px-4 py-3 text-sm ${toneClassMap[tone]}`}>
      {message}
    </div>
  );
}
