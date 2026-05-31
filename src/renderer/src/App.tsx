import { useEffect, useCallback } from 'react'
import { AppShell } from '@/components/Layout/AppShell'
import { Toaster } from '@/components/ui/toaster'
import { useAppStore } from '@/store/useAppStore'

function App(): React.JSX.Element {
  useEffect(() => {
    if (window.api?.ping) {
      window.api.ping().then((result) => {
        console.log('IPC ping result:', result)
      })
    }
  }, [])

  const loadConfiguredProviders = useCallback(() => {
    window.api?.aiListConfigured?.().then((list) => {
      useAppStore.getState().setConfiguredProviders(list || [])
    }).catch(() => {
      // preload not available
    })
  }, [])

  useEffect(() => {
    loadConfiguredProviders()
    window.addEventListener('ai-config-changed', loadConfiguredProviders)
    return () => window.removeEventListener('ai-config-changed', loadConfiguredProviders)
  }, [loadConfiguredProviders])

  return (
    <>
      <AppShell />
      <Toaster />
    </>
  )
}

export default App
