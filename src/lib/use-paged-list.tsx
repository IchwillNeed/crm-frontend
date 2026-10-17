import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Page<T> { count: number; next: string | null; previous: string | null; results: T[] }
export function usePagedList<T>(key: string, path: string) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const query = useQuery({ queryKey: [key, 'page', page, search], queryFn: async ({ signal }) => (await apiClient.get<Page<T>>(path, { params: { page, search }, signal })).data });
  function apply(event: FormEvent) { event.preventDefault(); setPage(1); setSearch(draft.trim()); }
  const totalPages = Math.max(1, Math.ceil((query.data?.count ?? 0) / 25));
  const currentPage = Math.min(page, totalPages);
  return {
    data: query.data?.results, isLoading: query.isPending,
    controls: <div className="space-y-3">
      <form onSubmit={apply} className="flex flex-wrap gap-2"><Input aria-label="Buscar en la lista" className="max-w-sm" placeholder="Buscar…" value={draft} onChange={e => setDraft(e.target.value)} /><Button variant="outline">Buscar</Button></form>
      <div className="flex flex-wrap items-center gap-3 text-sm"><span>{query.data?.count ?? 0} registros · Página {currentPage} de {totalPages}</span>
        <Button variant="outline" disabled={!query.data?.previous || query.isFetching} onClick={() => setPage(currentPage - 1)}>Anterior</Button>
        <Button variant="outline" disabled={!query.data?.next || query.isFetching} onClick={() => setPage(currentPage + 1)}>Siguiente</Button>
        {query.isFetching && <span role="status">Cargando…</span>}
      </div>
      {query.isError && <p role="alert">No se pudo cargar la lista. <Button onClick={() => void query.refetch()}>Reintentar</Button></p>}
    </div>,
  };
}
