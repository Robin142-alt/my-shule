/** @jest-environment node */
import { readBoundedProxyBody } from "@/lib/dashboard/proxy-body";

describe("bounded proxy upload", () => {
  it("retains bytes for a token-refresh retry", async () => {
    const request = new Request("https://example.invalid/upload", { method: "POST", body: "school data" });
    const result = await readBoundedProxyBody(request, 11);
    expect(new TextDecoder().decode(result)).toBe("school data");
  });

  it.each([undefined, "1"])("rejects actual oversized bytes regardless of content-length %s", async (length) => {
    const cancel = jest.fn();
    const body = new ReadableStream({
      pull(controller) { controller.enqueue(new Uint8Array(8)); },
      cancel,
    });
    const request = new Request("https://example.invalid/upload", {
      method: "POST", body, duplex: "half",
      headers: length ? { "content-length": length } : {},
    } as RequestInit);
    await expect(readBoundedProxyBody(request, 10)).rejects.toThrow("Request body exceeds the upload limit");
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("handles an empty request without allocating an upload buffer", async () => {
    expect(await readBoundedProxyBody(new Request("https://example.invalid/"), 10)).toBeUndefined();
  });
});
