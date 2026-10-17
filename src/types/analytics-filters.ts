export interface AnalyticsFilters {
  period?: 'today' | 'week' | 'month' | 'year';
  month?: number;
  year?: number;
  from?: string;
  to?: string;
  compare_from?: string;
  compare_to?: string;
}
