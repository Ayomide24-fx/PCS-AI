const CACHE_NAME = "pcs-ai-v1.0.0";

const APP_FILES = [
    "./",
    "./index.html",
    "./style.css",
    "./script.js",
    "./manifest.json"
];


// =====================================================
// INSTALL
// =====================================================

self.addEventListener(
    "install",
    function (event) {

        event.waitUntil(

            caches.open(CACHE_NAME)
                .then(
                    function (cache) {

                        return cache.addAll(
                            APP_FILES
                        );

                    }
                )

        );


        self.skipWaiting();

    }
);


// =====================================================
// ACTIVATE
// =====================================================

self.addEventListener(
    "activate",
    function (event) {

        event.waitUntil(

            caches.keys()
                .then(
                    function (cacheNames) {

                        return Promise.all(

                            cacheNames
                                .filter(
                                    function (cacheName) {

                                        return (
                                            cacheName !==
                                            CACHE_NAME
                                        );

                                    }
                                )
                                .map(
                                    function (cacheName) {

                                        return caches.delete(
                                            cacheName
                                        );

                                    }
                                )

                        );

                    }
                )

        );


        self.clients.claim();

    }
);


// =====================================================
// FETCH
// =====================================================

self.addEventListener(
    "fetch",
    function (event) {

        const request =
            event.request;


        // Do not cache API/backend requests.
        if (
            request.url.includes(
                "pcs-ai-backend.onrender.com"
            )
        ) {

            return;

        }


        // Only handle GET requests.
        if (
            request.method !== "GET"
        ) {

            return;

        }


        event.respondWith(

            fetch(request)
                .then(
                    function (response) {

                        if (
                            response &&
                            response.status === 200 &&
                            response.type === "basic"
                        ) {

                            const responseClone =
                                response.clone();


                            caches.open(
                                CACHE_NAME
                            ).then(
                                function (cache) {

                                    cache.put(
                                        request,
                                        responseClone
                                    );

                                }
                            );

                        }


                        return response;

                    }
                )
                .catch(
                    function () {

                        return caches.match(
                            request
                        );

                    }
                )

        );

    }
);
