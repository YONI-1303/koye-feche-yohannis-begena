const CACHE_NAME = "kfy-begena-v4";

const APP_SHELL = [
    "./",
    "./index.html",
    "./styles.css",
    "./app.js?v=208",
    "./manifest.webmanifest"
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(APP_SHELL);
        })
    );

    self.skipWaiting();
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
        })
    );

    self.clients.claim();
});

self.addEventListener("fetch", event => {
    const request = event.request;

    if (request.method !== "GET") {
        return;
    }

    const url = new URL(request.url);

    /*
     * APP.JS
     * Cache first so offline login can work.
     */
    if (url.pathname.endsWith("/app.js")) {
        event.respondWith(
            caches.match(request).then(cachedResponse => {

                if (cachedResponse) {
                    return cachedResponse;
                }

                return fetch(request).then(response => {

                    if (response && response.ok) {
                        const clone = response.clone();

                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(request, clone);
                        });
                    }

                    return response;
                });
            })
        );

        return;
    }

    /*
     * NAVIGATION
     * Network first, cache fallback.
     */
    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request)
                .then(response => response)
                .catch(() => {
                    return caches.match("./index.html");
                })
        );

        return;
    }

    /*
     * OTHER FILES
     * Cache first, network fallback.
     */
    event.respondWith(
        caches.match(request).then(cachedResponse => {

            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(request)
                .then(response => {

                    if (
                        response &&
                        response.ok
                    ) {
                        const clone =
                            response.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(
                                    request,
                                    clone
                                );
                            });
                    }

                    return response;
                })
                .catch(() => {
                    return caches.match(
                        "./index.html"
                    );
                });
        })
    );
});