const VERSION = "0.2";

let newWorker;
let refreshing;

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

const registerServiceWorker = () => {
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker
    .register("/service-worker.js")
    .then(registration => {
      console.log("ServiceWorker registration1 successful with scope: ", registration.scope);
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
    }, err => {
      console.log("ServiceWorker registration failed: ", err);
    });

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    console.log("🦉 a controllerchange event occurred, which means the server worker has updated");
    if (refreshing) return;
    window.location.reload();
    refreshing = true;
  });
}

const unregisterServiceWorker = () => {
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => registration.unregister());
  });
};
