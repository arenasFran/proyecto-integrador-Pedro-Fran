import type { IconType } from 'react-icons';
import { Button } from '../../common/Button';

type ClientStateProps = {
  icon: IconType;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'neutral' | 'danger';
};

export function ClientState({ icon: Icon, title, description, actionLabel, onAction, tone = 'neutral' }: ClientStateProps) {
  const danger = tone === 'danger';

  return (
    <div className={`flex flex-col items-center justify-center rounded-2xl border px-5 py-12 text-center ${danger ? 'border-red-500/25 bg-red-500/[0.06]' : 'border-[#292929] bg-[#121212]'}`}>
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${danger ? 'bg-red-500/10 text-red-400' : 'bg-[#1f1f1f] text-[#8c8c8c]'}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-[15px] font-semibold text-white">{title}</h2>
      {description && <p className="mt-1 max-w-sm text-[12px] leading-5 text-[#818181]">{description}</p>}
      {actionLabel && onAction && <Button className="mt-5" onClick={onAction}>{actionLabel}</Button>}
    </div>
  );
}
