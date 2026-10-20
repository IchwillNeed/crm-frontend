import { CampaignImageInput } from './CampaignImageInput';
import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  previewRecommendationCampaign,
  sendRecommendationCampaign,
  retryRecommendationCampaign,
} from '@/api/endpoints/analytics';
import type { PromotionPreset, CampaignExecutionResult } from '@/types/analytics';
import type { AnalyticsFilters } from '@/types/analytics-filters';
import { errorMessage } from '@/lib/errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
  filters?: AnalyticsFilters;
  onSent?: (detail: string) => void;
}

function PromotionForm({
  preset,
  filters,
  onOpenChange,
  onSent,
}: {
  preset: PromotionPreset | null;
  filters?: AnalyticsFilters;
  onOpenChange: (open: boolean) => void;
  onSent?: (detail: string) => void;
}) {
  const productAId = preset?.product_a_id ?? preset?.product_ids?.[0];
  const productBId = preset?.product_b_id ?? preset?.product_ids?.[1];

  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<number[] | undefined>(undefined);
  const [subject, setSubject] = useState(preset?.subject ?? '');
  const [message, setMessage] = useState(preset?.message ?? '');
  const [imagePending, setImagePending] = useState(false);
  const [imageData, setImageData] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [executionResult, setExecutionResult] = useState<CampaignExecutionResult | null>(null);

  const previewQuery = useQuery({
    queryKey: ['campaign-preview', productAId, productBId, filters, subject, message, selectedIds, imageData, imageName],
    queryFn: () =>
      previewRecommendationCampaign(
        { product_a_id: productAId!, product_b_id: productBId!, subject, message, selected_customer_ids: selectedIds, image_data: imageData, image_name: imageName },
        filters,
      ),
    enabled: Boolean(productAId && productBId && !executionResult),
    retry: false,
    staleTime: 0,
    placeholderData: keepPreviousData,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });

  const sendMutation = useMutation({
    mutationFn: () => {
      if (!productAId || !productBId) {
        throw new Error('Selecciona el par de productos para la campaña.');
      }
      return sendRecommendationCampaign(
        {
          product_a_id: productAId,
          product_b_id: productBId,
          subject,
          message,
          confirmed,
          selected_customer_ids: previewQuery.data!.selected_customer_ids,
          image_data: imageData,
          image_name: imageName,
          preview_token: previewQuery.data!.preview_token,
          campaign_id: executionResult?.campaign_id,
        },
        filters,
      );
    },
    onSuccess: (res) => {
      setExecutionResult(res);
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['campaign-history'] });
      void queryClient.invalidateQueries({ queryKey: ['campaign-preview'], refetchType: 'none' });
      if (res.failed_count === 0) {
        onSent?.(res.detail);
        onOpenChange(false);
      }
    },
    onError: (err) => {
      setError(errorMessage(err));
    },
  });

  const retryMutation = useMutation({
    mutationFn: () => {
      if (!executionResult?.campaign_id) {
        throw new Error('No hay campaña registrada para reintentar.');
      }
      return retryRecommendationCampaign(executionResult.campaign_id, { subject, message, image_data: imageData, image_name: imageName });
    },
    onSuccess: (res) => {
      setExecutionResult(res);
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['campaign-history'] });
      void queryClient.invalidateQueries({ queryKey: ['campaign-preview'], refetchType: 'none' });
      if (res.failed_count === 0) {
        onSent?.(res.detail);
        onOpenChange(false);
      }
    },
    onError: (err) => {
      setError(errorMessage(err));
    },
  });

  const preview = previewQuery.data;
  const signature = JSON.stringify([preview?.preview_token, productAId, productBId, filters, subject, message, selectedIds, preview?.image?.sha256 ?? null]);
  const confirmed = Boolean(preview && confirmation === signature);
  const recipientCount = preview?.selected_count ?? 0;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (imagePending || !confirmed || previewQuery.isFetching || previewQuery.isError || previewQuery.isPlaceholderData || recipientCount === 0) {
      setError('Debes confirmar explícitamente la audiencia y el mensaje antes de enviar.');
      return;
    }
    sendMutation.mutate();
  };

  if (!productAId || !productBId) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Selecciona una recomendación con evidencia desde la tabla de productos complementarios para revisar su audiencia antes del envío.
        </p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {previewQuery.isLoading && (
        <p className="text-sm text-muted-foreground">Calculando audiencia y evidencia del período...</p>
      )}

      {previewQuery.isError && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          {errorMessage(previewQuery.error)}
        </p>
      )}

      <Button type="button" variant="outline"
        disabled={previewQuery.isFetching || previewQuery.isError || previewQuery.isPlaceholderData || sendMutation.isPending || Boolean(executionResult)}
        onClick={() => { setConfirmation(null); if (selectedIds !== undefined) setSelectedIds(undefined); else void previewQuery.refetch(); }}>
        Actualizar vista previa
      </Button>

      {preview && (
        <div className="space-y-3 rounded-lg border bg-muted/30 p-3 text-xs" data-testid="campaign-preview-summary">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-foreground">Regla aplicada:</span>
            <Badge variant="outline">{preview.rule_label}</Badge>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <span className="text-muted-foreground">Producto comprado (A): </span>
              <span className="font-medium text-foreground">{preview.product_a.name}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Producto recomendado (B): </span>
              <span className="font-medium text-foreground">
                {preview.product_b.name} (Stock: {preview.product_b.stock})
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Período evaluado: </span>
              <span className="font-medium text-foreground">
                {preview.period.start.slice(0, 10)} a {preview.period.end.slice(0, 10)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Evidencia en el período: </span>
              <span className="font-medium text-foreground">
                {preview.supporting_sales_count} venta(s) · {preview.supporting_customers_count} cliente(s) distintos
              </span>
            </div>
          </div>

          <p>Remitente: {preview.sender.from_email}</p>
          <p>Plazo entre promociones del mismo producto: {preview.cooldown_days} día(s).
            {' '}{preview.cooldown_excluded_count} destinatario(s) excluido(s) por contacto reciente o envío en curso.</p>
          <p className="font-semibold">Seleccionados para enviar: {preview.selected_count}</p>
          <div className="space-y-1.5 border-t pt-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">
                Destinatarios elegibles ({preview.recipient_count}):
              </span>
              <span className="text-[11px] text-muted-foreground">
                Con correo y autorización marcada en su ficha (no acredita cómo se obtuvo)
              </span>
            </div>

            {preview.recipient_count === 0 ? (
              <p
                role="status"
                data-testid="empty-audience-alert"
                className="rounded border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-900"
              >
                {preview.empty_audience_message ??
                  'No hay destinatarios elegibles para esta regla en el período seleccionado.'}
              </p>
            ) : (
              <ul
                data-testid="campaign-recipient-list"
                className="max-h-32 space-y-1 overflow-y-auto rounded border bg-background p-2"
              >
                {preview.recipients.map((r) => (
                  <li key={r.customer_id} className="flex items-center justify-between text-xs">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" aria-label={`Enviar a ${r.name}`}
                        checked={(selectedIds ?? preview.selected_customer_ids).includes(r.customer_id)}
                        disabled={previewQuery.isFetching || previewQuery.isError || sendMutation.isPending || Boolean(executionResult)}
                        onChange={e => {
                          setConfirmation(null);
                          setSelectedIds(e.target.checked
                            ? [...preview.selected_customer_ids, r.customer_id]
                            : preview.selected_customer_ids.filter(id => id !== r.customer_id));
                        }} />
                      <span className="font-medium">{r.name}</span>
                    </label>
                    <span className="text-muted-foreground">{r.email}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="promo_subject">Asunto del correo</Label>
        <Input
          id="promo_subject"
          value={subject}
          onChange={(e) => { setSubject(e.target.value); setConfirmation(null); }}
          disabled={sendMutation.isPending || Boolean(executionResult)}
          required
          maxLength={200}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="promo_message">Mensaje para revisar antes del envío</Label>
        <Textarea
          id="promo_message"
          rows={4}
          value={message}
          onChange={(e) => { setMessage(e.target.value); setConfirmation(null); }}
          disabled={sendMutation.isPending || Boolean(executionResult)}
          required
          maxLength={3000}
        />
      </div>

      <CampaignImageInput data={imageData} name={imageName}
        disabled={sendMutation.isPending || Boolean(executionResult)}
        onPending={pending => { setImagePending(pending); setConfirmation(null); }}
        onChange={(data, name) => { setImageData(data); setImageName(name); setConfirmation(null); }} />

      <label className="flex items-start gap-2 rounded-md border p-2.5 text-xs">
        <input
          id="confirm_campaign_send"
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmation(e.target.checked ? signature : null)}
          disabled={imagePending || !preview || previewQuery.isFetching || previewQuery.isError || previewQuery.isPlaceholderData || recipientCount === 0 || sendMutation.isPending}
          className="mt-0.5 h-4 w-4 rounded border"
        />
        <span>
          Confirmo que revisé la regla aplicada, la lista de destinatarios y el mensaje antes de enviar esta campaña.
        </span>
      </label>

      {executionResult && executionResult.failed_count > 0 && (
        <div
          role="alert"
          data-testid="campaign-partial-error-box"
          className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950"
        >
          <p className="font-semibold">{executionResult.detail}</p>
          <ul className="space-y-1">
            {executionResult.recipient_statuses.map((st) => (
              <li key={st.id} className="flex items-center justify-between gap-2">
                <span>
                  {st.name} ({st.email})
                </span>
                <Badge variant={st.status === 'sent' ? 'default' : 'destructive'}>
                  {st.status === 'sent' ? 'Enviado' : st.status === 'unknown' ? 'Resultado incierto: no reenviar' : 'Pendiente o rechazado'}
                </Badge>
              </li>
            ))}
          </ul>
          <Button
            type="button"
             size="sm"
            variant="secondary"
            disabled={retryMutation.isPending || !executionResult.retryable_count}
            onClick={() => retryMutation.mutate()}
          >
            {retryMutation.isPending ? 'Reintentando...' : 'Continuar pendientes y reintentar rechazados'}
          </Button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={
            imagePending || Boolean(executionResult) ||
            sendMutation.isPending ||
            previewQuery.isFetching || previewQuery.isError || previewQuery.isPlaceholderData ||
            !preview ||
            recipientCount === 0 ||
            !confirmed
          }
        >
          {sendMutation.isPending ? 'Enviando campaña...' : 'Confirmar y enviar campaña'}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function SendPromotionDialog({
  open,
  onOpenChange,
  preset,
  filters,
  onSent,
}: SendPromotionDialogProps) {
  const formKey =
    open && preset
      ? JSON.stringify([preset, filters])
      : 'closed';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Revisar y confirmar campaña de recomendación</DialogTitle>
          <DialogDescription>
            Verifica la evidencia del período, la audiencia que compró A pero no B (con autorización de promociones) y el mensaje antes de confirmar el envío.
          </DialogDescription>
        </DialogHeader>
        <PromotionForm
          key={formKey}
          preset={preset}
          filters={filters}
          onOpenChange={onOpenChange}
          onSent={onSent}
        />
      </DialogContent>
    </Dialog>
  );
}
