import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { NotifyProvider } from './components/Toasts';
import './index.css';
import './i18n';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Тосты и подтверждения доступны всему приложению, включая экран входа. */}
    <NotifyProvider>
      <App />
    </NotifyProvider>
  </StrictMode>,
);
