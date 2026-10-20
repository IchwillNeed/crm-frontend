import { useQuery } from '@tanstack/react-query';
import { getMySubscription } from '@/api/endpoints/subscription';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { SubscriptionStatus } from '@/types/subscription';

const statusLabels: Record<SubscriptionStatus, string> = {
  active: 'Activa',
  trial: 'En prueba',
  cancelled: 'Cancelada',
  expired: 'Vencida',
};

function UsageRow({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const percent = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const reached = limit !== null && used >= limit;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className={reached ? 'font-semibold text-red-600' : 'text-muted-foreground'}>
          {used} / {limit ?? 'Ilimitado'}
        </span>
      </div>
      {limit !== null && (
        <div
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={limit}
          aria-valuenow={used}
          className="h-2 w-full rounded bg-muted"
        >
          <div className={`h-2 rounded ${reached ? 'bg-red-600' : 'bg-primary'}`} style={{ width: `${percent}%` }} />
        </div>
      )}
    </div>
  );
}

export function PlanTab() {
  const { data, isPending, error, refetch } = useQuery({ queryKey: ['my-subscription'], queryFn: getMySubscription });

  if (isPending) return <Skeleton className="h-40 w-full" />;
  if (error || !data) {
    return (
      <p role="alert">
        No se pudo cargar el plan. <Button onClick={() => void refetch()}>Reintentar</Button>
      </p>
    );
  }

  const { subscription, plan, limits, usage } = data;
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {plan ? plan.name : 'Sin plan asignado'}
            {subscription && <Badge variant={subscription.is_current ? 'default' : 'secondary'}>{statusLabels[subscription.status]}</Badge>}
          </CardTitle>
          <CardDescription>
            {plan
              ? `${plan.description ?? ''} · ${plan.price} / ${plan.billing_period === 'monthly' ? 'mes' : plan.billing_period}`
              : 'Solo consulta hasta que el administrador de la plataforma asigne un plan.'}
          </CardDescription>
        </CardHeader>
        {subscription && (
          <CardContent className="text-sm text-muted-foreground">
            Desde {new Date(subscription.start_date).toLocaleDateString()}
            {subscription.end_date ? ` hasta ${new Date(subscription.end_date).toLocaleDateString()}` : ''}
            {!subscription.is_current && ' · Esta suscripción no está vigente.'}
          </CardContent>
        )}
      </Card>
      <p role="status">{data.access.reason} {data.access.grace_until && `Fin de gracia: ${new Date(data.access.grace_until).toLocaleString()}`}</p>
      <Card>
        <CardHeader>
          <CardTitle>Uso del plan</CardTitle>
          <CardDescription>Para cambiar de plan, contacta con el administrador de la plataforma.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <UsageRow label="Usuarios activos" used={usage.users} limit={limits.users} />
          <UsageRow label="Productos" used={usage.products} limit={limits.products} />
        </CardContent>
      </Card>
    </div>
  );
}

