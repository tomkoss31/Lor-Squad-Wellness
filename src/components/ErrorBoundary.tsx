import { Component, ErrorInfo, ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean; message: string }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ background: '#0B0D11', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif' }}>
          <div style={{ textAlign: 'center', maxWidth: 420, padding: '2rem' }}>
            <p style={{ fontSize: 32, marginBottom: 16 }}>⚠️</p>
            <h1 style={{ color: '#F0EDE8', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Une erreur est survenue</h1>
            <p style={{ color: '#7A8099', fontSize: 13, marginBottom: 24 }}>{this.state.message}</p>
            <button onClick={() => window.location.reload()} style={{ background: '#C9A84C', color: '#0B0D11', fontWeight: 700, padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13 }}>
              Recharger la page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
