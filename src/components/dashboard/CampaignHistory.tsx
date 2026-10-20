import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getCampaignHistory, retryRecommendationCampaign } from '@/api/endpoints/analytics';
import type { CampaignExecutionResult } from '@/types/analytics';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { errorMessage } from '@/lib/errors';
import { CampaignImageInput } from './CampaignImageInput';

function Recovery({ campaign }: { campaign: CampaignExecutionResult }) {
  const client = useQueryClient();
  const [result, setResult] = useState(campaign);
  const [image, setImage] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const mutation = useMutation({
    mutationFn: () => retryRecommendationCampaign(result.campaign_id, {
      subject: result.subject, message: result.message, image_data: image, image_name: imageName,
    }),
    onSuccess: data => {
      setResult(data); setConfirmed(false);
      void client.invalidateQueries({queryKey: ['campaign-history']});
      void client.invalidateQueries({queryKey: ['dashboard']});
    },
  });
  return <div className="space-y-3 rounded border p-3 text-sm">
    <p>Campaña #{result.campaign_id} · {result.subject}</p>
    <p>Remitente confirmado: {result.sender?.from_email ?? 'Campaña antigua sin remitente confirmado'}</p>
    <p className="whitespace-pre-wrap">{result.message}</p>
    <p>{result.detail}</p>
    <ul className="max-h-48 overflow-auto space-y-1">
      {result.recipient_statuses.map(r => <li key={r.id}>
        {r.name} ({r.email}): {r.status === 'sent' ? 'Enviado' : r.status === 'unknown'
          ? 'Resultado incierto: no reenviar' : r.status === 'pending' ? 'Pendiente' : 'Rechazado'}
        {r.error_message && <span className="block text-xs">{r.error_message}</span>}
      </li>)}
    </ul>
    {!!result.retryable_count && <>
      {result.image && <>
        <p>Vuelve a seleccionar el archivo original: {result.image.name}.
          El servidor comprobará que sea exactamente la imagen confirmada.</p>
        <CampaignImageInput data={image} name={imageName} disabled={mutation.isPending}
          onPending={setReading} onChange={(data, name) => { setImage(data); setImageName(name); setConfirmed(false); }} />
      </>}
      <label className="flex items-start gap-2">
        <input type="checkbox" checked={confirmed} disabled={reading || mutation.isPending}
          onChange={e => setConfirmed(e.target.checked)} />
        Revisé el mensaje y los destinatarios pendientes o rechazados. Quiero continuar esta campaña.
      </label>
      <Button disabled={!confirmed || reading || mutation.isPending || (!!result.image && !image)}
        onClick={() => mutation.mutate()}>
        {mutation.isPending ? 'Enviando...' : 'Continuar pendientes y reintentar rechazados'}
      </Button>
    </>}
    {mutation.isError && <p role="alert" className="text-destructive">{errorMessage(mutation.error)}</p>}
  </div>;
}

export function CampaignHistory() {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<CampaignExecutionResult | null>(null);
  const query = useQuery({queryKey: ['campaign-history', page], queryFn: () => getCampaignHistory(page), enabled: open});
  return <>
    <Button variant="outline" size="sm" onClick={() => { setSelected(null); setOpen(true); }}>Historial de campañas</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Historial de campañas</DialogTitle>
          <DialogDescription>Consulta los resultados y recupera envíos pendientes. Los enviados y los resultados inciertos nunca se reintentan.</DialogDescription>
        </DialogHeader>
        {query.isPending && <p>Cargando...</p>}
        {query.isError && <p role="alert">{errorMessage(query.error)}</p>}
        {query.data && <div className="space-y-2">
          {!query.data.count && <p>No hay campañas registradas.</p>}
          {query.data.results.map(c => <Button key={c.campaign_id} variant="outline" className="w-full justify-start"
            onClick={() => setSelected(c)}>#{c.campaign_id} · {c.subject} · {c.sent_count}/{c.recipient_count} enviados</Button>)}
          <div className="flex items-center gap-2">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button>
            <span>{query.data.page} / {query.data.pages}</span>
            <Button variant="outline" disabled={page >= query.data.pages} onClick={() => setPage(page + 1)}>Siguiente</Button>
          </div>
        </div>}
        {selected && <Recovery key={selected.campaign_id} campaign={selected} />}
      </DialogContent>
    </Dialog>
  </>;
}
