import { Button } from './button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage?: number;
  totalItems?: number;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  totalItems,
}: PaginationProps) {
  const goToFirstPage = () => onPageChange(1);
  const goToLastPage = () => onPageChange(totalPages);
  const goToPreviousPage = () => onPageChange(Math.max(1, currentPage - 1));
  const goToNextPage = () => onPageChange(Math.min(totalPages, currentPage + 1));

  // Genera i numeri di pagina da mostrare
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const showEllipsisThreshold = 7;

    if (totalPages <= showEllipsisThreshold) {
      // Mostra tutte le pagine se sono poche
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Mostra pagine con ellipsis
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Info items */}
      {itemsPerPage && totalItems && (
        <p className="text-sm text-slate-600">
          Mostrando{' '}
          <span className="font-semibold text-slate-900">
            {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)}
          </span>
          {' - '}
          <span className="font-semibold text-slate-900">
            {Math.min(currentPage * itemsPerPage, totalItems)}
          </span>
          {' di '}
          <span className="font-semibold text-slate-900">{totalItems}</span>
          {' risultati'}
        </p>
      )}

      {/* Pagination controls */}
      <div className="flex items-center gap-1">
        {/* First page */}
        <Button
          variant="outline"
          size="icon"
          onClick={goToFirstPage}
          disabled={currentPage === 1}
          className="h-9 w-9 disabled:opacity-50"
          aria-label="Prima pagina"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        {/* Previous page */}
        <Button
          variant="outline"
          size="icon"
          onClick={goToPreviousPage}
          disabled={currentPage === 1}
          className="h-9 w-9 disabled:opacity-50"
          aria-label="Pagina precedente"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Page numbers */}
        <div className="hidden sm:flex items-center gap-1">
          {getPageNumbers().map((page, index) => {
            if (page === '...') {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="flex h-9 w-9 items-center justify-center text-slate-400"
                >
                  ···
                </span>
              );
            }

            return (
              <Button
                key={page}
                variant={currentPage === page ? 'default' : 'outline'}
                onClick={() => onPageChange(page as number)}
                className="h-9 w-9"
              >
                {page}
              </Button>
            );
          })}
        </div>

        {/* Mobile: Current page indicator */}
        <div className="flex sm:hidden items-center justify-center min-w-[80px]">
          <span className="text-sm font-medium text-slate-700">
            {currentPage} / {totalPages}
          </span>
        </div>

        {/* Next page */}
        <Button
          variant="outline"
          size="icon"
          onClick={goToNextPage}
          disabled={currentPage === totalPages}
          className="h-9 w-9 disabled:opacity-50"
          aria-label="Pagina successiva"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Last page */}
        <Button
          variant="outline"
          size="icon"
          onClick={goToLastPage}
          disabled={currentPage === totalPages}
          className="h-9 w-9 disabled:opacity-50"
          aria-label="Ultima pagina"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
