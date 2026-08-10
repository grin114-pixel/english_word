import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

const APP_VERSION = '2026-08-10-v2';

async function clearStalePwaCache(): Promise<boolean> {
  if (localStorage.getItem('app-version') === APP_VERSION) return false;

  localStorage.setItem('app-version', APP_VERSION);

  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }

  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }

  return true;
}

async function bootstrap() {
  const shouldReload = await clearStalePwaCache();
  if (shouldReload) {
    window.location.reload();
    return;
  }

  if (import.meta.env.DEV && 'serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
