import { useState } from 'react';
import type { CampaignRecipientPreview } from '@/types/analytics';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const PAGE_SIZE = 10;
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function CampaignRecipients({ recipients, selectedIds, disabled, onChange }: {
  recipients: CampaignRecipientPreview[];
  selectedIds: number[];
  disabled: boolean;
  onChange: (ids: number[]) => void;
}) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const selected = new Set(selectedIds);
  const term = normalize(search.trim());
  const matches = recipients.filter(r => normalize(`${r.name} ${r.email}`).includes(term));
  const pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const visible = matches.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const matchedSelected = matches.filter(r => selected.has(r.customer_id)).length;

  function toggleGroup(checked: boolean) {
    const next = new Set(selectedIds);
    for (const recipient of matches) {
      if (checked) next.add(recipient.customer_id);
      else next.delete(recipient.customer_id);
    }
    onChange([...next]);
  }

  return <div className="space-y-3">
    <Input aria-label="Buscar destinatarios" placeholder="Buscar por nombre o correo…" value={search}
      onChange={e => { setSearch(e.target.value); setPage(1); }} />
    <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" variant="outline" disabled={disabled || !matches.length || matchedSelected === matches.length}
        onClick={() => toggleGroup(true)}>{term ? 'Seleccionar coincidencias' : 'Seleccionar todos'}</Button>
      <Button type="button" size="sm" variant="outline" disabled={disabled || matchedSelected === 0}
        onClick={() => toggleGroup(false)}>{term ? 'Quitar coincidencias' : 'Quitar todos'}</Button>
    </div>
    <p role="status">{matches.length} coincidencias · {selected.size} seleccionados en total</p>
    {term && <p className="text-muted-foreground">La búsqueda no cambia la selección. Los botones afectan a todas las coincidencias, incluidas otras páginas.</p>}
    <ul data-testid="campaign-recipient-list" className="max-h-64 space-y-1 overflow-y-auto rounded border bg-background p-2">
      {visible.map(r => <li key={r.customer_id}>
        <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded p-2 hover:bg-muted">
          <input type="checkbox" className="mt-1 shrink-0" aria-label={`Enviar a ${r.name}`}
            checked={selected.has(r.customer_id)} disabled={disabled}
            onChange={e => onChange(e.target.checked ? [...selectedIds, r.customer_id] : selectedIds.filter(id => id !== r.customer_id))} />
          <span className="min-w-0 break-words"><span className="block font-medium">{r.name}</span>
            <span className="block break-all text-muted-foreground">{r.email}</span></span>
        </label>
      </li>)}
      {!matches.length && <li className="p-2 text-muted-foreground">No hay destinatarios que coincidan con la búsqueda.</li>}
    </ul>
    <div className="flex flex-wrap items-center gap-2">
      <span>Página {currentPage} de {pages}</span>
      <Button type="button" size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Destinatarios anteriores</Button>
      <Button type="button" size="sm" variant="outline" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Destinatarios siguientes</Button>
    </div>
  </div>;
}
