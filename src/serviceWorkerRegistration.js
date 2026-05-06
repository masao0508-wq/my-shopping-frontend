// serviceWorkerRegistration.js

export function register() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then(registration => {
          console.log('Service Worker 登録成功:', registration);
        })
        .catch(error => {
          console.log('Service Worker 登録失敗:', error);
        });
    });
  }
}