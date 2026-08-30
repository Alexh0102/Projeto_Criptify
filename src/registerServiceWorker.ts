export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) {
    return
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        void registration.update()
      })
      .catch((error: unknown) => {
        console.error('Service worker registration failed', error)
      })
  })
}
