export interface ComparisonMetric {
  current: number;
  previous: number;
  difference: number;
  percentage_change: number;
  trend: 'up' | 'down' | 'stable';
}

export interface DashboardOverview {
  comparison_period: { start: string; end: string };
  period: {
    start: string;
    end: string;
  };
  sales: ComparisonMetric;
  expenses: ComparisonMetric;
  estimated_result: number;
  customers: {
    total: number;
    new: number;
  };
}
