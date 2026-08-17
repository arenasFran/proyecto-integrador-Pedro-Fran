import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';

type ClientPageShellProps = {
  eyebrow: string;
  icon: IconType;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function ClientPageShell({
  eyebrow,
  icon: Icon,
  actions,
  children,
  className = '',
}: ClientPageShellProps) {
  return (
    <div className={`min-h-[calc(100dvh-2rem)] bg-[#080808] text-white ${className}`}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <header className="flex items-center justify-between gap-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#2a2a2a] bg-[#151515] px-3 py-1.5 text-[11px] font-medium text-[#9a9a9a]">
            <Icon className="text-[#FF7A33]" aria-hidden="true" />
            {eyebrow}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
        {children}
      </div>
    </div>
  );
}
