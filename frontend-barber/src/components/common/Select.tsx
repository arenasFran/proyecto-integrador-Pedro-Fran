import React, { useState, useRef, useEffect, useId } from 'react';
import { FiChevronDown } from 'react-icons/fi';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
}

export function Select({ label, value, onChange, options, placeholder = 'Seleccionar...', error }: SelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const listboxId = `select-${generatedId}`;

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open]);

  return (
    <div className="flex flex-col gap-1" ref={ref}>
      <label className="text-[13px] font-medium text-white">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          className={`w-full h-[40px] flex items-center justify-between rounded-[10px] border px-3 text-[13px] text-white outline-none transition-all duration-200
            ${error ? 'border-red-500' : 'border-[#282828]'} 
            bg-[#1A1A1A] focus:border-[#FF5C00] focus:ring-1 focus:ring-[#FF5C00]/20
            ${!selected && !value ? 'text-[#8A8A8A]' : ''}`}
        >
          <span>{selected ? selected.label : placeholder}</span>
          <FiChevronDown className={`text-sm text-[#8A8A8A] transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <ul
            id={listboxId}
            role="listbox"
            tabIndex={-1}
            className="absolute left-0 right-0 z-50 mt-1 rounded-[10px] border border-[#282828] bg-[#1A1A1A] py-1 shadow-xl max-h-60 overflow-y-auto"
          >
            {options.length === 0 && (
              <li className="px-3 py-2 text-[13px] text-[#8A8A8A]">Sin opciones</li>
            )}
            {options.map((opt) => (
              <li
                key={opt.value}
                role="option"
                aria-selected={value === opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`px-3 py-2 text-[13px] cursor-pointer transition-colors
                  ${value === opt.value
                    ? 'bg-[#FF5C00]/10 text-[#FF5C00]'
                    : 'text-white hover:bg-[#282828]'
                  }`}
              >
                {opt.label}
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  );
}
