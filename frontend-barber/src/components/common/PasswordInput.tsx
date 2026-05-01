import React, { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, error, helperText, className = '', ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
      <div className="flex flex-col gap-1">
        <label className="text-[13px] font-medium text-white">
          {label}
          {props.required && <span className="text-[#FF5C00] ml-1">*</span>}
        </label>
        <div className="relative">
          <input
            ref={ref}
            type={showPassword ? 'text' : 'password'}
            className={`
              w-full h-[40px] px-3 pr-10 bg-[#1A1A1A] border rounded-[10px] 
              text-[13px] text-white placeholder:text-[#8A8A8A]
              outline-none transition-all duration-200
              ${error 
                ? 'border-red-500 focus:border-red-500' 
                : 'border-[#282828] focus:border-[#FF5C00]'
              }
              focus:ring-1 focus:ring-[#FF5C00]/20
              disabled:opacity-50 disabled:cursor-not-allowed
              ${className}
            `}
            {...props}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A8A8A] hover:text-white transition-colors p-1"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
        {error && (
          <p className="text-[11px] text-red-500">{error}</p>
        )}
        {helperText && !error && (
          <p className="text-[11px] text-[#8A8A8A]">{helperText}</p>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';