import "./encrypted-cache";

describe("Encrypted cache ", () => {
  it("should register '<encrypted-cache>' web component", async () => {
    await customElements.whenDefined("encrypted-cache");
    const ctor = customElements.get("encrypted-cache");
    expect(ctor).toBeDefined();
  });
});
