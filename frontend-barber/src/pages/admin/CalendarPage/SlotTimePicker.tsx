import React, { useRef, useEffect } from 'react';

interface SlotTimePickerProps {
  label: string;
  options: string[];
  value: string;
  onChange: (val: string) => void;
}

const ITEM_H = 44;

export const SlotTimePicker: React.FC<SlotTimePickerProps> = ({ label, options, value, onChange }) => {
  const listRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => { onChangeRef.current = onChange; });

  const currentIndex = options.indexOf(value);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!listRef.current || currentIndex < 0) return;
    listRef.current.scrollTop = currentIndex * ITEM_H;
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    let timeout: ReturnType<typeof setTimeout>;
    const handle = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const idx = Math.round(el.scrollTop / ITEM_H);
        const clamped = Math.max(0, Math.min(idx, options.length - 1));
        if (options[clamped] !== undefined) {
          onChangeRef.current(options[clamped]);
        }
      }, 100);
    };

    el.addEventListener('scroll', handle, { passive: true });
    return () => {
      el.removeEventListener('scroll', handle);
      clearTimeout(timeout);
    };
  }, [options]);

  const visibleH = ITEM_H * 3;

  return (
    <div className="flex flex-col items-center gap-2">
      <label className="text-[13px] font-medium text-white">{label}</label>

      <div className="relative w-full" style={{ height: visibleH }}>
        <div
          className="pointer-events-none absolute inset-0 z-10 rounded-[10px]"
          style={{
            background: `linear-gradient(to bottom, #121212 0%, transparent ${ITEM_H}px, transparent ${visibleH - ITEM_H}px, #121212 100%)`,
          }}
        />

        <div
          ref={listRef}
          className="w-full h-full overflow-y-auto rounded-[10px] border border-[#282828] bg-[#1A1A1A] [scroll-snap-type:y_mandatory]"
          style={{
            paddingTop: ITEM_H,
            paddingBottom: ITEM_H,
          }}
        >
          {options.map((opt) => (
            <div
              key={opt}
              className="flex items-center justify-center h-[44px] text-[15px] font-semibold select-none transition-colors duration-150"
              style={{
                color: opt === value ? '#FFFFFF' : '#505050',
                scrollSnapAlign: 'center',
              }}
            >
              {opt}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
