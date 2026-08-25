import { Button } from "../ui/Button";

export interface AdminPaginationMeta { page: number; page_size: number; total: number; total_pages: number }

export function AdminPagination({ meta, onPageChange }: { meta: AdminPaginationMeta; onPageChange: (page: number) => void }) {
  if (meta.total_pages <= 1) return null;
  const first = meta.total === 0 ? 0 : (meta.page - 1) * meta.page_size + 1;
  const last = Math.min(meta.total, meta.page * meta.page_size);
  return <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
    <div className="text-xs text-muted-text">{first}–{last} / {meta.total}</div>
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" disabled={meta.page <= 1} onClick={() => onPageChange(meta.page - 1)}>Előző</Button>
      <span className="min-w-20 text-center text-xs font-semibold text-text">{meta.page} / {meta.total_pages}</span>
      <Button variant="outline" size="sm" disabled={meta.page >= meta.total_pages} onClick={() => onPageChange(meta.page + 1)}>Következő</Button>
    </div>
  </div>;
}
