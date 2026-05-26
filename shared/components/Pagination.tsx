'use client';

import React from 'react';

interface PaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  /** Optional — when provided, renders a "rows per page" <select>. */
  pageSizeOptions?: number[];
  onPageSizeChange?: (n: number) => void;
}

/**
 * Reusable pagination control matching the style established by /credits.
 * Renders "Showing X-Y of Z" on the left, page-number buttons + Prev/Next on the right.
 *
 * Mobile (≤640px): collapses the numbered buttons to just Prev / Next + "page n of N"
 * so the control stays inside one row.
 */
export function Pagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
  pageSizeOptions,
  onPageSizeChange,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  if (totalCount === 0) return null;
  const showingFrom = (page - 1) * pageSize + 1;
  const showingTo = Math.min(page * pageSize, totalCount);

  // Up to 7 page entries with "..." gaps when far from the ends.
  const pageNumbers: (number | '...')[] = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const out: (number | '...')[] = [1];
    if (page > 3) out.push('...');
    for (let p = Math.max(2, page - 1); p <= Math.min(totalPages - 1, page + 1); p++) out.push(p);
    if (page < totalPages - 2) out.push('...');
    out.push(totalPages);
    return out;
  })();

  return (
    <div className="flex items-center justify-between flex-wrap gap-3 mt-4 text-[0.813rem]">
      <div className="flex items-center gap-3 text-[#8c9097]">
        <span>
          Showing {showingFrom}-{showingTo} of {totalCount}
        </span>
        {pageSizeOptions && onPageSizeChange && (
          <label className="flex items-center gap-1 hidden sm:flex">
            <span>Rows:</span>
            <select
              value={pageSize}
              onChange={e => onPageSizeChange(Number(e.target.value))}
              className="form-select text-xs py-0.5 px-1 border rounded"
            >
              {pageSizeOptions.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="px-3 py-1.5 border border-defaultborder rounded-sm text-defaulttextcolor hover:bg-primary hover:text-white hover:border-primary disabled:opacity-40 disabled:pointer-events-none transition-colors"
          aria-label="Previous page"
        >
          &laquo; Prev
        </button>

        {/* Numbered buttons: hidden on mobile to save space */}
        <span className="hidden sm:flex items-center gap-1">
          {pageNumbers.map((pg, idx) =>
            pg === '...' ? (
              <span key={`gap-${idx}`} className="px-2 text-[#8c9097]" aria-hidden="true">…</span>
            ) : (
              <button
                key={pg}
                type="button"
                onClick={() => onPageChange(pg)}
                aria-current={pg === page ? 'page' : undefined}
                className={`px-3 py-1.5 border rounded-sm transition-colors ${
                  pg === page
                    ? 'bg-primary text-white border-primary'
                    : 'border-defaultborder text-defaulttextcolor hover:bg-primary hover:text-white hover:border-primary'
                }`}
              >
                {pg}
              </button>
            )
          )}
        </span>

        {/* Mobile fallback: just "page X of Y" between Prev/Next */}
        <span className="sm:hidden px-2 text-[#8c9097]">
          {page} / {totalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="px-3 py-1.5 border border-defaultborder rounded-sm text-defaulttextcolor hover:bg-primary hover:text-white hover:border-primary disabled:opacity-40 disabled:pointer-events-none transition-colors"
          aria-label="Next page"
        >
          Next &raquo;
        </button>
      </div>
    </div>
  );
}
