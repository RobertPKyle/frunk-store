// Shared by every app on this origin: caches app files so they start fast
// and keep working with a weak or missing connection.
if ('serviceWorker' in navigator) {
  // On the very first visit the page loads before the worker runs, so none
  // of its files went through it; once it's running, it's told which they
  // were, so this app opens with no connection next time too
  const first = !navigator.serviceWorker.controller;
  navigator.serviceWorker.register('/sw.js')
    .then(() => navigator.serviceWorker.ready)
    .then(reg => {
      if (!first) return;
      // Once the page has loaded, as a file still on its way isn't listed yet
      // and, having started before the worker ran, won't go through it either
      const send = () => {
        const urls = [location.href, ...performance.getEntriesByType('resource').map(e => e.name)]
          .filter(url => new URL(url).origin === location.origin);
        reg.active?.postMessage({ frunk: 'cache', urls });
      };
      if (document.readyState === 'complete') send();
      else addEventListener('load', send, { once: true });
    })
    .catch(() => {});
}
