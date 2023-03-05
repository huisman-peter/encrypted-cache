const ENCRYPTED_CACHE_TAG_NAME = "encrypted-cache";
export class EncryptedCacheElement extends HTMLElement {
  constructor() {
    super();
    if (!EncryptedCacheElement.initDone) {
      EncryptedCacheElement.initDone = new Promise(
        (resolve) => (EncryptedCacheElement.initResolve = resolve),
      );
    }
    console.log("init service worker")
    this.initServiceWorker();
  }

  static initDone: Promise<boolean>;

  static initResolve: (value: boolean) => void;

  static getInstance(): EncryptedCacheElement {
    let instance = document.head.querySelector(ENCRYPTED_CACHE_TAG_NAME);
    if (!instance) {
      instance = document.createElement(ENCRYPTED_CACHE_TAG_NAME);
      document.head.appendChild(instance);
    }
    return instance as EncryptedCacheElement;
  }

  private async initServiceWorker() {
    if (navigator.serviceWorker) {
      let sessionId: string;
      let key: CryptoKey;

      // load key from session storeage
      if (sessionStorage.sessionId) {
        const session = JSON.parse(sessionStorage.sessionId);
        sessionId = session[0];
        key = await crypto.subtle.importKey(
          "jwk",
          session[1],
          {
            name: "AES-CTR",
          },
          false,
          ["encrypt", "decrypt"],
        );
      } else {
        // create session Id and key
        const array = new Uint32Array(4);
        crypto.getRandomValues(array);
        sessionId = Array.from(array, (dec) =>
          ("0" + dec.toString(16)).substring(-2),
        ).join("");

        key = await crypto.subtle.generateKey(
          {
            name: "AES-CTR",
            length: 128,
          },
          true,
          ["encrypt", "decrypt"],
        );

        // store key and session id
        const jwk = await crypto.subtle.exportKey("jwk", key);
        sessionStorage.setItem("sessionId", JSON.stringify([sessionId, jwk]));
      }

      navigator.serviceWorker.addEventListener("message", (event) => {
        // if service worker is ready resolve the init promise
        if (event.data?.messageType === "SESSION_DATA_READY") {
          EncryptedCacheElement.initResolve(true);
        }
      });

      // post session id and key to service worker
      navigator.serviceWorker.ready.then((registration) => {
        console.log("ready");
        registration.active.postMessage({
          messageType: "SESSION_DATA",
          sessionId,
          key,
        });
      });

      // register the service worker, the script is not
      // for scope "/" we need to set 'Service-Worker-Allowed' header
      const swsrc = document
        .querySelector('script[src*="/encrypted-cache.js"]')
        .getAttribute("src")
        .replace("/encrypted-cache.js", "/encrypted-cache-sw.js");
      navigator.serviceWorker.register(swsrc, {scope: "/"});
    }
  }
}

customElements.define(ENCRYPTED_CACHE_TAG_NAME, EncryptedCacheElement);
EncryptedCacheElement.getInstance();
