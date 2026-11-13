import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';

interface AdminPageHeaderProps {
  icon: IconType;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}

export default function AdminPageHeader({ icon: Icon, title, description, action, compact = false }: AdminPageHeaderProps) {
  return (
    <div className={`flex items-center justify-between flex-wrap ${compact ? 'gap-2 2xl:gap-4' : 'gap-4'}`}>
      <div className={`flex items-center ${compact ? 'gap-2 2xl:gap-3' : 'gap-3'}`}>
        <div className={`flex items-center justify-center rounded-[12px] bg-[#FF5C00]/10 ${compact ? 'h-8 w-8 2xl:h-10 2xl:w-10' : 'h-10 w-10'}`}>
          <Icon className={`text-[#FF5C00] ${compact ? 'text-base 2xl:text-lg' : 'text-lg'}`} />
        </div>
        <div>
          <h1 className={`font-bold text-white ${compact ? 'text-[18px] 2xl:text-[20px]' : 'text-[20px]'}`}>{title}</h1>
          {description && (
            <p className={`text-[13px] text-[#8A8A8A] ${compact ? 'hidden 2xl:block' : ''}`}>{description}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}
