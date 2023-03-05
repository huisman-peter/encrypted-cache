export type {};

const doFetch = async () => {
  // wait for p-session-cache web component
  await customElements.whenDefined("encrypted-cache");
  await (customElements.get("encrypted-cache") as any).initDone;
  // console.log(customElements.get("encrypted-cache"))
  console.log("fetching");
  const data: string[] = await fetch(
    "https://baconipsum.com/api/?type=all-meat&paras=3&start-with-lorem=1",
    {
      headers: {
        "cache-ttl": "20", //cache for 20 seconds
      },
    },
  )
    .then((resp) => resp.json())
    .catch((e) => e);

  const data2: string[] = await fetch(
    "https://baconipsum.com/api/?type=all-meat&paras=5",
    {
      headers: {
        "cache-ttl": "120", //cache for 120 seconds
      },
    },
  )
    .then((resp) => resp.json())
    .catch((e) => e);

  const root = document.querySelector<HTMLDivElement>("#Root");

  [...data, ...data2].forEach((data) => {
    const paragraph = document.createElement("p");
    paragraph.textContent = data;
    root.appendChild(paragraph);
  });
};

doFetch();
