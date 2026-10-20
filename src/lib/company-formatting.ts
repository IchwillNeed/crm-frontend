import { useQuery } from '@tanstack/react-query';
import { getMyCompany } from '@/api/endpoints/company';
import { useAuth } from './auth-context';

export function useCompanyFormatting() {
  const { user } = useAuth();
  const { data } = useQuery({ queryKey: ['my-company'], queryFn: getMyCompany, enabled: !!user?.company });
  const currency = data?.settings?.currency ?? 'BOB';
  const timeZone = data?.settings?.timezone ?? 'America/La_Paz';
  const locale = data?.settings?.language ?? 'es';
  return {
    currency, timeZone,
    formatCurrency: (value: number | string | null | undefined) => value == null ? '—' : new Intl.NumberFormat(locale, { style: 'currency', currency }).format(Number(value)),
    formatDate: (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', ...(value.length === 10 ? {} : { timeZone, timeStyle: 'short' as const }) }).format(new Date(value.length === 10 ? `${value}T12:00:00` : value)),
  };
}
