export type {};

interface ExtendableEvent extends Event {
  waitUntil(fn: Promise<any>): void;
}

const TTL_HEADER = "cache-ttl";

declare const self: ServiceWorkerGlobalScope;

const textEncoder = new TextEncoder();

const textDecoder = new TextDecoder();

const sessionMap = new Map();

function encrypt(data: string, key: CryptoKey) {
  const body = textEncoder.encode(data);
  return crypto.subtle.encrypt(
    {
      name: "AES-CTR",
      counter: new Uint8Array(16),
      length: 128,
    },
    key,
    body,
  );
}

function decrypt(encrypted: BufferSource, key: CryptoKey) {
  return crypto.subtle.decrypt(
    {
      name: "AES-CTR",
      counter: new Uint8Array(16),
      length: 128,
    },
    key,
    encrypted,
  );
}

// Remove expired response objects from cache
async function cacheEviction() {
  console.log("cleanup");
  const cacheKeys = await caches.keys();
  for (const cacheKey of cacheKeys) {
    const cache = await caches.open(cacheKey);
    let keys = await cache.keys();
    for (const key of keys) {
      const response = await cache.match(key);
      const expireHeader = response.headers.get("sw-expire");
      if (expireHeader !== null) {
        const expire = parseInt(expireHeader, 10);
        const now = Math.floor(Date.now() / 1000);
        if (expire < now) {
          console.log("deleting " + key.url);
          await cache.delete(key);
        }
      }
    }
    keys = await cache.keys();
    if (keys.length < 1) {
      await caches.delete(cacheKey);
    }
  }
}

// Store session id and the key (secret) in a map using the client id as index.
// The session id and key is provided by the page and is stored in session storage.
self.addEventListener("message", (event: MessageEventInit) => {
  if (event.data?.messageType === "SESSION_DATA") {
    delete event.data.messageType;
    const client: any = event.source;
    sessionMap.set(client.id, event.data);
    for (const [key, value] of sessionMap) {
      if (key !== client.id && value.sessionId === event.data.sessionId) {
        sessionMap.delete(key);
      }
    }
    client.postMessage({
      messageType: "SESSION_DATA_READY",
    });
  }
});

// SkipWaiting forces the waiting service worker to become the active service worker.
self.addEventListener("install", () => {
  console.log("install");
  self.skipWaiting();
});

// When a service worker is initially registered, pages won't use it until they next load.
// The claim() method causes those pages to be controlled immediately.
self.addEventListener("activate", async (event: ExtendableEvent) => {
  event.waitUntil(self.clients.claim());
  console.log("activate");
  cacheEviction();
});

self.addEventListener("fetch", async (event) => {
  const hasSwCacheHeader = event.request.headers.get(TTL_HEADER) !== null;
  const isGetRequest = event.request.method === "GET";
  const sessionData = sessionMap.get(event.clientId);

  // cache only get request with the sw header
  if (sessionData && isGetRequest && hasSwCacheHeader) {
    let responseWithResolve: (value: Response) => void;
    const retVal = new Promise<Response>(
      (resolve) => (responseWithResolve = resolve),
    );
    event.respondWith(retVal);

    await cacheEviction();

    // open the cache
    const sessionCache = await caches.open(sessionData.sessionId);

    const match = await sessionCache.match(event.request).catch((e) => e);

    if (!match || match instanceof Error) {
      // no cache hit
      // make a copy the request headers without the sw header
      const headers = new Headers();
      let ttl = 0;
      for (var key of (event.request.headers as any).keys()) {
        //keys() is available in serviceworkers
        if (key !== TTL_HEADER) {
          headers.append(key, event.request.headers.get(key));
        } else {
          ttl = parseInt(event.request.headers.get(key), 10);
        }
      }

      const {
        body,
        cache,
        credentials,
        integrity,
        keepalive,
        method,
        mode,
        redirect,
        referrer,
        referrerPolicy,
        signal,
        window,
      } = event.request as any;

      // fetch the request with the same RequestInit params en the copy of headers
      const response = await fetch(event.request.url, {
        headers,
        body,
        cache,
        credentials,
        integrity,
        keepalive,
        method,
        mode,
        redirect,
        referrer,
        referrerPolicy,
        signal,
        window,
      });
      // copy the response object and add expire time header
      const copyResponse = response.clone();
      var copyHeaders = new Headers(copyResponse.headers);
      copyHeaders.append(
        "sw-expire",
        (Math.floor(Date.now() / 1000) + ttl).toString(),
      );
      headers.append(key, event.request.headers.get(key));
      const jsonBody = JSON.stringify(await copyResponse.json());
      // todo cacche only if status 200

      // encrypt response body and store it in cache
      const encrypted = await encrypt(jsonBody, sessionData.key);
      console.log("cache put " + event.request.url);
      await sessionCache.put(
        event.request,
        new Response(encrypted, {...copyResponse, headers: copyHeaders}),
      );
      // resolve the fetch response
      responseWithResolve(response);
    } else {
      // cache hit
      // resolve decrypted cache response
      const cloneMatch = match.clone();
      const arrayBuffer = await cloneMatch.arrayBuffer().catch((e: Error) => e);
      const decrypted = await decrypt(arrayBuffer, sessionData.key);
      const str = textDecoder.decode(decrypted);
      console.log("cache hit " + event.request.url);
      responseWithResolve(new Response(str, match));
    }
  }
});
