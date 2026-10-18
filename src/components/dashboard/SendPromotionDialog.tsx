import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { sendCustomerPromotion } from '@/api/endpoints/analytics';
import type { PromotionAudience, PromotionPreset } from '@/types/analytics';
import { errorMessage } from '@/lib/errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface SendPromotionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preset: PromotionPreset | null;
  onSent?: (detail: string) => void;
}

function PromotionForm({
  preset,
  onOpenChange,
  onSent,
}: {
  preset: PromotionPreset | null;
  onOpenChange: (open: boolean) => void;
  onSent?: (detail: string) => void;
}) {
  const [audience, setAudience] = useState<PromotionAudience>(preset?.audience ?? 'all');
  const [subject, setSubject] = useState(preset?.subject ?? '');
  const [message, setMessage] = useState(preset?.message ?? '');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      sendCustomerPromotion({
        audience,
        subject,
        message,
        product_ids: preset?.product_ids ?? [],
      }),
    onSuccess: (res) => {
      onSent?.(res.detail);
      onOpenChange(false);
    },
    onError: (err) => {
      setError(errorMessage(err));
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    mutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="promo_audience">Destinatarios</Label>
        <select
          id="promo_audience"
          value={audience}
          onChange={(e) => setAudience(e.target.value as PromotionAudience)}
          className="block h-9 w-full rounded-md border bg-background px-3 text-sm"
        >
          <option value="all">Todos los clientes activos con correo</option>
          <option value="related_buyers">Clientes que compraron estos productos relacionados (Bundle)</option>
          <option value="inactive">Clientes frecuentes sin compras recientes (Reactivación)</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="promo_subject">Asunto del correo</Label>
        <Input
          id="promo_subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          maxLength={200}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="promo_message">Mensaje promocional</Label>
        <Textarea
          id="promo_message"
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          maxLength={3000}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Enviando correos...' : 'Enviar promoción'}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function SendPromotionDialog({
  open,
  onOpenChange,
  preset,
  onSent,
}: SendPromotionDialogProps) {
  const formKey = open && preset ? `${preset.audience}-${preset.subject}` : 'closed';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Enviar promoción o aviso por correo a clientes</DialogTitle>
          <DialogDescription>
            El mensaje se enviará de forma personalizada con el nombre de cada cliente activo que tenga correo registrado.
          </DialogDescription>
        </DialogHeader>
        <PromotionForm key={formKey} preset={preset} onOpenChange={onOpenChange} onSent={onSent} />
      </DialogContent>
    </Dialog>
  );
}
