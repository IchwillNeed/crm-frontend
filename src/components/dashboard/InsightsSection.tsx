import { CampaignHistory } from './CampaignHistory';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import {
  Lightbulb,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  PackagePlus,
  Repeat,
  Mail,
  Send,
} from 'lucide-react';
import { sendInsightsEmail } from '@/api/endpoints/analytics';
import type { DashboardInsights, PromotionPreset, CommercialRecommendation } from '@/types/analytics';
import type { AnalyticsFilters } from '@/types/analytics-filters';
import { errorMessage } from '@/lib/errors';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { SendPromotionDialog } from './SendPromotionDialog';

interface InsightsSectionProps {
  insights?: DashboardInsights;
  loading?: boolean;
  filters?: AnalyticsFilters;
}

export function InsightsSection({ insights, loading, filters = {} }: InsightsSectionProps) {
  const [promoPreset, setPromoPreset] = useState<PromotionPreset | null>(null);
  const [promoOpen, setPromoOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const summaryEmailMutation = useMutation({
    mutationFn: () => sendInsightsEmail(filters),
    onSuccess: (res) => {
      setFeedback({ type: 'success', text: res.detail });
    },
    onError: (err) => {
      setFeedback({ type: 'error', text: errorMessage(err) });
    },
  });

  if (loading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (!insights || !insights.enabled) {
    return null;
  }

  const recommendations = insights.recommendations ?? [];
  const hasContent =
    insights.insights.length > 0 ||
    insights.frequent_pairs.length > 0 ||
    recommendations.length > 0 ||
    insights.restock_suggestions.length > 0;

  function openPromotion(preset: PromotionPreset) {
    setPromoPreset(preset);
    setPromoOpen(true);
  }

  function openRecommendationCampaign(rec: CommercialRecommendation) {
    openPromotion({
      audience: 'bought_a_not_b',
      product_a_id: rec.product_a_id,
      product_a_name: rec.product_a_name,
      product_b_id: rec.product_b_id,
      product_b_name: rec.product_b_name,
      supporting_sales_count: rec.supporting_sales_count,
      supporting_customers_count: rec.supporting_customers_count,
      period: rec.period,
      subject: rec.suggested_subject,
      message: rec.suggested_message,
      product_ids: [rec.product_a_id, rec.product_b_id],
    });
  }

  const periodLabel = `${insights.period.start.slice(0, 10)} a ${insights.period.end.slice(0, 10)}`;
  const minEvidence = insights.min_evidence_required ?? 2;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3 space-y-0 pb-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-lg">Inteligencia, Sugerencias y Recomendaciones Comerciales</CardTitle>
              <Badge variant="secondary">Período: {periodLabel}</Badge>
              <Badge variant="outline">Mín. {minEvidence} ventas y clientes distintos de respaldo</Badge>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <CampaignHistory />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={summaryEmailMutation.isPending}
              onClick={() => {
                setFeedback(null);
                summaryEmailMutation.mutate();
              }}
            >
              <Mail className="mr-1.5 h-3.5 w-3.5" />
              {summaryEmailMutation.isPending ? 'Enviando...' : 'Enviar resumen a mi correo'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {feedback && (
            <p
              role="status"
              className={`rounded-md border px-3 py-2 text-xs ${
                feedback.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-red-200 bg-red-50 text-red-800'
              }`}
            >
              {feedback.text}
            </p>
          )}

          {!hasContent ? (
            <p className="text-sm text-muted-foreground">
              No hay suficiente evidencia en el período ({periodLabel}, mínimo {minEvidence} ventas conjuntas netas y clientes distintos) para sugerir recomendaciones firmes.
            </p>
          ) : (
            <>
              {insights.insights.length > 0 && (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {insights.insights.map((item) => {
                    const Icon =
                      item.type === 'warning'
                        ? AlertTriangle
                        : item.type === 'success'
                          ? CheckCircle2
                          : Lightbulb;
                    const iconColor =
                      item.type === 'warning'
                        ? 'text-amber-600'
                        : item.type === 'success'
                          ? 'text-emerald-600'
                          : 'text-blue-600';

                    return (
                      <div
                        key={item.id}
                        className="flex flex-col justify-between gap-3 rounded-lg border bg-card p-4 shadow-xs"
                      >
                        <div className="flex items-start gap-3">
                          <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconColor}`} />
                          <div className="space-y-1">
                            <p className="text-sm font-semibold leading-none">{item.title}</p>
                            <p className="text-xs text-muted-foreground">{item.description}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap justify-end gap-2 print:hidden">
                          {item.promotion_preset && (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => openPromotion(item.promotion_preset!)}
                            >
                              <Send className="mr-1.5 h-3.5 w-3.5" />
                              Revisar audiencia y campaña
                            </Button>
                          )}
                          {item.action_label && item.action_path && (
                            <Button asChild variant="outline" size="sm">
                              <Link to={item.action_path}>
                                {item.action_label}
                                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                              </Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {recommendations.length > 0 && (
                  <div className="space-y-2 lg:col-span-2">
                    <div className="flex items-center justify-between gap-2 text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <Repeat className="h-4 w-4 text-muted-foreground" />
                        <span>Recomendaciones comerciales (&ldquo;Compró A, no compró B&rdquo;)</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Período: {periodLabel}
                      </span>
                    </div>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Quienes compraron (A)</TableHead>
                            <TableHead>Recomendar (B)</TableHead>
                            <TableHead className="text-right">Respaldo en el período</TableHead>
                            <TableHead className="text-right">Audiencia elegible</TableHead>
                            <TableHead className="text-right print:hidden">Acción</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {recommendations.map((rec) => (
                            <TableRow key={`${rec.product_a_id}->${rec.product_b_id}`}>
                              <TableCell className="text-sm font-medium">{rec.product_a_name}</TableCell>
                              <TableCell className="text-sm">
                                <span className="font-medium">{rec.product_b_name}</span>
                                <span className="ml-1.5 text-xs text-muted-foreground">
                                  (Stock: {rec.product_b_stock})
                                </span>
                              </TableCell>
                              <TableCell className="text-right text-xs">
                                <span className="font-semibold">{rec.supporting_sales_count}</span> venta(s) ·{' '}
                                <span className="font-semibold">{rec.supporting_customers_count}</span> cliente(s) distintos
                              </TableCell>
                              <TableCell className="text-right text-xs font-semibold">
                                {rec.eligible_recipients_count} destinatario(s)
                              </TableCell>
                              <TableCell className="text-right print:hidden">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => openRecommendationCampaign(rec)}
                                >
                                  <Send className="mr-1 h-3 w-3" />
                                  Revisar y enviar
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {insights.frequent_pairs.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Repeat className="h-4 w-4 text-muted-foreground" />
                      <span>Pares comprados juntos ({periodLabel})</span>
                    </div>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Combinación de productos</TableHead>
                            <TableHead className="text-right">Evidencia</TableHead>
                            <TableHead className="text-right print:hidden">Campaña</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {insights.frequent_pairs.map((pair) => (
                            <TableRow key={`${pair.product_a_id}-${pair.product_b_id}`}>
                              <TableCell className="text-sm">
                                <span className="font-medium">{pair.product_a_name}</span>
                                <span className="mx-1.5 text-muted-foreground">+</span>
                                <span className="font-medium">{pair.product_b_name}</span>
                              </TableCell>
                              <TableCell className="text-right text-xs">
                                <span className="font-semibold">
                                  {pair.supporting_sales_count ?? pair.times_bought_together}
                                </span>{' '}
                                venta(s) ·{' '}
                                <span className="font-semibold">
                                  {pair.supporting_customers_count ?? 0}
                                </span>{' '}
                                cliente(s) distintos
                              </TableCell>
                              <TableCell className="text-right print:hidden">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() =>
                                    openPromotion({
                                      audience: 'bought_a_not_b',
                                      product_a_id: pair.product_a_id,
                                      product_a_name: pair.product_a_name,
                                      product_b_id: pair.product_b_id,
                                      product_b_name: pair.product_b_name,
                                      supporting_sales_count:
                                        pair.supporting_sales_count ?? pair.times_bought_together,
                                      supporting_customers_count: pair.supporting_customers_count ?? 0,
                                      period: pair.period ?? insights.period,
                                      subject: `Complementa tu ${pair.product_a_name} con ${pair.product_b_name}`,
                                      message: `Gracias por tu compra de ${pair.product_a_name}. Quienes lo eligieron también aprovecharon ${pair.product_b_name}. ¡Escríbenos si deseas conocer disponibilidad y precio!`,
                                      product_ids: [pair.product_a_id, pair.product_b_id],
                                    })
                                  }
                                >
                                  <Send className="mr-1 h-3 w-3" />
                                  Ofrecer B a compradores de A
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {insights.restock_suggestions.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <PackagePlus className="h-4 w-4 text-muted-foreground" />
                      <span>Sugerencias de reposición por velocidad de venta</span>
                    </div>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Producto</TableHead>
                            <TableHead className="text-right">Stock actual</TableHead>
                            <TableHead className="text-right">Vendidos netos</TableHead>
                            <TableHead className="text-right">Sugerido</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {insights.restock_suggestions.map((r) => (
                            <TableRow key={r.product_id}>
                              <TableCell className="text-sm font-medium">{r.name}</TableCell>
                              <TableCell className="text-right text-sm">{r.current_stock}</TableCell>
                              <TableCell className="text-right text-sm">{r.quantity_sold_period}</TableCell>
                              <TableCell className="text-right font-semibold text-amber-600">
                                +{r.suggested_restock} uds.
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <SendPromotionDialog
        open={promoOpen}
        onOpenChange={setPromoOpen}
        preset={promoPreset}
        filters={filters}
        onSent={(detail) => setFeedback({ type: 'success', text: detail })}
      />
    </div>
  );
}
