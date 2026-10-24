import { useCallback, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { LeaveConfirmationContext, type DraftState } from '@/lib/leave-confirmation';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

export function LeaveConfirmationProvider({ children }: { children: ReactNode }) {
  const reader = useRef<(() => DraftState) | null>(null);
  const onLeave = useRef<(() => void) | null>(null);
  const pending = useRef<((leave: boolean) => void) | null>(null);
  const decision = useRef<Promise<boolean> | null>(null);
  const [open, setOpen] = useState(false);
  const decide = useCallback((leave: boolean) => {
    if (leave) onLeave.current?.();
    pending.current?.(leave);
    pending.current = null;
    decision.current = null;
    setOpen(false);
  }, []);
  const register = useCallback((read: () => DraftState, accept: () => void) => {
    reader.current = read;
    onLeave.current = accept;
    return () => {
      if (reader.current === read) { reader.current = null; onLeave.current = null; decide(false); }
    };
  }, [decide]);
  const confirmLeave = useCallback(() => {
    const state = reader.current?.();
    if (state?.saving) {
      toast.info('Espera a que termine el registro de la venta antes de salir.');
      return Promise.resolve(false);
    }
    if (!state?.dirty) return Promise.resolve(true);
    if (decision.current) return decision.current;
    setOpen(true);
    decision.current = new Promise<boolean>(resolve => { pending.current = resolve; });
    return decision.current;
  }, []);
  return <LeaveConfirmationContext.Provider value={{ register, confirmLeave }}>
    {children}
    <AlertDialog open={open} onOpenChange={next => { if (!next) decide(false); }}>
      <AlertDialogContent onEscapeKeyDown={event => { event.preventDefault(); decide(false); }}>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Salir sin guardar la venta?</AlertDialogTitle>
          <AlertDialogDescription>Los datos de esta venta todavía no se han guardado. Si sales, perderás el borrador. Los clientes que ya creaste se conservarán.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" autoFocus onClick={() => decide(false)}>Seguir editando</Button>
          <Button variant="destructive" onClick={() => decide(true)}>Salir sin guardar</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </LeaveConfirmationContext.Provider>;
}
