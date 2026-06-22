import React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
export function Pagination({ page, totalPages, totalElements, onPageChange }) {
  const getPageNumbers = () => {
    const current = page + 1;
    const last = totalPages;
    const delta = 1;
    const left = current - delta;
    const right = current + delta + 1;
    const range = [];
    const rangeWithDots = [];
    let l;
    for (let i = 1; i <= last; i++) {
      if (i === 1 || i === last || (i >= left && i < right)) {
        range.push(i);
      }
    }
    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }
    return rangeWithDots;
  };
  const pages = getPageNumbers();
  return (
    <div className="pagination">
      <div className="pagination-info">
         ({totalElements} total items)
      </div>
      <div className="pagination-controls">
        <button
          className="btn icon-only"
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="pagination-numbers">
          {pages.map((p, i) => {
            if (p === '...') {
              return <span key={`ellipsis-${i}`} className="pagination-ellipsis"><MoreHorizontal size={16} /></span>;
            }
            return (
              <button
                key={p}
                className={`btn pagination-num ${page === p - 1 ? 'active' : ''}`}
                onClick={() => onPageChange(p - 1)}
              >
                {p}
              </button>
            );
          })}
        </div>
        <button
          className="btn icon-only"
          disabled={page >= totalPages - 1}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}