import type { NamedValue, TrendPoint } from '../../../../lib/analytics';

type LineChartProps = {
  title: string;
  subtitle?: string;
  data: TrendPoint[];
  accent?: 'cyan' | 'blue' | 'sky';
};

function getAccentClasses(accent: LineChartProps['accent']) {
  if (accent === 'blue') return 'text-brand-blue';
  if (accent === 'sky') return 'text-brand-sky';
  return 'text-brand-cyan';
}

export function MiniTrendChart({ title, subtitle, data, accent = 'cyan' }: LineChartProps) {
  const safeData = data.length ? data : [{ key: 'none', label: 'No data', value: 0 }];
  const maxValue = Math.max(...safeData.map((point) => point.value), 1);
  const hasAnyValue = safeData.some((point) => point.value > 0);

  const points = safeData.map((point, index) => {
    const x = safeData.length === 1 ? 50 : (index / (safeData.length - 1)) * 100;
    const y = 94 - (point.value / maxValue) * 84;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');

  const latest = safeData[safeData.length - 1]?.value || 0;
  const previous = safeData[safeData.length - 2]?.value || 0;
  const delta = latest - previous;
  const deltaLabel = hasAnyValue ? `${delta >= 0 ? '+' : ''}${delta}` : 'No data';

  return (
    <section className="interactive-card rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">{title}</h3>
          {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
        </div>
        <p className={`text-xs font-semibold ${getAccentClasses(accent)}`}>{deltaLabel}</p>
      </div>

      <div className="mt-4 h-28">
        <svg viewBox="0 0 100 100" className={`h-full w-full ${getAccentClasses(accent)}`} preserveAspectRatio="none" aria-hidden>
          <polyline
            points="0,94 100,94"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.18"
            strokeWidth="1.2"
            strokeDasharray="2 2"
          />
          <polyline
            points={points}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span>{safeData[0]?.label}</span>
        <span className="text-slate-300">{hasAnyValue ? `Latest: ${latest}` : 'No activity in range'}</span>
        <span>{safeData[safeData.length - 1]?.label}</span>
      </div>
    </section>
  );
}

type DistributionBarsProps = {
  title: string;
  items: NamedValue[];
  emptyMessage: string;
};

export function DistributionBars({ title, items, emptyMessage }: DistributionBarsProps) {
  const max = Math.max(...items.map((item) => item.value), 1);
  const hasPositiveValues = items.some((item) => item.value > 0);

  return (
    <section className="interactive-card rounded-2xl p-5">
      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">{title}</h3>
      {items.length && hasPositiveValues ? (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div key={item.label}>
              <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                <span className="truncate">{item.label}</span>
                <span className="text-slate-200">{item.value}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-blue via-brand-sky to-brand-cyan"
                  style={{ width: item.value > 0 ? `${Math.max(4, (item.value / max) * 100)}%` : '0%' }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-sm text-slate-400">{emptyMessage}</p>
      )}
    </section>
  );
}
