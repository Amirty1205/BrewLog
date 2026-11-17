import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppProviders } from './app/providers/AppProviders'
import { AppRouter } from './app/router/AppRouter'
import './styles/globals.css'
import { registerSW } from 'virtual:pwa-register'
import '@fontsource-variable/vazirmatn'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <AppRouter />
    </AppProviders>
  </StrictMode>,
)

registerSW({ immediate: true })
