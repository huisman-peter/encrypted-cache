# Encrypted browser cache experiment

Cache http requests in a service worker and store response encrypted in cache

## Sample

``` javascript

async function fetchData() {
  await customElements.whenDefined("encrypted-cache");
  await customElements.get("encrypted-cache").initDone;
  return fetch(
    "https://baconipsum.com/api/?type=all-meat&paras=3&start-with-lorem=1",
    {
      headers: {
        "cache-ttl": "200", //cache for 200 seconds
      },
    },
  );
}


```

## Install

`npm install`

## Develop

`npm run dev`

Navigate to `http://localhost:9090`

## Build

`npm run build`

## Test

`npm run test`
