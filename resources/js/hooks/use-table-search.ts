import { useMemo, useState } from 'react';

/**
 * Shared client-side search + pagination logic for admin datatables. This
 * project has no server-side pagination anywhere (confirmed across
 * members/invites) — every table fetches all rows and filters/paginates in
 * JS, so this hook just standardizes that existing pattern instead of
 * introducing a new one.
 */
export function useTableSearch<T>(rows: T[], matches: (row: T, query: string) => boolean, pageSize = 10) {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();

        if (!q) {
            return rows;
        }

        return rows.filter((row) => matches(row, q));
    }, [rows, search, matches]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
    const currentPage = Math.min(page, pageCount);
    const paginated = useMemo(
        () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
        [filtered, currentPage, pageSize],
    );

    function handleSearchChange(next: string) {
        setSearch(next);
        setPage(1);
    }

    return {
        search,
        setSearch: handleSearchChange,
        page: currentPage,
        setPage,
        pageCount,
        filtered,
        paginated,
    };
}
