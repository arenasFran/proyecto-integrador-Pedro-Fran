import React, { forwardRef, useId } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', ...props }, ref) => {
    const generatedId = useId();
    const inputId = props.id ?? generatedId;
    return (
      <div className="flex flex-col gap-1">
        <label className="text-[13px] font-medium text-white" htmlFor={inputId}>
          {label}
          {props.required && (
            <span className="text-[#FF5C00] ml-1" aria-hidden="true">
              *
            </span>
          )}
        </label>
        <div className="relative">
          <input
            ref={ref}
            className={`
              w-full h-[40px] px-3 bg-[#1A1A1A] border rounded-[10px] 
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
            id={inputId}
          />
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

Input.displayName = 'Input';
