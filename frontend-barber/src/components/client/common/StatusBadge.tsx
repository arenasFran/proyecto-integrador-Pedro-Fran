import type { ReactNode } from 'react';

type StatusBadgeProps = {
  label: string;
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  icon?: ReactNode;
};

const toneClasses = {
  neutral: 'border-[#333333] bg-[#1b1b1b] text-[#a0a0a0]',
  accent: 'border-[#FF5C00]/25 bg-[#FF5C00]/10 text-[#FF8A4C]',
  success: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400',
  warning: 'border-amber-500/25 bg-amber-500/10 text-amber-400',
  danger: 'border-red-500/25 bg-red-500/10 text-red-400',
  info: 'border-cyan-500/25 bg-cyan-500/10 text-cyan-400',
  purple: 'border-purple-500/25 bg-purple-500/10 text-purple-400',
} as const;

export function StatusBadge({ label, tone = 'neutral', icon }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${toneClasses[tone]}`}>
      {icon}
      {label}
    </span>
  );
}
