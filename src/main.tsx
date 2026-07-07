import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { AppInitializer } from './components/AppInitializer';
import './index.css';
import App from './App.tsx';

/**
 * Register the stream-auth service worker.
 *
 * We force-unregister any previous SW registrations first so a stale
 * (buggy) version never lingers across deployments.  After unregistering
 * we immediately re-register and call skipWaiting via a message so the new
 * SW takes control of this page without requiring a second navigation.
 */
async function registerStreamAuthSW() {
  if (!('serviceWorker' in navigator)) return;

  try {
    // Tear down every previously registered SW to avoid stale versions.
    const existing = await navigator.serviceWorker.getRegistrations();
    await Promise.all(existing.map((r) => r.unregister()));

    // Register the current version.
    const registration = await navigator.serviceWorker.register(
      '/stream-auth-sw.js',
      { scope: '/' },
    );

    // If the SW is already waiting (installed but not yet active), tell it
    // to skip waiting so it takes control immediately.
    const sw = registration.installing ?? registration.waiting ?? registration.active;
    sw?.postMessage({ type: 'SKIP_WAITING' });

    // Wait until a SW is actually controlling this page.
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true });
      });
    }
  } catch (err) {
    console.error('[SW] Registration failed:', err);
  }
}

// Boot the SW, then mount React.  The SW is lightweight so this adds < 50 ms.
registerStreamAuthSW().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AppInitializer>
          <App />
        </AppInitializer>
      </QueryClientProvider>
    </StrictMode>,
  );
});

