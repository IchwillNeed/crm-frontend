import { lazy, Suspense } from 'react';
import { PageLoading } from '@/components/shared/LoadingState';
const PasswordResetPage = lazy(() => import('@/pages/PasswordResetPage').then(module => ({ default: module.PasswordResetPage })));
import { usePermissions, type Permission } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { useAuth } from '@/lib/auth-context';
const LoginPage = lazy(() => import('@/pages/LoginPage').then(module => ({ default: module.LoginPage })));
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then(module => ({ default: module.DashboardPage })));
import { DashboardLayout } from '@/components/layout/DashboardLayout';
const CustomersPage = lazy(() => import('@/pages/CustomersPage').then(module => ({ default: module.CustomersPage })));
const ProductsPage = lazy(() => import('@/pages/ProductsPage').then(module => ({ default: module.ProductsPage })));
const CatalogPage = lazy(() => import('@/pages/CatalogPage').then(module => ({ default: module.CatalogPage })));
const SalesPage = lazy(() => import('@/pages/SalesPage').then(module => ({ default: module.SalesPage })));
const NewSalePage = lazy(() => import('@/pages/NewSalePage').then(module => ({ default: module.NewSalePage })));
const ExpensesPage = lazy(() => import('@/pages/ExpensesPage').then(module => ({ default: module.ExpensesPage })));
const SaleDetailPage = lazy(() => import('@/pages/SaleDetailPage').then(module => ({ default: module.SaleDetailPage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then(module => ({ default: module.SettingsPage })));
import { Toaster } from '@/components/ui/sonner';
const CustomerDetailPage = lazy(() => import('@/pages/CustomerDetailPage').then(module => ({ default: module.CustomerDetailPage })));
const SignupPage = lazy(() => import('@/pages/SignupPage').then(module => ({ default: module.SignupPage })));
const PurchasesPage = lazy(() => import('@/pages/PurchasesPage').then(module => ({ default: module.PurchasesPage })));

import { queryClient } from '@/lib/query-client';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading, error, logout, retryProfile } = useAuth();

  if (isLoading) return <div className="mx-auto max-w-6xl p-6"><PageLoading /></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (error && !user) return <div className="mx-auto max-w-lg p-6 space-y-4"><p role="alert">No se pudo cargar tu cuenta. Revisa tu conexión y vuelve a intentarlo.</p><div className="flex flex-wrap gap-3"><Button onClick={retryProfile}>Reintentar</Button><Button variant="outline" onClick={logout}>Volver a iniciar sesión</Button></div></div>;
  return <>{children}</>;
}

function RoleRoute({ permission, children }: { permission: Permission; children: React.ReactNode }) {
  const { can, home } = usePermissions();
  return can(permission) ? children : <Navigate to={home} replace />;
}
function HomeRedirect() {
  const { home } = usePermissions();
  return <Navigate to={home} replace />;
}
function AppRoutes() {
  return (
    <Routes>
      <Route path="/forgot-password" element={<PasswordResetPage />} />
      <Route path="/reset-password/:uid/:token" element={<PasswordResetPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<RoleRoute permission="dashboard"><DashboardPage /></RoleRoute>} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/sales" element={<SalesPage />} />
        <Route path="/sales/new" element={<RoleRoute permission="sales.create"><NewSalePage /></RoleRoute>} />
        <Route path="/purchases" element={<RoleRoute permission="expenses"><PurchasesPage /></RoleRoute>} />
        <Route path="/expenses" element={<RoleRoute permission="expenses"><ExpensesPage /></RoleRoute>} />
        <Route path="/sales/:id" element={<SaleDetailPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/customers/:id" element={<CustomerDetailPage />} />
      </Route>
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<div className="mx-auto max-w-6xl p-6"><PageLoading /></div>}><AppRoutes /></Suspense>
        </BrowserRouter>
      </AuthProvider>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
