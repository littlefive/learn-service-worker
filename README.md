# Let's Add a Service Worker
## What could go wrong?

Welcome to this brief tutorial on creating your first service worker, deliberately making a few mistakes along the way.

We'll examine the results of these mistakes and then, of course, fix them.

### 1. Clone this repo

To start, clone this repo:

```bash
$ git clone git@github.com:louiseswift/learn-service-worker-mistakes.git
$ cd learn-service-worker-mistakes

# install http-server if you need to:
# https://www.npmjs.com/package/http-server

$ http-server -p 1234
```

Now you can open http://localhost:1234 in your browser.

### 2. Add initial service worker code

OK, let's start in `./service-worker.js`. There's a lot of important code to add here so roll up your sleeves.

Firstly, a couple of important constants:

```javascript
const CACHE_NAME = "cache-v0.1";
const URLS_TO_CACHE = [
  "/",
  "style.css",
  "script.js"
];
```

Next, a listener for the service worker's `install` event, which is the best place to carry out the task of creating the cache and adding the URLs defined above to it:

```javascript
self.addEventListener("install", event => {
  console.log("🦉 hey! I'm installing myself");

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log(`🦉 adding [${URLS_TO_CACHE.join(", ")}] to ${CACHE_NAME}`);
        return cache.addAll(URLS_TO_CACHE);
      })
  );
});
```

Next, a listener for the service worker's `activate` event, which is where the very important task of deleting all currently-existing caches occurs (otherwise your updated service worker will continue serving cached resources rather than the new ones you probably want it to serve now):

```javascript
self.addEventListener("activate", event => {
  console.log("🦉 I've been activated!");
  event.waitUntil(
    caches.keys().then(cacheNames => {
      console.log(`🦉 deleting all caches so fresh files are fetched: [${cacheNames.join(", ")}]`);
      return Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
    })
  );
});
```

Note that a service worker's activation takes place only when all instances of the service worker's previous version are gone, i.e. the user has no more browser tabs open on your site. So that's why we clear out the cache now, knowing there won't be old versions of the service worker trying to serve resources from a newly-deleted cache.

Next, the biggest event listener that we'll be adding to `./service-worker.js`:

```javascript
self.addEventListener("fetch", event => {
  console.log(`🦉 a fetch event occurred! trying to get ${event.request.url}...`);

  event.respondWith(
    caches
      .match(event.request)
      .then(response => {
        if (response) {
          console.log("🦉 here's a response from the cache for you:", response);
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
```

This `fetch` listener intercepts every fetch that your browser does on this domain and, if it can, serves a matching response from the cache. If it can't do this, because perhaps we are only caching specific resources, our service worker logs out a brief explanation.

Finally, the last listener to add to the service worker file is for the `message` event:

```javascript
self.addEventListener("message", event => {
  console.log("🦉 I received a message :)", event);
  if (event.data.action === "skipWaiting") {
    console.log("🦉 I've been told to skipWaiting(), so I will");
    self.skipWaiting();
  }
});
```

This one allows our service worker to respond to being sent messages. It's nice to let your service worker know you appreciate its work sometimes, so be sure to do that, but mostly we'll use this listener to allow our service worker to `skipWaiting()`. This allows the service worker to activate its latest version immediately, instead of waiting for a quiet time. You'll see how we use this in the next section.

### 3. Update script.js

Let's start with an important constant and some empty variables that we'll use later:

```javascript
const VERSION = "0.1";

let newWorker;
let refreshing;
```

Notice that the constant here, `VERSION` has a value corresponding to the `CACHE_NAME` value in `./service-worker.js`. This is a really helpful way for us to keep track of what's going on while working through this project.

Whenever you make a change to `script.js`, increment its `VERSION`. And whenever you do this, update the service worker's `CACHE_NAME` value to include the new version number, too.

This (along with the important code in the `activate` event listener you created during the previous section) will allow our service worker to fetch the latest version of `script.js` when we tell it to by updating its `CACHE_NAME`.

OK, next up is an event listener for the window `load` event and a function to allow us to log to the handy logging area:

```javascript
window.addEventListener("load", () => {
  registerServiceWorker();
  log(`Version ${VERSION} of script.js has been loaded.`);
});

const log = newText => {
  const logEl = document.querySelector(".log");
  const currentText = logEl.value;
  const lineBreaks = `${String.fromCharCode(13, 10)}${String.fromCharCode(13, 10)}`;
  logEl.value = `${currentText ? `${currentText}${lineBreaks}` : ""}${newText}`;
}
```

As you can see, our `load` event listener here will to register the service worker straight away and it will then log out our current script version.

Well, currently you'll just get an error in the browser console because we haven't written the `registerServiceWorker()` function yet. Don't worry - that's next.

```javascript
const registerServiceWorker = () => {
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker
    .register("/service-worker.js")
    .then(registration => {
      console.log("ServiceWorker registration successful with scope: ", registration.scope);

      // > SPACE FOR `updatefound` EVENT LISTENER!

    }, err => {
      console.log("ServiceWorker registration failed: ", err);
    });

  // > SPACE FOR `controllerchange` EVENT LISTENER!
}
```

In the `registerServiceWorker()` function above, you'll see that we let the browser know that we've got a service worker ready & waiting in `./service-worker.js`. (Note: this service worker can intercept all requests from the base domain because it's sitting at the root of the project, as confirmed by the scope that is logged to the console here. You can narrow the scope of service workers by putting them in subdirectories, if you want to give yourself a headache.)

There is some more code to add inside the `registerServiceWorker()` function.

Replace the "SPACE FOR `updatefound` EVENT LISTENER!" comment with:

```javascript
registration.addEventListener("updatefound", () => {
  console.log("🦉 an update has been found!");

  newWorker = registration.installing;
  newWorker.addEventListener("statechange", () => {
    if (newWorker.state == "installed") { // a new service worker is available
      if (navigator.serviceWorker.controller) {
        log("A new service worker is available. In 3 seconds, the page will refresh with the new service worker activated...");
        window.setTimeout(() => {
          newWorker.postMessage({ action: "skipWaiting" });
        }, 3000);
      }
    }
  });
});
```

Now, as soon as we've registered our service worker with the browser, we add a listener for the `updatefound` event. This will allow the service worker to react to the discovery of a newer version of itself! It's important that a service worker of the previous generation always graciously and _immediately_ gives way to a service worker of the newer generation, and the first step of this is noticing one's own obsolescence.

While on its way out, the old service worker will send a message to the new service worker that it does not need to wait to activate itself. (Remember how we added a `message` event listener to the service worker in the previous section? That's how it will receive the message we're sending here.)

A very important part of this process is the following `controllerchange` listener, which you should add where the "SPACE FOR `controllerchange` EVENT LISTENER!" comment is shown above:

```javascript
navigator.serviceWorker.addEventListener("controllerchange", () => {
  console.log("🦉 a controllerchange event occurred, which means the server worker has updated");
  if (refreshing) return;
  window.location.reload();
  refreshing = true;
});
```

Without this `controllerchange` listener, which includes a refresh of the page, the new service worker would be activated but it wouldn't be receiving any requests to handle as per its updated instructions because the page would just be sitting, idle. (A more user-friendly implementation of this functionality is usually a 'New Version Available, Click Here To Update' notification that lets the user choose when to refresh the page.)

Finally, let's make sure to add an `unregisterServiceWorker()` function to `./script.js`, because then we can replace our call to `registerServiceWorker()` with a call to `unregisterServiceWorker()` if we want to get rid of our service worker entirely:

```javascript
const unregisterServiceWorker = () => {
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => registration.unregister());
  });
};
```

You can try this out now! It's important to notice that not-registering a service worker doesn't get rid of it. Only _unregistering_ it does.

### 4. Creating (and debugging) some service worker problems

There are some useful ways to inspect service workers and their caches in Chrome's Dev Tools.

In Dev Tools, you should:

1. Go to Application > Service Workers so see if a service worker is registered, and whether a newer version is waiting to be activated (if so, you'll see the option here to `skipWaiting`, i.e. if the example code in this tutorial project is not behaving as expected - don't forget to then refresh the page so the updated service worker can respond to the new set of browser requests)
2. Still within the Application > Service Workers screen in Dev Tools, scroll down until you see the Cache Storage dropdown on the left - open it up to see the cache that the service worker is using, as you can then even look directly at the cached files here and see whether your service worker is failing to clear out the cache(s) during its `activate` event

Alright! Time to break your service worker and figure out how to fix it:

* What happens if you edit the version in `./script.js` _without_ changing anything in `./service-worker.js`? Why?
* What happens if you remove the `registerServiceWorker()` call from `./script.js`? Why?
* What happens if you don't tell your service worker to clear caches in its `activate` event handler? Why?

### 5. Further challenges

1. Try implementing a user-friendly "You're Offline" page by serving the `./offline.html` page included in this project when in an offline state (there's a recipe you can follow [here](https://serviceworke.rs/offline-fallback_service-worker_doc.html))
2. Try rewriting service-worker.js using [async/await syntax](https://github.com/louiseswift/learn-promises-async-await) for improved reading experience
