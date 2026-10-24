import { Inbox, SearchX } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

export function EmptyState({ title, description, searching, clearSearch, children }: {
  title: string; description: string; searching: boolean; clearSearch: () => void; children?: ReactNode;
}) {
  const Icon = searching ? SearchX : Inbox;
  return <div className="mx-auto flex max-w-md flex-col items-center gap-3 whitespace-normal px-4 py-10 text-center">
    <div className="rounded-full bg-muted p-3"><Icon aria-hidden="true" className="size-6 text-muted-foreground" /></div>
    <h2 className="text-base font-semibold text-foreground">{searching ? 'No encontramos coincidencias' : title}</h2>
    <p className="text-sm text-muted-foreground">{searching ? 'Prueba con otro término o limpia la búsqueda para ver todos los registros.' : description}</p>
    {searching ? <Button variant="outline" onClick={clearSearch}>Limpiar búsqueda</Button> : children}
  </div>;
}
