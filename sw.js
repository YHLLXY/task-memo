var BASE = self.location.pathname.replace(/\/[^/]*$/, '/');
var CACHE_NAME = 'memo-v7';
var ASSETS = [
  BASE, BASE + 'index.html', BASE + 'manifest.json',
  BASE + 'css/style.css',
  BASE + 'js/lib/anime.umd.min.js',
  BASE + 'js/ui.js', BASE + 'js/data.js', BASE + 'js/render.js', BASE + 'js/events.js',
  BASE + 'js/notify.js', BASE + 'js/animate.js', BASE + 'js/app.js'
];

// 立即激活新 SW，不等待旧 SW 释放
self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ASSETS);
    })
  );
});

// 网络优先（HTML）→ 回退缓存；其他文件缓存优先
self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  // HTML 文件：网络优先，确保始终获取最新版本
  if (e.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === BASE || url.pathname === BASE.slice(0, -1)) {
    e.respondWith(
      fetch(e.request).then(function (response) {
        // 更新缓存
        var cloned = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(e.request, cloned);
        });
        return response;
      }).catch(function () {
        return caches.match(e.request);
      })
    );
    return;
  }
  // 其他静态资源：缓存优先
  e.respondWith(
    caches.match(e.request).then(function (r) {
      return r || fetch(e.request).then(function (response) {
        var cloned = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(e.request, cloned);
        });
        return response;
      });
    })
  );
});

// 清理旧缓存 + 立即接管所有页面
self.addEventListener('activate', function (e) {
  self.clients.claim();
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) { return caches.delete(k); })
      );
    })
  );
});