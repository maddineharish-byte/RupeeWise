import React, { ReactNode } from 'react';

interface MetricCardProps {
  label: string;
  value: string;
  subtext?: string;
  helperRule?: string;
  badge?: {
    text: string;
    type: 'positive' | 'negative' | 'neutral' | 'warning';
  };
  icon?: ReactNode;
  highlight?: boolean;
}

export function MetricCard({
  label,
  value,
  subtext,
  helperRule,
  badge,
  icon,
  highlight = false,
}: MetricCardProps) {
  const badgeColors = {
    positive: 'text-emerald-700 bg-emerald-50 border border-emerald-200/60',
    negative: 'text-rose-700 bg-rose-50 border border-rose-200/60',
    warning: 'text-amber-800 bg-amber-50 border border-amber-200/60',
    neutral: 'text-slate-600 bg-slate-100 border border-slate-200/60',
  };

  return (
    <div
      className={`p-5 rounded-xl border transition-all duration-150 ${
        highlight
          ? 'bg-slate-900 text-white border-slate-800 shadow-sm'
          : 'bg-white text-slate-900 border-slate-200/80 shadow-xs hover:border-slate-300'
      }`}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <span
          className={`text-xs font-medium tracking-wide uppercase ${
            highlight ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          {label}
        </span>
        {icon && (
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              highlight ? 'bg-slate-800 text-slate-200' : 'bg-slate-50 text-slate-600 border border-slate-100'
            }`}
          >
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-2 mt-1">
        <div className="text-2xl lg:text-3xl font-bold tracking-tight font-mono tabular-nums">
          {value}
        </div>
        {badge && (
          <span
            className={`text-xs px-2 py-0.5 rounded font-mono font-medium ${badgeColors[badge.type]}`}
          >
            {badge.text}
          </span>
        )}
      </div>

      {subtext && (
        <p
          className={`text-xs mt-2 leading-relaxed ${
            highlight ? 'text-slate-300' : 'text-slate-600'
          }`}
        >
          {subtext}
        </p>
      )}

      {helperRule && (
        <div
          className={`text-[11px] mt-2 pt-2 border-t font-mono ${
            highlight ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'
          }`}
        >
          {helperRule}
        </div>
      )}
    </div>
  );
}
