import type { ReactNode } from 'react';

interface ChartContainerProps {
  isFetching: boolean;
  loading: boolean;
  hasData: boolean;
  height?: number | string;
  className?: string;
  children: ReactNode;
}

export function ChartContainer({ isFetching, loading, hasData, height, className, children }: ChartContainerProps) {
  return (
    <div className={className} style={{ position: 'relative', overflowX: 'hidden', height }}>
      {isFetching && hasData && (
        <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 10, opacity: 1 }}>
          <div className="w-4 h-4 border-2 border-[#FF5C00] border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <div style={{ opacity: isFetching ? 0.4 : 1, transition: 'opacity 0.3s ease', height: '100%' }}>
        {loading ? (
          <div className="w-full h-full bg-[#1A1A1A] rounded-xl animate-pulse" />
        ) : !hasData ? (
          <p className="text-[#8A8A8A] text-sm text-center py-8">Sin datos en el periodo seleccionado</p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
