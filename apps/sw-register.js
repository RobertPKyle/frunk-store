// Shared by every app on this origin: caches app files so they start fast
// and keep working with a weak or missing connection.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
