import App from './app.ts';
import config from './config/environment.ts';

// The prerender waits for the run loop and WarpDrive's requests to settle
// before it captures the HTML
export { settled } from '@ember/test-helpers';

export function createSsrApp() {
  return App.create({ ...config.APP, autoboot: false });
}
