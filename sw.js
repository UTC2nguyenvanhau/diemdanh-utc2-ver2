const CACHE_NAME = 'utc2-app-v1';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  'https://cdn-icons-png.flaticon.com/512/3592/3592863.png'
];

// Cài đặt App ngầm vào máy sinh viên
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// Chặn mạng: Ưu tiên lấy file từ máy thay vì tải lại từ GitHub
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
