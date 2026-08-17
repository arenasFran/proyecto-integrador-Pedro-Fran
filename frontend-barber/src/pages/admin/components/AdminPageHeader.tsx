import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';

interface AdminPageHeaderProps {
  icon: IconType;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}

export default function AdminPageHeader({ icon: Icon, title, description, action }: AdminPageHeaderProps) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#FF5C00]/10">
          <Icon className="text-[#FF5C00] text-lg" />
        </div>
        <div>
          <h1 className="text-[20px] font-bold text-white">{title}</h1>
          {description && <p className="text-[13px] text-[#8A8A8A]">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
