import { useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface ResultPage<T> { results: T[]; count: number; next: string | null; previous: string | null }

export function RemoteSelect<T extends { id: number }>({ path, value, onChange, label, placeholder, params = {} }: {
  path: string; value: T | null; onChange: (value: T | null) => void;
  label: (value: T) => string; placeholder: string; params?: Record<string, string>;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [active, setActive] = useState(-1);
  const query = useQuery({ queryKey: ['remote-select', path, params, search, page], enabled: open,
    queryFn: async ({ signal }) => (await apiClient.get<ResultPage<T>>(path, { signal, params: { ...params, search, page, page_size: 25 } })).data });
  const items = query.data?.results ?? [];
  const select = (item: T) => { onChange(item); setOpen(false); setSearch(''); setActive(-1); };
  return <div className="relative" onBlur={event => {
    if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <div className="flex gap-1">
      <Input placeholder={placeholder} aria-label={placeholder} role="combobox" aria-expanded={open}
        aria-controls={`${id}-list`} aria-autocomplete="list" aria-activedescendant={open && active >= 0 ? `${id}-${active}` : undefined}
        value={open ? search : value ? label(value) : ''}
        onFocus={() => { setOpen(true); setSearch(''); setPage(1); setActive(-1); }}
        onClick={() => { if (!open) { setOpen(true); setSearch(''); setPage(1); setActive(-1); } }}
        onChange={event => { setSearch(event.target.value); setPage(1); setActive(-1); setOpen(true); }}
        onKeyDown={event => {
          if (event.key === 'Escape') setOpen(false);
          if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setActive(Math.min(active + 1, items.length - 1)); }
          if (event.key === 'ArrowUp') { event.preventDefault(); setActive(Math.max(active - 1, 0)); }
          if (event.key === 'Enter' && open && items[active]) { event.preventDefault(); select(items[active]); }
        }} />
      {value && <Button type="button" variant="ghost" aria-label={`Limpiar ${placeholder}`} onClick={() => { onChange(null); setSearch(''); }}>×</Button>}
    </div>
    {open && <div className="absolute z-50 mt-1 w-full rounded border bg-background p-2 shadow-lg"
      onMouseDown={event => { if (event.button === 0) event.preventDefault(); }}>
      {query.isFetching && <p role="status">Buscando…</p>}
      {query.isError && <p role="alert">No se pudo buscar. <Button type="button" onClick={() => void query.refetch()}>Reintentar</Button></p>}
      <div id={`${id}-list`} role="listbox" aria-label={placeholder} className="max-h-56 overflow-auto">
        {items.map((item, index) => <button type="button" role="option" id={`${id}-${index}`} aria-selected={value?.id === item.id}
          key={item.id} className={`block w-full rounded p-2 text-left text-sm hover:bg-muted ${active === index ? 'bg-muted' : ''}`}
          onMouseEnter={() => setActive(index)} onClick={() => select(item)}>{label(item)}</button>)}
      </div>
      {!query.isPending && !query.isError && !items.length && <p>No se encontraron resultados.</p>}
      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
        <Button type="button" variant="outline" disabled={!query.data?.previous || query.isFetching} onClick={() => { setPage(page - 1); setActive(-1); }}>Anterior</Button>
        <span>{query.data?.count ?? 0} resultados</span>
        <Button type="button" variant="outline" disabled={!query.data?.next || query.isFetching} onClick={() => { setPage(page + 1); setActive(-1); }}>Más resultados</Button>
      </div>
    </div>}
  </div>;
}
