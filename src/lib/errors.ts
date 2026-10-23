import axios from 'axios';

const fallback = 'No se pudo completar la operación. Inténtalo nuevamente.';
const translations: Record<string, string> = {
  'This password is too common.': 'Esta contraseña es demasiado común. Usa una combinación más larga y menos predecible.',
  'This password is entirely numeric.': 'La contraseña no puede contener solo números.',
  'This field is required.': 'Completa este campo obligatorio.',
  'Enter a valid email address.': 'Introduce un correo electrónico válido.',
};

// Only validation responses may supply user-facing text, never server tracebacks.
function validationMessages(value: unknown, depth = 0): string[] {
  if (depth > 4) return [];
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text || text.length > 400 || /[<>]|traceback|exception|\bat \S+\s*\(|\b(?:select|insert|update)\b.+\b(?:from|into|set)\b/i.test(text)) return [];
    return [translations[text] ?? text];
  }
  if (Array.isArray(value)) return value.slice(0, 5).flatMap(item => validationMessages(item, depth + 1));
  if (value && typeof value === 'object') {
    return Object.entries(value).filter(([key]) => !['code', 'status', 'trace', 'stack', 'debug'].includes(key))
      .slice(0, 10).flatMap(([, item]) => validationMessages(item, depth + 1));
  }
  return [];
}

export function errorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) return fallback;
  if (!error.response) {
    const writing = !['get', 'head', 'options'].includes(error.config?.method?.toLowerCase() ?? 'get');
    const reason = ['ECONNABORTED', 'ETIMEDOUT'].includes(error.code ?? '')
      ? 'El servidor tardó demasiado en responder.'
      : 'No se pudo conectar con el servidor. Revisa tu conexión.';
    return `${reason} ${writing ? 'No pudimos confirmar el resultado. Revisa si se guardó antes de repetir la operación.' : 'Inténtalo nuevamente.'}`;
  }
  const status = error.response.status;
  if (status >= 500) return 'El servidor no pudo completar la solicitud. Inténtalo más tarde. Si estabas guardando datos, comprueba el resultado antes de repetir la operación.';
  if (status === 401) return 'Tu sesión no es válida o ha vencido. Vuelve a iniciar sesión.';
  if (status === 429) return 'Se hicieron demasiadas solicitudes. Espera un momento antes de volver a intentarlo.';
  if (status === 404) return 'No se encontró el recurso solicitado. Actualiza la página o vuelve a la lista.';
  if ([400, 403, 409, 422].includes(status) && error.response.data && typeof error.response.data === 'object') {
    const messages = [...new Set(validationMessages(error.response.data))].slice(0, 3);
    if (messages.length) return messages.join(' ').slice(0, 600);
  }
  if (status === 403) return 'No tienes permiso para esta acción. Consulta al administrador de tu empresa.';
  return fallback;
}
