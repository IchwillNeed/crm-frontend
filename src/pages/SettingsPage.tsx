import { useState, useEffect, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyCompany, updateMyCompany, updateMyCompanySettings } from '@/api/endpoints/company';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-muted-foreground">Administra los datos y preferencias de tu empresa</p>
      </div>

      <Tabs defaultValue="company">
        <TabsList>
          <TabsTrigger value="company">Empresa</TabsTrigger>
          <TabsTrigger value="preferences">Preferencias</TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <CompanyTab />
        </TabsContent>
        <TabsContent value="preferences">
          <PreferencesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CompanyTab() {
    const queryClient = useQueryClient();
    const { data: company, isLoading } = useQuery({ queryKey: ['my-company'], queryFn: getMyCompany });
    const [isEditing, setIsEditing] = useState(false);

    const [name, setName] = useState('');
    const [businessName, setBusinessName] = useState('');
    const [description, setDescription] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [country, setCountry] = useState('');
    const [website, setWebsite] = useState('');

    useEffect(() => {
        if (company) {
        setName(company.name);
        setBusinessName(company.business_name ?? '');
        setDescription(company.description ?? '');
        setEmail(company.email ?? '');
        setPhone(company.phone ?? '');
        setAddress(company.address ?? '');
        setCity(company.city ?? '');
        setCountry(company.country ?? '');
        setWebsite(company.website ?? '');
        }
    }, [company]);

    const mutation = useMutation({
        mutationFn: updateMyCompany,
        onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['my-company'] });
        toast.success('Datos de la empresa guardados correctamente');
        setIsEditing(false);
        },
    });

    const normalizeWebsite = (value: string): string | null => {
        if (!value) return null;
        const trimmed = value.trim().toLowerCase();
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
        return `https://${trimmed}`;
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        mutation.mutate({
        name,
        business_name: businessName || null,
        description: description || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        city: city || null,
        country: country || null,
        website: normalizeWebsite(website),
        });
    };

    const handleCancel = () => {
        if (company) {
        setName(company.name);
        setBusinessName(company.business_name ?? '');
        setDescription(company.description ?? '');
        setEmail(company.email ?? '');
        setPhone(company.phone ?? '');
        setAddress(company.address ?? '');
        setCity(company.city ?? '');
        setCountry(company.country ?? '');
        setWebsite(company.website ?? '');
        }
        setIsEditing(false);
    };

    if (isLoading) {
        return <Skeleton className="mt-4 h-96 w-full" />;
    }

    if (!isEditing) {
        return (
        <Card className="mt-4">
            <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Datos de la empresa</CardTitle>
                <CardDescription>Esta información se usa en reportes y documentos.</CardDescription>
            </div>
            <Button variant="outline" onClick={() => setIsEditing(true)}>
                Editar
            </Button>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <InfoRow label="Nombre comercial" value={company?.name} />
            <InfoRow label="Razón social" value={company?.business_name} />
            <InfoRow label="Descripción" value={company?.description} full />
            <InfoRow label="Email" value={company?.email} />
            <InfoRow label="Teléfono" value={company?.phone} />
            <InfoRow label="Dirección" value={company?.address} full />
            <InfoRow label="Ciudad" value={company?.city} />
            <InfoRow label="País" value={company?.country} />
            <InfoRow label="Sitio web" value={company?.website} />
            </CardContent>
        </Card>
        );
    }

    return (
        <Card className="mt-4">
        <CardHeader>
            <CardTitle>Editar datos de la empresa</CardTitle>
        </CardHeader>
        <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                <Label htmlFor="name">Nombre comercial</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                <Label htmlFor="business_name">Razón social</Label>
                <Input id="business_name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="address">Dirección</Label>
                <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                <Label htmlFor="city">Ciudad</Label>
                <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div className="space-y-2">
                <Label htmlFor="country">País</Label>
                <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="website">Sitio web</Label>
                <Input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </div>

            <div className="flex gap-3">
                <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Guardando...' : 'Guardar cambios'}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                Cancelar
                </Button>
            </div>
            </form>
        </CardContent>
        </Card>
    );
}

function InfoRow({ label, value, full }: { label: string; value?: string | null; full?: boolean }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium">{value || '—'}</p>
    </div>
  );
}

function PreferencesTab() {
  const queryClient = useQueryClient();
  const { data: company, isLoading } = useQuery({ queryKey: ['my-company'], queryFn: getMyCompany });

  const [currency, setCurrency] = useState('');
  const [language, setLanguage] = useState('');
  const [enableRecommendations, setEnableRecommendations] = useState(true);
  const [enableExpenses, setEnableExpenses] = useState(true);
  const [enableInventory, setEnableInventory] = useState(true);

  useEffect(() => {
    if (company?.settings) {
      setCurrency(company.settings.currency);
      setLanguage(company.settings.language);
      setEnableRecommendations(company.settings.enable_recommendations);
      setEnableExpenses(company.settings.enable_expenses);
      setEnableInventory(company.settings.enable_inventory);
    }
  }, [company]);

  const mutation = useMutation({
    mutationFn: updateMyCompanySettings,
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['my-company'] });
        toast.success('Preferencias actualizadas');
    },
  });

  const handleToggle = (field: string, value: boolean) => {
    mutation.mutate({ [field]: value });
  };

  const handleSaveText = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate({ currency, language });
  };

  if (isLoading) {
    return <Skeleton className="mt-4 h-96 w-full" />;
  }

  return (
    <div className="mt-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveText} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Moneda</Label>
                <Input id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="language">Idioma</Label>
                <Input id="language" value={language} onChange={(e) => setLanguage(e.target.value)} />
              </div>
            </div>
            <Button type="submit" disabled={mutation.isPending}>
              Guardar
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Funcionalidades</CardTitle>
          <CardDescription>Activa o desactiva módulos según lo que necesite tu negocio.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Recomendaciones</p>
              <p className="text-sm text-muted-foreground">Sugerencias de productos basadas en patrones de venta</p>
            </div>
            <Switch
              checked={enableRecommendations}
              onCheckedChange={(val) => {
                setEnableRecommendations(val);
                handleToggle('enable_recommendations', val);
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Gastos</p>
              <p className="text-sm text-muted-foreground">Registro y análisis de gastos del negocio</p>
            </div>
            <Switch
              checked={enableExpenses}
              onCheckedChange={(val) => {
                setEnableExpenses(val);
                handleToggle('enable_expenses', val);
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Inventario</p>
              <p className="text-sm text-muted-foreground">Control de stock y reabastecimiento</p>
            </div>
            <Switch
              checked={enableInventory}
              onCheckedChange={(val) => {
                setEnableInventory(val);
                handleToggle('enable_inventory', val);
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}