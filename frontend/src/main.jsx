import { MotionConfig } from 'framer-motion'
import { ThemeProvider } from './context/ThemeContext'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/dm-sans'
import './index.css'
import App from './App.jsx'
import { store } from './app/store.js'
import { injectStore } from './api/client.js'
import { Provider } from 'react-redux'
import { injectAdminStore } from './api/admin/adminClient'

injectStore(store)
injectAdminStore(store)

if (import.meta.env.DEV) {
  window.__store__ = store
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('Service worker registration failed:', err);
    });
  });
}

createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <ThemeProvider>
      <MotionConfig reducedMotion="user" transition={{ duration: 0.2, ease: 'easeOut' }}>
        <App />
      </MotionConfig>
    </ThemeProvider>
  </Provider>
)
