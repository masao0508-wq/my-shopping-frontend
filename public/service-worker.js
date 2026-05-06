self.addEventListener('install', (event) => {
  console.log('Service Worker インストール');
});

self.addEventListener('fetch', (event) => {
  // シンプル版（キャッシュなし）
});