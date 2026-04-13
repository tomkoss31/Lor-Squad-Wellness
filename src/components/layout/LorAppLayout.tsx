import { Outlet } from 'react-router-dom'
import { LorSidebar } from './LorSidebar'

export function LorAppLayout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0B0D11' }}>
      <LorSidebar />
      <main style={{ flex: 1, marginLeft: 220, minHeight: '100vh', overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  )
}
