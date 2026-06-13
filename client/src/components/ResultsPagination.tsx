import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type ResultsPaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
};

function buildPageItems(currentPage: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items: (number | "ellipsis")[] = [1];

  if (currentPage > 3) items.push("ellipsis");

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  for (let page = start; page <= end; page += 1) {
    items.push(page);
  }

  if (currentPage < totalPages - 2) items.push("ellipsis");

  items.push(totalPages);
  return items;
}

export function ResultsPagination({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false,
}: ResultsPaginationProps) {
  if (totalPages <= 1) return null;

  const pages = buildPageItems(currentPage, totalPages);

  return (
    <Pagination className="justify-center pt-2">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            className={disabled || currentPage <= 1 ? "pointer-events-none opacity-50" : undefined}
            onClick={(event) => {
              event.preventDefault();
              if (disabled || currentPage <= 1) return;
              onPageChange(currentPage - 1);
            }}
          />
        </PaginationItem>

        {pages.map((page, index) =>
          page === "ellipsis" ? (
            <PaginationItem key={`ellipsis-${index}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={page}>
              <PaginationLink
                href="#"
                isActive={page === currentPage}
                className={disabled ? "pointer-events-none opacity-50" : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  if (disabled || page === currentPage) return;
                  onPageChange(page);
                }}
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          )
        )}

        <PaginationItem>
          <PaginationNext
            href="#"
            className={
              disabled || currentPage >= totalPages ? "pointer-events-none opacity-50" : undefined
            }
            onClick={(event) => {
              event.preventDefault();
              if (disabled || currentPage >= totalPages) return;
              onPageChange(currentPage + 1);
            }}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
