import { bootRehydrated } from 'vite-ember-ssr/client';

import Application from './app.ts';
import config from './config/environment.ts';
import { registerServiceWorker } from './service-worker.ts';

// Attaches to the prerendered HTML instead of rendering the page again
bootRehydrated(Application, config);

// Only in a build: the dev server and the tests have no service worker
if (import.meta.env.PROD) registerServiceWorker(import.meta.env.BASE_URL);
