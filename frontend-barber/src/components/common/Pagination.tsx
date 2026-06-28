import React from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const getPageNumbers = (): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    pages.push(1);

    let start = Math.max(2, currentPage - 1);
    let end = Math.min(totalPages - 1, currentPage + 1);

    if (currentPage <= 3) {
      start = 2;
      end = Math.min(maxVisible, totalPages - 1);
    }

    if (currentPage >= totalPages - 2) {
      start = Math.max(2, totalPages - maxVisible + 1);
      end = totalPages - 1;
    }

    if (start > 2) pages.push('ellipsis');

    for (let i = start; i <= end; i++) pages.push(i);

    if (end < totalPages - 1) pages.push('ellipsis');

    pages.push(totalPages);

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#282828] bg-[#1A1A1A] text-[#8A8A8A] hover:text-white hover:border-[#FF5C00] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <FiChevronLeft className="w-4 h-4" />
      </button>

      {pageNumbers.map((page, idx) =>
        page === 'ellipsis' ? (
          <span key={`ellipsis-${idx}`} className="text-[#8A8A8A] px-1">...</span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`flex h-8 min-w-[32px] items-center justify-center rounded-[8px] px-2 text-[13px] font-medium transition-colors ${
              page === currentPage
                ? 'bg-[#FF5C00] text-white'
                : 'border border-[#282828] bg-[#1A1A1A] text-[#8A8A8A] hover:text-white hover:border-[#FF5C00]'
            }`}
          >
            {page}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#282828] bg-[#1A1A1A] text-[#8A8A8A] hover:text-white hover:border-[#FF5C00] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <FiChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};
