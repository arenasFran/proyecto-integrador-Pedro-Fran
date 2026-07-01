import React from 'react';

interface BarberAvatarProps {
  name: string;
  lastname: string;
  photoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-8 h-8 text-[11px]',
  md: 'w-10 h-10 text-[13px]',
  lg: 'w-14 h-14 text-[18px]',
};

export const BarberAvatar: React.FC<BarberAvatarProps> = ({
  name,
  lastname,
  photoUrl,
  size = 'md',
}) => {
  const initials = `${name.charAt(0)}${lastname.charAt(0)}`.toUpperCase();

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={`${name} ${lastname}`}
        className={`${sizeClasses[size]} rounded-full object-cover border border-[#282828]`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-[#242424] border border-[#282828] flex items-center justify-center font-semibold text-[#8A8A8A]`}
      aria-label={`${name} ${lastname}`}
    >
      {initials}
    </div>
  );
};
