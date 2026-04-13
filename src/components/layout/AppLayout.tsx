import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function AppLayout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0B0D11' }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: 'auto', minHeight: '100vh' }}>
        <Outlet />
      </main>
    </div>
  )
}
