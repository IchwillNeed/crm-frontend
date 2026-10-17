import axios from 'axios';

export function errorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) return 'No se pudo completar la operación.';
  const collect = (value: unknown): string[] => {
    if (typeof value === 'string') return [value];
    if (Array.isArray(value)) return value.flatMap(collect);
    if (value && typeof value === 'object') return Object.values(value).flatMap(collect);
    return [];
  };
  return collect(error.response?.data).join(' ') || 'No se pudo conectar con el servidor. Inténtalo nuevamente.';
}
