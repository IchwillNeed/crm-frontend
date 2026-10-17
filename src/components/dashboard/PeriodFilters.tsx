import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { AnalyticsFilters } from '@/types/analytics-filters';

export function PeriodFilters({ onApply }: { onApply: (filters: AnalyticsFilters) => void }) {
  const now = new Date();
  const [period, setPeriod] = useState('current');
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [year, setYear] = useState(String(now.getFullYear()));
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [compare, setCompare] = useState(false);
  const [compareFrom, setCompareFrom] = useState('');
  const [compareTo, setCompareTo] = useState('');
  const [error, setError] = useState('');

  function apply(event: FormEvent) {
    event.preventDefault();
    if ((period === 'custom' && (!from || !to || from > to)) || (compare && (!compareFrom || !compareTo || compareFrom > compareTo))) {
      setError('Completa las fechas y coloca la fecha inicial antes de la final.');
      return;
    }
    const filters: AnalyticsFilters = period === 'custom' ? { from, to }
      : period === 'month' ? { period, year: Number(month.slice(0, 4)), month: Number(month.slice(5)) }
      : period === 'year' ? { period, year: Number(year) }
      : { period: period === 'today' || period === 'week' ? period : 'month' };
    if (compare) Object.assign(filters, { compare_from: compareFrom, compare_to: compareTo });
    setError('');
    onApply(filters);
  }

  return (
    <form onSubmit={apply} className="space-y-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-sm">Período
          <select aria-label="Período" value={period} onChange={e => setPeriod(e.target.value)} className="block h-9 rounded-md border bg-background px-3">
            <option value="current">Mes actual hasta hoy</option><option value="today">Hoy</option><option value="week">Semana actual</option>
            <option value="month">Mes completo</option><option value="year">Año completo</option><option value="custom">Fechas personalizadas</option>
          </select>
        </label>
        {period === 'month' && <label className="text-sm">Mes<Input type="month" required min="1900-01" max="9998-12" value={month} onChange={e => setMonth(e.target.value)} /></label>}
        {period === 'year' && <label className="text-sm">Año<Input type="number" required min="1900" max="9998" value={year} onChange={e => setYear(e.target.value)} /></label>}
        {period === 'custom' && <>
          <label className="text-sm">Desde<Input type="date" required value={from} onChange={e => setFrom(e.target.value)} /></label>
          <label className="text-sm">Hasta<Input type="date" required min={from} value={to} onChange={e => setTo(e.target.value)} /></label>
        </>}
        <Button type="submit">Aplicar período</Button>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={compare} onChange={e => setCompare(e.target.checked)} />Comparar con otras fechas</label>
      {compare && <div className="flex flex-wrap gap-3">
        <label className="text-sm">Comparar desde<Input type="date" required value={compareFrom} onChange={e => setCompareFrom(e.target.value)} /></label>
        <label className="text-sm">Comparar hasta<Input type="date" required min={compareFrom} value={compareTo} onChange={e => setCompareTo(e.target.value)} /></label>
      </div>}
      <p className="text-xs text-muted-foreground">Sin otras fechas se compara con el período anterior. Pulsa Aplicar período para actualizar todos los indicadores.</p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
