import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

type DataTablePaginationProps = {
    page: number;
    pageCount: number;
    onPageChange: (page: number) => void;
};

export function DataTablePagination({ page, pageCount, onPageChange }: DataTablePaginationProps) {
    if (pageCount <= 1) {
        return null;
    }

    return (
        <div className="flex items-center justify-between border-t border-(--color-ink)/8 px-4 py-3">
            <p className="text-xs text-(--color-ink)/45">
                Halaman {page} dari {pageCount}
            </p>
            <div className="flex items-center gap-1.5">
                <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    disabled={page <= 1}
                    onClick={() => onPageChange(Math.max(1, page - 1))}
                >
                    <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    disabled={page >= pageCount}
                    onClick={() => onPageChange(Math.min(pageCount, page + 1))}
                >
                    <ChevronRight className="h-3.5 w-3.5" />
                </Button>
            </div>
        </div>
    );
}
