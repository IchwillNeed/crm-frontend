import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function CampaignImageInput({ disabled, data, name, onChange, onPending }: {
  disabled?: boolean;
  data: string | null;
  name: string | null;
  onChange: (data: string | null, name: string | null) => void;
  onPending: (pending: boolean) => void;
}) {
  const readerRef = useRef<FileReader | null>(null);
  const [error, setError] = useState('');
  useEffect(() => () => readerRef.current?.abort(), []);
  return <div className="space-y-2">
    <label className="block text-sm">Imagen promocional en el mensaje (opcional)
      <Input type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={disabled}
        onChange={e => {
          readerRef.current?.abort();
          readerRef.current = null;
          onChange(null, null);
          onPending(false);
          setError('');
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          if (file.size > 2 * 1024 * 1024) {
            setError('La imagen no debe superar 2 MB.');
            return;
          }
          const reader = new FileReader();
          readerRef.current = reader;
          onPending(true);
          reader.onload = () => {
            if (readerRef.current !== reader) return;
            onChange(typeof reader.result === 'string' ? reader.result : null, file.name);
            onPending(false);
          };
          reader.onerror = () => {
            if (readerRef.current !== reader) return;
            setError('No se pudo leer la imagen.');
            onPending(false);
          };
          reader.readAsDataURL(file);
        }} />
    </label>
    <p className="text-xs text-muted-foreground">La imagen se procesa en memoria y no se guarda en la base de datos.
      Conserva el archivo original: para recuperar una campaña deberás seleccionarlo nuevamente.</p>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {data && <div className="flex items-center gap-2">
      <img src={data} alt={name ?? 'Vista previa'} className="h-20 w-20 object-contain" />
      <span className="text-xs">{name}</span>
      <Button type="button" variant="ghost" disabled={disabled} onClick={() => {
        readerRef.current?.abort(); readerRef.current = null; onPending(false); onChange(null, null);
      }}>Quitar imagen</Button>
    </div>}
  </div>;
}
