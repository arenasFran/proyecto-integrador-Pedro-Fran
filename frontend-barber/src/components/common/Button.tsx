import React from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface ButtonProps {
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'sm',
  loading = false,
  icon: Icon,
  iconPosition = 'left',
  className = '',
  disabled,
  type = 'button',
  onClick,
}) => {
  const baseStyles = `
    inline-flex items-center justify-center gap-2 font-medium
    rounded-[12px] transition-all duration-200
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  const variants = {
    primary: 'bg-[#FF5C00] text-white hover:bg-[#FF5C00]/90 active:scale-[0.98]',
    secondary: 'bg-[#242424] text-white hover:bg-[#242424]/80 active:scale-[0.98]',
    outline: 'border border-[#282828] text-white hover:border-[#FF5C00] hover:text-[#FF5C00] active:scale-[0.98]',
    ghost: 'text-[#8A8A8A] hover:text-white hover:bg-[#1A1A1A] active:scale-[0.98]',
  };

  const sizes = {
    sm: 'h-[40px] px-4 text-[13px]',
    md: 'h-[44px] px-5 text-[14px]',
    lg: 'h-[48px] px-6 text-[15px]',
  };

  return (
    <motion.button
      whileHover={!disabled && !loading ? { scale: 1.02 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      type={type}
      onClick={onClick}
    >
      {loading ? (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
        />
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon className="w-5 h-5" />}
          {children}
          {Icon && iconPosition === 'right' && <Icon className="w-5 h-5" />}
        </>
      )}
    </motion.button>
  );
};