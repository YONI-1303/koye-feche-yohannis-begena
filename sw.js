const CACHE_NAME = "kfy-begena-v5";

const APP_SHELL = [
    "./",
    "./index.html",
    "./styles.css",
    "./app.js?v=208",
    "./manifest.webmanifest"
];

const BEGENA_AUDIO_FILES = [
    "./audio/begena/selamta/bf2.ogg",
    "./audio/begena/selamta/bc2.ogg",
    "./audio/begena/selamta/bd2.ogg",
    "./audio/begena/selamta/ba2.ogg",
    "./audio/begena/selamta/bg2.ogg",

    "./audio/begena/tizita/be2.ogg",
    "./audio/begena/tizita/bc2.ogg",
    "./audio/begena/tizita/bd2.ogg",
    "./audio/begena/tizita/ba2.ogg",
    "./audio/begena/tizita/bg2.ogg",

    "./audio/begena/sile-chernet/bf2.ogg",
    "./audio/begena/sile-chernet/bc2.ogg",
    "./audio/begena/sile-chernet/bcs2.ogg",
    "./audio/begena/sile-chernet/ba2.ogg",
    "./audio/begena/sile-chernet/bfs2.ogg"
];

self.addEventListener("install", event => {

    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {

            return cache.addAll([
                ...APP_SHELL,
                ...BEGENA_AUDIO_FILES
            ]);

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
     * =========================================
     * APP.JS
     * =========================================
     */

    if (url.pathname.endsWith("/app.js")) {

        event.respondWith(

            caches.match(request).then(cachedResponse => {

                if (cachedResponse) {
                    return cachedResponse;
                }

                return fetch(request).then(response => {

                    if (response && response.ok) {

                        const responseClone =
                            response.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {

                                cache.put(
                                    request,
                                    responseClone
                                );

                            });

                    }

                    return response;

                });

            })

        );

        return;
    }


    /*
     * =========================================
     * BEGENA AUDIO
     * =========================================
     */

    if (
        url.pathname.includes("/audio/begena/")
    ) {

        event.respondWith(

            caches.match(request).then(cachedResponse => {

                if (cachedResponse) {
                    return cachedResponse;
                }

                return fetch(request).then(response => {

                    if (response && response.ok) {

                        const responseClone =
                            response.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {

                                cache.put(
                                    request,
                                    responseClone
                                );

                            });

                    }

                    return response;

                });

            })

        );

        return;
    }


    /*
     * =========================================
     * PAGE NAVIGATION
     * =========================================
     */

    if (request.mode === "navigate") {

        event.respondWith(

            fetch(request)
                .then(response => response)
                .catch(() => {

                    return caches.match(
                        "./index.html"
                    );

                })

        );

        return;
    }


    /*
     * =========================================
     * OTHER STATIC FILES
     * =========================================
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

                        const responseClone =
                            response.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {

                                cache.put(
                                    request,
                                    responseClone
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