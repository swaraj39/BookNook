import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({ page, totalPages, totalElements, onPageChange }) {
  const currentPage = Number(page ?? 0);
  const total = Number(totalPages ?? 1);

  const isFirst = currentPage <= 0;
  const isLast = currentPage >= total - 1;

  return (
    <div className="pagination two-block-pagination">
      <div className="pagination-info">
        {totalElements} total items · Page {currentPage + 1} of {total}
      </div>

      <div className="pagination-controls">
        <button
          type="button"
          className="btn pagination-block"
          disabled={isFirst}
          onClick={() => !isFirst && onPageChange(currentPage - 1)}
        >
          <ChevronLeft size={10} />
          Previous
        </button>

        <button
          type="button"
          className="btn pagination-block"
          disabled={isLast}
          onClick={() => !isLast && onPageChange(currentPage + 1)}
        >
          Next
          <ChevronRight size={10} />
        </button>
      </div>
    </div>
  );
}