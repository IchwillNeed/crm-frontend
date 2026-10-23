import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Atrapa errores inesperados de renderizado para mostrar un mensaje con opción
 * de recargar, en lugar de dejar la pantalla en blanco.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error de renderizado:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div
        role="alert"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          padding: '24px',
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>Algo salió mal</h1>
        <p style={{ margin: 0, color: '#6b7280', maxWidth: '420px' }}>
          Ocurrió un error inesperado. Si tienes activada la traducción automática del navegador,
          desactívala e intenta de nuevo.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            background: '#dc2626',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          Recargar página
        </button>
      </div>
    );
  }
}

