import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initBotId } from 'botid/client/core';

const pwaConfiguration = window.location.pathname.startsWith('/admin/') ? { manifest: '/admin/manifest.webmanifest', worker: '/admin/pwa-sw.js', scope: '/admin/' }
  : window.location.pathname.startsWith('/client/') ? { manifest: '/client/manifest.webmanifest', worker: '/client/pwa-sw.js', scope: '/client/' }
  : window.location.pathname.startsWith('/property-listings/') ? { manifest: '/property-listings/manifest.webmanifest', worker: '/property-listings/pwa-sw.js', scope: '/property-listings/' }
  : null;

if (pwaConfiguration) {
  const manifest = document.createElement('link'); manifest.rel = 'manifest'; manifest.href = pwaConfiguration.manifest; document.head.appendChild(manifest);
  if ('serviceWorker' in navigator) window.addEventListener('load', () => { void navigator.serviceWorker.register(pwaConfiguration.worker, { scope: pwaConfiguration.scope }); }, { once: true });
}

if (!['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)) {
  initBotId({
    protect: [
      { path: '/api/public/contact', method: 'POST', advancedOptions: { checkLevel: 'basic' } },
      { path: '/api/auth/register', method: 'POST', advancedOptions: { checkLevel: 'basic' } },
      { path: '/api/auth/magic-link', method: 'POST', advancedOptions: { checkLevel: 'basic' } },
      { path: '/api/auth/login', method: 'POST', advancedOptions: { checkLevel: 'basic' } },
      { path: '/api/auth/forgot-password', method: 'POST', advancedOptions: { checkLevel: 'basic' } },
    ],
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
