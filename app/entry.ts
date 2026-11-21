import { bootRehydrated } from 'vite-ember-ssr/client';

import Application from './app.ts';
import config from './config/environment.ts';

// Attaches to the prerendered HTML instead of rendering the page again
bootRehydrated(Application, config);
