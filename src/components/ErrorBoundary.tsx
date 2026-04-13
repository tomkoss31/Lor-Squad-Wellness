import { Component, ReactNode, ErrorInfo } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean; error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ background: '#0B0D11', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif' }}>
          <div style={{ textAlign: 'center', maxWidth: 400, padding: 32 }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: 'rgba(251,113,133,0.1)', border: '1px solid rgba(251,113,133,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 24 }}>⚠</div>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700, color: '#F0EDE8', margin: '0 0 10px' }}>Une erreur est survenue</h2>
            <p style={{ fontSize: 13, color: '#7A8099', margin: '0 0 24px', lineHeight: 1.6 }}>{this.state.error?.message || 'Erreur inattendue'}</p>
            <button onClick={() => window.location.reload()} style={{ background: '#C9A84C', color: '#0B0D11', border: 'none', borderRadius: 10, padding: '12px 24px', fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Recharger la page</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
