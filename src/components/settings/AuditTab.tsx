import { usePagedList } from '@/lib/use-paged-list';

interface AuditEvent {
  id: number; actor_name: string; resource: string; object_id: string;
  action: string; changes: Record<string, unknown>; created_at: string;
}

export function AuditTab() {
  const { data, isLoading, controls } = usePagedList<AuditEvent>('audit-events', '/audit-events/');
  return <div className="space-y-4">
    <p>Historial administrativo desde la activación de esta función. Los datos personales y textos se registran como modificados sin copiar su contenido. No acredita cómo se obtuvo una autorización comercial.</p>
    {controls}
    {isLoading && <p>Cargando historial…</p>}
    {data?.length === 0 && <p>No hay cambios registrados.</p>}
    {data?.map(event => <article key={event.id} className="rounded border p-3">
      <p>{new Date(event.created_at).toLocaleString()} · {event.actor_name} · {event.action} · {event.resource} #{event.object_id}</p>
      <details><summary>Campos modificados</summary><pre className="overflow-auto text-xs">{JSON.stringify(event.changes, null, 2)}</pre></details>
    </article>)}
  </div>;
}
