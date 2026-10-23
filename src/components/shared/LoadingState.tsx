import { useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function LoadingStatus({ label = 'Cargando…', slowMessage = 'Está tardando más de lo habitual. Seguimos esperando la respuesta.' }: { label?: string; slowMessage?: string | false }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!slowMessage) return;
    const timer = window.setTimeout(() => setSlow(true), 10000);
    return () => window.clearTimeout(timer);
  }, [slowMessage]);
  return <span role="status" className="inline-flex max-w-full flex-wrap items-center gap-2 text-sm">
    <LoaderCircle aria-hidden="true" className="size-4 shrink-0 animate-spin motion-reduce:animate-none" />
    <span>{label}</span>
    {slow && slowMessage && <span className="basis-full text-muted-foreground">{slowMessage}</span>}
  </span>;
}

export function PageLoading({ kind = 'table' }: { kind?: 'dashboard' | 'table' | 'form' }) {
  return <div className="w-full space-y-6" aria-busy="true">
    <LoadingStatus label="Cargando pantalla…" />
    <div aria-hidden="true" className="space-y-6">
      <div className="space-y-2"><Skeleton className="h-7 w-40" /><Skeleton className="h-4 w-2/3 max-w-sm" /></div>
      {kind === 'dashboard' ? <>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
        <div className="grid gap-6 lg:grid-cols-2"><Skeleton className="h-72 w-full" /><Skeleton className="h-72 w-full" /></div>
      </> : kind === 'form' ? <div className="grid gap-6 lg:grid-cols-3"><Skeleton className="h-80 w-full lg:col-span-2" /><Skeleton className="h-80 w-full" /></div> :
        <div className="space-y-4 rounded-xl border bg-background p-4"><Skeleton className="h-9 w-full max-w-sm" />{Array.from({ length: 5 }, (_, i) => <div key={i} className="grid grid-cols-3 gap-4"><Skeleton className="h-6" /><Skeleton className="h-6" /><Skeleton className="h-6" /></div>)}</div>}
    </div>
  </div>;
}
