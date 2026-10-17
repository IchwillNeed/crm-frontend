import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '@/api/client';
import { errorMessage } from '@/lib/errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function PasswordResetPage() {
  const { uid, token } = useParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (uid && password !== confirmation) { setError('Las contraseñas no coinciden.'); return; }
    setPending(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/password/reset/${uid ? 'confirm/' : ''}`, uid ? { uid, token, new_password: password } : { email }, { timeout: 30000 });
      setMessage(response.data.detail);
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setPending(false); }
  }
  return <main className="flex min-h-screen items-center justify-center p-4"><Card className="w-full max-w-md"><CardHeader><CardTitle>Restablecer contraseña</CardTitle></CardHeader><CardContent className="space-y-4">
    {message ? <p role="status">{message}</p> : <form onSubmit={submit} className="space-y-4">
      {uid ? <>
        <label className="block text-sm">Nueva contraseña<Input type="password" autoComplete="new-password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} /></label>
        <label className="block text-sm">Repetir contraseña<Input type="password" autoComplete="new-password" required value={confirmation} onChange={e => setConfirmation(e.target.value)} /></label>
      </> : <label className="block text-sm">Correo electrónico<Input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>}
      {error && <p role="alert" className="text-destructive">{error}</p>}
      <Button disabled={pending}>{pending ? 'Enviando…' : uid ? 'Guardar contraseña' : 'Enviar enlace'}</Button>
    </form>}
    <Link to="/login" className="block text-sm underline">Volver al inicio de sesión</Link>
  </CardContent></Card></main>;
}
