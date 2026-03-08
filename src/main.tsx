import React, { StrictMode, ReactNode, ErrorInfo } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// ── Registro do Service Worker (PWA, Offline e Notificações) ───────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('[SW] Registrado com sucesso:', registration.scope);
      })
      .catch(error => {
        console.error('[SW] Falha ao registrar:', error);
      });
  });
}

// ── Error Boundary global ──────────────────────────────────────────────────
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

  handleHardReset = () => {
    // Caso o erro seja causado por dados corrompidos no localStorage (cache),
    // esta função permite que o usuário limpe a sessão local e recupere o acesso.
    localStorage.removeItem('last_tab');
    
    // Limpa apenas os caches dos livros para forçar um novo fetch do Supabase
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('book_cache_')) {
        localStorage.removeItem(key);
      }
    });
    
    window.location.reload();
  };

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
          gap: '1.5rem',
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '-1rem' }}>📖</div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#1c1917', margin: 0 }}>
            Algo deu errado
          </h1>
          <p style={{ color: '#78716c', maxWidth: '360px', lineHeight: 1.6, margin: 0 }}>
            O Versiculando encontrou um erro inesperado e não pôde continuar.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem', width: '100%', maxWidth: '300px' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '0.875rem',
                background: '#1c1917',
                color: '#fbbf24',
                border: 'none',
                borderRadius: '1rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '1rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            >
              Recarregar Página
            </button>
            
            <button
              onClick={this.handleHardReset}
              style={{
                padding: '0.75rem',
                background: 'transparent',
                color: '#78716c',
                border: '2px solid #e7e5e4',
                borderRadius: '1rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              Limpar cache e tentar novamente
            </button>
          </div>

          {this.state.error && (
            <details style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#a8a29e', maxWidth: '100%', overflow: 'hidden' }}>
              <summary style={{ cursor: 'pointer', outline: 'none' }}>Detalhes técnicos</summary>
              <div style={{ padding: '1rem', background: '#f5f5f4', borderRadius: '0.5rem', marginTop: '0.5rem', textAlign: 'left', overflowX: 'auto' }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {this.state.error.message}
                </pre>
              </div>
            </details>
          )}
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