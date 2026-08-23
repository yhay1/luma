'use client'

import { useEffect } from 'react'

export function ThemeController() {
  useEffect(() => {
    const stored = window.localStorage.getItem('luma-theme')
    const theme = stored === 'light' || stored === 'dark' ? stored : 'dark'
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.classList.toggle('light', theme === 'light')
  }, [])
  return null
}
