import { useId, useState } from 'react';
import { errorMessage, fieldErrorMessages } from './errors';

export function useFormFeedback(fields: readonly string[]) {
  const prefix = useId();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState('');
  const errorId = (field: string) => `${prefix}-${field}-error`;
  return {
    errors, summary, errorId,
    props: (field: string) => ({ 'aria-invalid': !!errors[field], 'aria-describedby': errors[field] ? errorId(field) : undefined }),
    clear: (field: string) => { setErrors(previous => { const next = { ...previous }; delete next[field]; return next; }); setSummary(''); },
    serverError: (error: unknown) => {
      const next = fieldErrorMessages(error, fields);
      setErrors(next);
      setSummary(Object.keys(next).length ? 'Revisa los campos marcados e inténtalo nuevamente.' : errorMessage(error));
      const first = document.getElementById(Object.keys(next)[0]);
      first?.focus();
    },
    validate: (form: HTMLFormElement) => {
      const next: Record<string, string> = {};
      let first: HTMLElement | undefined;
      for (const control of Array.from(form.elements)) {
        if (!(control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement || control instanceof HTMLSelectElement) || control.disabled || !control.id) continue;
        let message = '';
        if (control.required && !control.value.trim()) message = 'Completa este campo.';
        else if (control.validity.typeMismatch) message = 'Introduce un correo electrónico válido.';
        else if (control instanceof HTMLInputElement && control.validity.rangeUnderflow) message = `El valor mínimo es ${control.min}.`;
        else if (control instanceof HTMLInputElement && control.validity.rangeOverflow) message = `El valor máximo es ${control.max}.`;
        else if (control.validity.stepMismatch) message = control instanceof HTMLInputElement && control.step === '0.01' ? 'Usa como máximo dos decimales.' : 'Introduce un número entero.';
        else if (!control.validity.valid) message = 'Revisa el valor de este campo.';
        if (message) { next[control.id] = message; first ??= control; }
      }
      setErrors(next);
      setSummary('');
      first?.focus();
      return !first;
    },
  };
}
