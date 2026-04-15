import { useState, useEffect } from 'react'

export type Theme = 'dark' | 'light'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'dark'
    const saved = window.localStorage.getItem('lor-theme')
    return saved === 'light' ? 'light' : 'dark'
  })

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'light') {
      root.classList.add('theme-light')
    } else {
      root.classList.remove('theme-light')
    }
    try { window.localStorage.setItem('lor-theme', theme) } catch { /* ignore */ }
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  return { theme, toggleTheme, isDark: theme === 'dark' }
}
