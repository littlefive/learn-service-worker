const CACHE_NAME = "cache-v0.4";
const URLS_TO_CACHE = [
  "/",
  "style.css",
  "script.js"
];

self.addEventListener("install", event => {
  console.log("安装成功");

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log(`添加 [${URLS_TO_CACHE.join(", ")}] 到缓存 ${CACHE_NAME}`);
        return cache.addAll(URLS_TO_CACHE);
      })
  );
});

self.addEventListener("activate", event => {
  console.log("开始更新!");
  event.waitUntil(
    caches.keys().then(cacheNames => {
      console.log(`🦉 deleting all caches so fresh files are fetched: [${cacheNames.join(", ")}]`);
      return Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
    })
  );
});

self.addEventListener("fetch", event => {
  console.log(`a fetch event occurred! trying to get ${event.request.url}...`);

  event.respondWith(
    caches
      .match(event.request)
      .then(response => {
        if (response) {
          console.log("here's a response from the cache for you:", response);
          return response;
        }

        return fetch(event.request).then(response => {
          if(!response || response.status !== 200 || response.type !== 'basic') {
            console.log("🦉 this response wasn't cached so I tried to get a new one, but something is wrong with it:", response);
            return response;
          }

            // IMPORTANT: Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have two streams.
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                console.log("🦉 (putting a clone of this response into our cache for the next time)");
                cache.put(event.request, responseToCache);
              });

            console.log("🦉 this response wasn't cached but I successfully got a new one for you:", response);
            return response;
          });
      })
  );
});

self.addEventListener("message", event => {
  console.log("🦉 I received a message :)", event);
  if (event.data.action === "skipWaiting") {
    console.log("🦉 I've been told to skipWaiting(), so I will");
    self.skipWaiting();
  }
});
