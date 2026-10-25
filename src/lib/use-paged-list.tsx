import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingStatus } from '@/components/shared/LoadingState';
import { listFilterConfig } from './list-filter-config';
import { errorMessage } from './errors';

interface Page<T> { count: number; next: string | null; previous: string | null; results: T[] }
export function usePagedList<T>(key: string, path: string) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const config = listFilterConfig[key];
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [filterDraft, setFilterDraft] = useState<Record<string, string>>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const query = useQuery({ meta: { inlineErrors: true }, queryKey: [key, 'page', page, search, filters], queryFn: async ({ signal }) => (await apiClient.get<Page<T>>(path, { params: { page, search, ...filters }, signal })).data });
  function apply(event: FormEvent) { event.preventDefault(); setPage(1); setSearch(draft.trim()); setFilters(filterDraft); }
  function clearSearch() { setSearch(''); setDraft(''); setPage(1); setFilters({}); setFilterDraft({}); }
  const activeFilters = Object.values(filters).filter(Boolean).length;
  const selectClass = 'h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm';
  const totalPages = Math.max(1, Math.ceil((query.data?.count ?? 0) / 25));
  const currentPage = Math.min(page, totalPages);
  return {
    searching: search !== '' || activeFilters > 0,
    clearSearch,
    data: query.data?.results, isLoading: query.isPending,
    controls: <div className="space-y-3 p-3 sm:p-4">
      <form onSubmit={apply} className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Input aria-label="Buscar en la lista" className="min-w-0 flex-1 basis-40 sm:max-w-sm" placeholder="Buscar…" value={draft} onChange={e => setDraft(e.target.value)} />
          <Button variant="outline">Buscar</Button>
          {config && <Button type="button" variant="outline" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(!filtersOpen)}>Filtros{activeFilters > 0 ? ` (${activeFilters})` : ''}</Button>}
          {(search || activeFilters > 0) && <Button type="button" variant="ghost" onClick={clearSearch}>Limpiar filtros</Button>}
        </div>
        {config && filtersOpen && <div className="space-y-3 rounded-md border bg-muted/20 p-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="min-w-0 space-y-1 text-sm"><span>{config.monthLabel}</span>
              <Input type="month" placeholder="AAAA-MM" min="0001-01" max="9998-12" value={filterDraft.month ?? ''} onChange={e => setFilterDraft({ ...filterDraft, month: e.target.value })} /></label>
            <label className="min-w-0 space-y-1 text-sm"><span>Ordenar por</span>
              <select aria-label="Ordenar por" className={selectClass} value={filterDraft.sort ?? ''} onChange={e => setFilterDraft({ ...filterDraft, sort: e.target.value })}>
                <option value="">Orden predeterminado</option>{config.sort.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select></label>
            {config.fields.map(field => <label key={field.key} className="min-w-0 space-y-1 text-sm"><span>{field.label}</span>
              <select aria-label={field.label} className={selectClass} value={filterDraft[field.key] ?? ''} onChange={e => setFilterDraft({ ...filterDraft, [field.key]: e.target.value })}>
                <option value="">Todos</option>{field.choices.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select></label>)}
          </div>
          <p className="text-xs text-muted-foreground">Los filtros se aplican a todos los registros, no solo a esta página.</p>
          <div className="flex flex-wrap gap-2"><Button type="submit">Aplicar filtros</Button><Button type="button" variant="outline" onClick={clearSearch}>Restablecer</Button></div>
        </div>}
      </form>
      <div className="flex flex-wrap items-center gap-3 text-sm">{query.data && <span>{query.data.count} registros · Página {currentPage} de {totalPages}</span>}
        <div className="flex items-center gap-3">
          <Button variant="outline" disabled={!query.data?.previous || query.isFetching} onClick={() => setPage(currentPage - 1)}>Anterior</Button>
          <Button variant="outline" disabled={!query.data?.next || query.isFetching} onClick={() => setPage(currentPage + 1)}>Siguiente</Button>
        </div>
        {query.isFetching && <LoadingStatus label={query.data ? 'Actualizando lista…' : 'Cargando lista…'} />}
      </div>
      {query.isError && <p role="alert">No se pudo cargar la lista. {errorMessage(query.error)} <Button onClick={() => void query.refetch()}>Reintentar</Button></p>}
    </div>,
  };
}
