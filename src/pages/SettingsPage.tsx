import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyCompany, updateMyCompany, updateMyCompanySettings } from '@/api/endpoints/company';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Pencil, UserX, Plus } from 'lucide-react';
import { getCompanyUsers, deactivateCompanyUser, updateCompanyUser } from '@/api/endpoints/users';
import type { CompanyUser } from '@/types/user';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { UserFormDialog } from '@/components/users/UserFormDialog';
import { AuditTab } from '@/components/settings/AuditTab';
import { PlanTab } from '@/components/subscription/PlanTab';

import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/permissions';
import { apiClient } from '@/api/client';
import type { Company, CompanySettings } from '@/types/company';
export function SettingsPage() {
  const { can } = usePermissions();
  const { data: company, isPending, error, refetch } = useQuery({ queryKey: ['my-company'], queryFn: getMyCompany });
  return <div className="space-y-6">
    <h1 className="text-2xl font-bold">Configuración</h1>
    <Tabs defaultValue="account"><TabsList className="flex flex-wrap h-auto">
      <TabsTrigger value="account">Mi cuenta</TabsTrigger>
      {can('settings') && <><TabsTrigger value="company">Empresa</TabsTrigger><TabsTrigger value="preferences">Preferencias</TabsTrigger><TabsTrigger value="users">Usuarios</TabsTrigger><TabsTrigger value="audit">Historial</TabsTrigger></>}
      {can('plan.read') && <TabsTrigger value="plan">Plan</TabsTrigger>}
    </TabsList>
      <TabsContent value="account"><AccountTab /><p className="mt-4 text-sm text-muted-foreground">Cerrar sesión revoca todas las sesiones de tu cuenta, incluidos otros dispositivos.</p></TabsContent>
      {can('settings') && <>
        {isPending && <Skeleton className="h-32 w-full" />}
        {error && <p role="alert">No se pudo cargar la empresa. <Button onClick={() => void refetch()}>Reintentar</Button></p>}
        {company && <>
          <TabsContent value="company"><CompanyTab key={company.id} company={company} /></TabsContent>
          <TabsContent value="preferences"><PreferencesTab key={JSON.stringify(company.settings)} settings={company.settings} /></TabsContent>
        </>}
        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="audit"><AuditTab /></TabsContent>
      </>}
      {can('plan.read') && <TabsContent value="plan"><PlanTab /></TabsContent>}
    </Tabs>
  </div>;
}

const companyFields = [
  ['name', 'Nombre comercial'], ['business_name', 'Razón social'], ['email', 'Email'], ['phone', 'Teléfono'],
  ['address', 'Dirección'], ['city', 'Ciudad'], ['country', 'País'], ['website', 'Sitio web'],
] as const;
function CompanyTab({ company }: { company: Company }) {
  const [form, setForm] = useState<Partial<Company>>(company);
  const mutation = useMutation({ mutationFn: updateMyCompany, onSuccess: () => toast.success('Empresa actualizada') });
  function submit(event: FormEvent) {
    event.preventDefault();
    const website = form.website?.trim();
    mutation.mutate({ ...Object.fromEntries(companyFields.map(([key]) => [key, form[key] || (key === 'name' ? '' : null)])), description: form.description,
      website: website ? (/^https?:\/\//i.test(website) ? website : `https://${website}`) : null });
  }
  return <Card><CardHeader><CardTitle>Datos de la empresa</CardTitle></CardHeader><CardContent>
    <form onSubmit={submit} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2">
      {companyFields.map(([key, label]) => <label key={key} className="space-y-2 text-sm">{label}<Input value={form[key] ?? ''} required={key === 'name'} type={key === 'email' ? 'email' : 'text'} onChange={e => setForm({ ...form, [key]: e.target.value })} /></label>)}
    </div><Label htmlFor="company-description">Descripción</Label><Textarea id="company-description" value={form.description ?? ''} onChange={e => setForm({ ...form, description: e.target.value })} />
      <Button disabled={mutation.isPending}>Guardar empresa</Button>
    </form>
  </CardContent></Card>;
}
function PreferencesTab({ settings }: { settings: CompanySettings }) {
  const queryClient = useQueryClient();
  const [currency, setCurrency] = useState(settings?.currency ?? 'BOB');
  const [timezone, setTimezone] = useState(settings?.timezone ?? 'America/La_Paz');
  const [language, setLanguage] = useState(settings?.language ?? 'es');
  const [cooldownDays, setCooldownDays] = useState(settings?.campaign_cooldown_days ?? 7);
  const [enableRecommendations, setEnableRecommendations] = useState(settings?.enable_recommendations ?? true);
  const [smtpSenderName, setSmtpSenderName] = useState(settings?.smtp_sender_name ?? '');
  const [smtpUser, setSmtpUser] = useState(settings?.smtp_user ?? '');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpHost, setSmtpHost] = useState(settings?.smtp_host || 'smtp.gmail.com');


  const mutation = useMutation({
    mutationFn: updateMyCompanySettings,
    onSuccess: () => {
      setSmtpPassword('');
      queryClient.invalidateQueries({ queryKey: ['my-company'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Preferencias actualizadas');
    },
  });
  return <Card><CardHeader><CardTitle>Moneda, campañas y correo del negocio</CardTitle><CardDescription>La moneda cambia la presentación; no convierte importes históricos. El idioma define el formato de números y fechas; la interfaz del MVP está en español.</CardDescription></CardHeader><CardContent>
    <form onSubmit={e => {
      e.preventDefault();
      mutation.mutate({
        currency,
        timezone,
        language,
        enable_recommendations: enableRecommendations,
        campaign_cooldown_days: cooldownDays,
        smtp_sender_name: smtpSenderName,
        smtp_user: smtpUser,
        smtp_host: smtpHost || 'smtp.gmail.com',
        smtp_port: 587,
        smtp_use_tls: true,
        ...(smtpPassword.trim() ? { smtp_password: smtpPassword } : {}),
      });
    }} className="space-y-4">
      <label className="block text-sm">Moneda<select aria-label="Moneda" className="block w-full rounded border bg-background p-2" value={currency} onChange={e => setCurrency(e.target.value)}>{['BOB','USD','EUR','PEN','ARS','BRL','CLP','COP','MXN','PYG','UYU'].map(code => <option key={code}>{code}</option>)}</select></label>
      <label className="block text-sm">Zona horaria<Input aria-label="Zona horaria" value={timezone} onChange={e => setTimezone(e.target.value)} required list="timezones" /><datalist id="timezones">{['America/La_Paz','America/Lima','America/Bogota','America/Santiago','America/Argentina/Buenos_Aires','America/Mexico_City','Europe/Madrid','UTC'].map(zone => <option key={zone}>{zone}</option>)}</datalist></label>
      <label className="block text-sm">Formato regional<select aria-label="Formato regional" className="block w-full rounded border bg-background p-2" value={language} onChange={e => setLanguage(e.target.value)}><option value="es">Español</option><option value="en">Inglés</option><option value="pt">Portugués</option></select></label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={enableRecommendations}
          onChange={e => setEnableRecommendations(e.target.checked)}
          className="h-4 w-4 rounded border"
        />
        <span>Habilitar recomendaciones comerciales basadas en ventas en el Dashboard</span>
      </label>
      <label className="block text-sm">Días antes de repetir una promoción del mismo producto
        <Input type="number" min={1} max={365} step={1} required value={cooldownDays} onChange={e => setCooldownDays(Number(e.target.value))} />
        <span className="text-xs text-muted-foreground">Por cliente y producto recomendado, dentro de esta empresa. Cambiar el mensaje o el producto comprado no evita el plazo.</span>
      </label>

      <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold">Correo saliente propio del negocio (SMTP)</h3>
            <p className="text-xs text-muted-foreground">Cada empresa puede conectar su propio correo para que las campañas y alertas salgan directamente desde su cuenta.</p>
          </div>
          <Badge variant={settings?.smtp_configured ? 'default' : 'secondary'}>
            {settings?.smtp_configured ? 'Credenciales guardadas; conexión sin verificar' : 'Pendiente de configurar'}
          </Badge>
        </div>

        <details className="rounded-md border bg-background p-3 text-xs">
          <summary className="cursor-pointer font-medium text-foreground">
            Guía paso a paso: ¿Cómo conectar tu correo Gmail en 1 minuto?
          </summary>
          <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-muted-foreground">
            <li>Entra a la cuenta de Google de tu negocio en <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" className="underline text-primary">myaccount.google.com/security</a>.</li>
            <li>Asegúrate de tener activada la <strong>Verificación en 2 pasos</strong>.</li>
            <li>Abre <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="underline text-primary">Contraseñas de aplicaciones (App Passwords)</a>, escribe <strong>CRM</strong> y haz clic en <strong>Crear</strong>.</li>
            <li>Copia el código de <strong>16 letras</strong> que te muestra Google y pégalo abajo en <em>Contraseña de aplicación SMTP</em> (no uses tu contraseña normal de correo).</li>
          </ol>
        </details>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">Nombre del remitente / encargado
            <Input placeholder="Ej. Samuel Zarate" value={smtpSenderName} onChange={e => setSmtpSenderName(e.target.value)} />
          </label>
          <label className="block text-sm">Correo remitente del negocio
            <Input type="email" placeholder="Ej. minegocio@gmail.com" value={smtpUser} onChange={e => setSmtpUser(e.target.value)} />
          </label>
          <label className="block text-sm sm:col-span-2">Contraseña de aplicación SMTP (16 letras)
            <Input
              type="password"
              autoComplete="new-password"
              placeholder={settings?.smtp_configured ? '•••••••••••• (ya guardada; escribe otra solo si deseas cambiarla)' : 'Pega aquí las 16 letras generadas por Google'}
              value={smtpPassword}
              onChange={e => setSmtpPassword(e.target.value)}
            />
            <span className="text-xs text-muted-foreground">Se guarda cifrada para tu empresa y nunca se vuelve a mostrar en pantalla. Los espacios se quitan automáticamente.</span>
          </label>
          <label className="block text-sm">Servidor SMTP
            <Input value={smtpHost} onChange={e => setSmtpHost(e.target.value)} placeholder="smtp.gmail.com" />
          </label>
          <label className="block text-sm">Puerto SMTP
            <Input value="587" readOnly />
          </label>
        </div>
        <p className="text-xs">TLS obligatorio. Servidores autorizados por el administrador de la plataforma; Gmail y Microsoft 365 incluidos por defecto.</p>
      </div>

      {mutation.isError && <p role="alert" className="text-sm text-destructive">No se pudieron guardar las preferencias. Revisa los valores e inténtalo nuevamente.</p>}
      <Button disabled={mutation.isPending}>Guardar preferencias</Button>
    </form>
  </CardContent></Card>;
}

function AccountTab() {
  const { user, logout } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const mutation = useMutation({ mutationFn: () => apiClient.post('/password/change/', { old_password: oldPassword, new_password: password }), onSuccess: () => { toast.success('Contraseña actualizada. Inicia sesión nuevamente.'); logout(); } });
  return <Card><CardHeader><CardTitle>Mi cuenta</CardTitle><CardDescription>{user?.username} · {user?.role_name}</CardDescription></CardHeader><CardContent>
    <form className="max-w-md space-y-4" onSubmit={e => { e.preventDefault(); if (password !== confirmation) { toast.error('Las contraseñas no coinciden.'); return; } mutation.mutate(); }}>
      <label className="block text-sm">Contraseña actual<Input type="password" autoComplete="current-password" required value={oldPassword} onChange={e => setOldPassword(e.target.value)} /></label>
      <label className="block text-sm">Nueva contraseña<Input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} /></label>
      <label className="block text-sm">Repetir nueva contraseña<Input type="password" autoComplete="new-password" required value={confirmation} onChange={e => setConfirmation(e.target.value)} /></label>
      <Button disabled={mutation.isPending}>Cambiar contraseña</Button>
    </form>
  </CardContent></Card>;
}

function UsersTab() {
  const { user: currentUser } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyUser | null>(null);
  const [deactivating, setDeactivating] = useState<CompanyUser | null>(null);
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({ queryKey: ['company-users'], queryFn: getCompanyUsers });

  const reactivate = useMutation({ mutationFn: (id: number) => updateCompanyUser(id, { is_active: true }), onSuccess: () => toast.success('Usuario reactivado') });
  const deactivateMutation = useMutation({
    mutationFn: deactivateCompanyUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-users'] });
      toast.success('Usuario desactivado');
      setDeactivating(null);
    },
  });

  return (
    <div className="mt-4 space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Nuevo usuario
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuarios de la empresa</CardTitle>
          <CardDescription>Administra quién tiene acceso al sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
              ) : (
                users?.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.first_name} {u.last_name}</TableCell>
                    <TableCell>{u.username}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.role_name || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={u.is_active ? 'default' : 'destructive'}>
                        {u.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {!u.is_active && <Button disabled={reactivate.isPending} onClick={() => reactivate.mutate(u.id)}>Reactivar</Button>}
                      <Button variant="ghost" aria-label="Editar usuario" size="icon" onClick={() => { setEditing(u); setDialogOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {u.is_active && u.id !== currentUser?.id && (
                        <Button variant="ghost" aria-label="Desactivar usuario" size="icon" onClick={() => setDeactivating(u)}>
                          <UserX className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <UserFormDialog open={dialogOpen} onOpenChange={setDialogOpen} user={editing} />

      <AlertDialog open={!!deactivating} onOpenChange={() => setDeactivating(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              {deactivating?.first_name} no podrá iniciar sesión hasta que sea reactivado.
              Su historial de ventas y gastos se conserva.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deactivating && deactivateMutation.mutate(deactivating.id)}>
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}