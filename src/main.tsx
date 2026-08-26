import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initBotId } from 'botid/client/core';

initBotId({
  protect: [
    { path: '/api/public/contact', method: 'POST', advancedOptions: { checkLevel: 'basic' } },
    { path: '/api/auth/register', method: 'POST', advancedOptions: { checkLevel: 'basic' } },
    { path: '/api/auth/magic-link', method: 'POST', advancedOptions: { checkLevel: 'basic' } },
    { path: '/api/auth/login', method: 'POST', advancedOptions: { checkLevel: 'basic' } },
    { path: '/api/auth/forgot-password', method: 'POST', advancedOptions: { checkLevel: 'basic' } },
  ],
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
