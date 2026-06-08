import React from 'react';

interface LoadingSkeletonProps {
  variant?: 'card' | 'text' | 'circle' | 'rectangle';
  count?: number;
  className?: string;
}

const SkeletonCard = () => (
  <div className="rounded-[16px] border border-[#282828] bg-[#1A1A1A] p-5">
    <div className="h-24 w-full animate-pulse rounded-[12px] bg-[#242424] mb-4" />
    <div className="h-4 w-3/4 animate-pulse rounded bg-[#242424] mb-2" />
    <div className="h-3 w-1/2 animate-pulse rounded bg-[#242424]" />
  </div>
);

const SkeletonText = ({ className }: { className?: string }) => (
  <div className={`h-3 animate-pulse rounded bg-[#242424] ${className ?? 'w-full'}`} />
);

const SkeletonCircle = () => (
  <div className="h-12 w-12 animate-pulse rounded-full bg-[#242424]" />
);

const SkeletonRectangle = () => (
  <div className="h-32 w-full animate-pulse rounded-[12px] bg-[#242424]" />
);

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  variant = 'card',
  count = 3,
  className = '',
}) => {
  const items = Array.from({ length: count }, (_, i) => i);

  if (variant === 'text') {
    return (
      <div className={`flex flex-col gap-3 ${className}`}>
        {items.map((i) => (
          <SkeletonText key={i} className={i === 0 ? 'w-3/4' : 'w-1/2'} />
        ))}
      </div>
    );
  }

  if (variant === 'circle') {
    return (
      <div className={`flex gap-4 ${className}`}>
        {items.map((i) => (
          <SkeletonCircle key={i} />
        ))}
      </div>
    );
  }

  if (variant === 'rectangle') {
    return (
      <div className={`flex flex-col gap-4 ${className}`}>
        {items.map((i) => (
          <SkeletonRectangle key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${className}`}>
      {items.map((i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
};
