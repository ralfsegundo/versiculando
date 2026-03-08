import React, {StrictMode, ReactNode, ErrorInfo} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// ── Error Boundary global ──────────────────────────────────────────────────
// Sem isso, qualquer exceção não tratada resulta em tela branca silenciosa.
interface EBState { hasError: boolean; error: Error | null }
class ErrorBoundary extends React.Component<{ children: ReactNode }, EBState> {
  public state: EBState;
  public props: { children: ReactNode };
  
  constructor(props: { children: ReactNode }) {
    super(props);
    this.props = props;
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error): EBState {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Versiculando] Erro crítico:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fdfbf7',
          padding: '2rem',
          fontFamily: 'serif',
          textAlign: 'center',
          gap: '1rem',
        }}>
          <div style={{ fontSize: '3rem' }}>📖</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1c1917' }}>
            Algo deu errado
          </h1>
          <p style={{ color: '#78716c', maxWidth: '360px', lineHeight: 1.6 }}>
            O Versiculando encontrou um erro inesperado. Tente recarregar a página.
          </p>
          {this.state.error && (
            <details style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#a8a29e', maxWidth: '400px' }}>
              <summary style={{ cursor: 'pointer' }}>Detalhes técnicos</summary>
              <pre style={{ whiteSpace: 'pre-wrap', marginTop: '0.5rem', textAlign: 'left' }}>
                {this.state.error.message}
              </pre>
            </details>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '0.5rem',
              padding: '0.75rem 2rem',
              background: '#1c1917',
              color: '#fbbf24',
              border: 'none',
              borderRadius: '0.75rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
