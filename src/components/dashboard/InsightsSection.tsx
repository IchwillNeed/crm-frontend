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
import type { DashboardInsights, PromotionPreset } from '@/types/analytics';
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

  const hasContent =
    insights.insights.length > 0 ||
    insights.frequent_pairs.length > 0 ||
    insights.restock_suggestions.length > 0;

  function openPromotion(preset: PromotionPreset) {
    setPromoPreset(preset);
    setPromoOpen(true);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3 space-y-0 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-lg">Inteligencia, Sugerencias y Promociones</CardTitle>
            <Badge variant="secondary">Fase 6 — Intelligence</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
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
            <Button
              type="button"
              size="sm"
              onClick={() =>
                openPromotion({
                  audience: 'all',
                  subject: '¡Promociones y novedades especiales para ti!',
                  message:
                    'Te compartimos nuestras ofertas y combos destacados de la semana. ¡Contáctanos para hacer tu pedido!',
                  product_ids: [],
                })
              }
            >
              <Send className="mr-1.5 h-3.5 w-3.5" />
              Enviar promoción a clientes
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
              Registra más ventas y movimientos en este período para desbloquear patrones de compra y sugerencias inteligentes.
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
                              Promocionar por email
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
                {insights.frequent_pairs.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Repeat className="h-4 w-4 text-muted-foreground" />
                      <span>Patrones de compra (Comprados juntos)</span>
                    </div>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Combinación de productos</TableHead>
                            <TableHead className="text-right">Veces juntos</TableHead>
                            <TableHead className="text-right print:hidden">Acción</TableHead>
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
                              <TableCell className="text-right font-semibold">
                                {pair.times_bought_together}
                              </TableCell>
                              <TableCell className="text-right print:hidden">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() =>
                                    openPromotion({
                                      audience: 'related_buyers',
                                      subject: `Promo Combo: ${pair.product_a_name} + ${pair.product_b_name}`,
                                      message: `Sabemos que te gustan nuestros productos y armamos una promoción especial combinando ${pair.product_a_name} + ${pair.product_b_name}. ¡Escríbenos para aprovecharla!`,
                                      product_ids: [pair.product_a_id, pair.product_b_id],
                                    })
                                  }
                                >
                                  <Send className="mr-1 h-3 w-3" />
                                  Promocionar
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
                            <TableHead className="text-right">Vendidos</TableHead>
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
        onSent={(detail) => setFeedback({ type: 'success', text: detail })}
      />
    </div>
  );
}
