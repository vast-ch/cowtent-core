/**
 * Registers the service worker (VitePWA's sw.js) and keeps the site up to
 * date after a deploy, also as an app installed on a phone's home screen.
 *
 * The worker takes over as soon as a new one is installed (skipWaiting and
 * clientsClaim), but on its own the browser only looks for a new one when a
 * page loads. An app on an iPhone's home screen is mostly resumed, not
 * loaded, so it would keep the old deploy for days. So: look for a new
 * worker each time the site comes back to the screen (and every hour while
 * it's open), and reload once a new one has taken over the page.
 */
const HOUR = 60 * 60 * 1000;

export function registerServiceWorker(base: string): void {
  if (!('serviceWorker' in navigator)) return;

  const { serviceWorker } = navigator;
  // On the first visit the first worker takes over too: nothing to reload
  let controlled = Boolean(serviceWorker.controller);

  serviceWorker.addEventListener('controllerchange', () => {
    // A reload of the page, not a request for data
    // eslint-disable-next-line warp-drive/no-legacy-request-patterns
    if (controlled) window.location.reload();
    controlled = true;
  });

  window.addEventListener('load', () => {
    serviceWorker
      .register(`${base}sw.js`, { scope: base })
      .then((registration) => {
        const update = () => {
          if (document.visibilityState === 'visible')
            registration.update().catch(() => {});
        };

        document.addEventListener('visibilitychange', update);
        window.setInterval(update, HOUR);
      })
      .catch(() => {});
  });
}
