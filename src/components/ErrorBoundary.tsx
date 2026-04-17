import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] render crash:', error, info)
  }

  reset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          fontFamily: 'DM Sans, sans-serif',
        }}>
          <div style={{
            background: 'var(--ls-surface, #1a1a1a)',
            border: '1px solid var(--ls-border, rgba(255,255,255,0.1))',
            borderRadius: 16,
            padding: 28,
            maxWidth: 480,
            textAlign: 'center',
            color: 'var(--ls-text, #fff)',
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
            <div style={{
              fontFamily: 'Syne, sans-serif',
              fontSize: 20,
              fontWeight: 800,
              marginBottom: 8,
            }}>
              Une erreur s'est produite
            </div>
            <div style={{
              fontSize: 13,
              color: 'var(--ls-text-muted, #9CA3AF)',
              marginBottom: 16,
              lineHeight: 1.6,
            }}>
              La page ne peut pas s'afficher — probablement une valeur manquante sur un bilan.
              Essaie de retourner en arrière ou de recharger.
            </div>
            {this.state.error && (
              <details style={{
                textAlign: 'left',
                fontSize: 11,
                color: 'var(--ls-text-hint, #6B7280)',
                background: 'var(--ls-surface2, rgba(0,0,0,0.2))',
                padding: 12,
                borderRadius: 10,
                marginBottom: 16,
              }}>
                <summary style={{ cursor: 'pointer' }}>Détails techniques</summary>
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginTop: 8 }}>
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={() => { this.reset(); window.history.back() }}
                style={{
                  padding: '10px 18px',
                  borderRadius: 10,
                  border: '1px solid var(--ls-border, rgba(255,255,255,0.1))',
                  background: 'transparent',
                  color: 'var(--ls-text-muted, #9CA3AF)',
                  fontSize: 13,
                  cursor: 'pointer',
                }}>
                Retour
              </button>
              <button
                onClick={() => window.location.href = '/clients'}
                style={{
                  padding: '10px 18px',
                  borderRadius: 10,
                  border: 'none',
                  background: '#C9A84C',
                  color: '#0B0D11',
                  fontFamily: 'Syne, sans-serif',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}>
                Mes clients
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
