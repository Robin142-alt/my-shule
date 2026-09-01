import fs from "node:fs";
import path from "node:path";

import manifest from "@/app/manifest";
import {
  registerMyShuleServiceWorker,
  scheduleMyShuleServiceWorkerRegistration,
} from "@/lib/pwa/service-worker-registration";

describe("MyShule PWA infrastructure", () => {
  it("keeps one app identity while launching the installed experience at /app", () => {
    expect(manifest()).toMatchObject({
      id: "/",
      name: "MyShule",
      short_name: "MyShule",
      start_url: "/app",
      scope: "/",
      display: "standalone",
      background_color: "#071D49",
      theme_color: "#071D49",
    });
  });

  it("registers the existing web application at root scope without HTTP cache reuse", async () => {
    const register = jest.fn().mockResolvedValue({});

    await registerMyShuleServiceWorker({ register } as never);

    expect(register).toHaveBeenCalledWith("/service-worker.js", {
      scope: "/",
      updateViaCache: "none",
    });
  });

  it("registers immediately after load and cleans up a pending load listener", () => {
    const immediateRegister = jest.fn().mockResolvedValue({});
    const addEventListener = jest.fn();
    const removeEventListener = jest.fn();

    scheduleMyShuleServiceWorkerRegistration({
      documentObject: { readyState: "complete" },
      serviceWorkerContainer: { register: immediateRegister } as never,
      windowObject: { addEventListener, removeEventListener } as never,
    });

    expect(immediateRegister).toHaveBeenCalledTimes(1);
    expect(addEventListener).not.toHaveBeenCalled();

    const pendingRegister = jest.fn().mockResolvedValue({});
    const cleanup = scheduleMyShuleServiceWorkerRegistration({
      documentObject: { readyState: "loading" },
      serviceWorkerContainer: { register: pendingRegister } as never,
      windowObject: { addEventListener, removeEventListener } as never,
    });

    expect(addEventListener).toHaveBeenCalledWith("load", expect.any(Function), { once: true });
    cleanup();
    expect(removeEventListener).toHaveBeenCalledWith("load", expect.any(Function));
    expect(pendingRegister).not.toHaveBeenCalled();
  });

  it("never persists API responses or authenticated dashboard navigations", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "public", "service-worker.js"),
      "utf8",
    );

    expect(source).toContain('if (request.mode === "navigate")');
    expect(source).toContain("return await fetch(event.request)");
    expect(source).toContain('if (!isPublicStaticPath(requestUrl.pathname))');
    expect(source).not.toMatch(/cache\.put\([^\n]*(?:api|auth|dashboard|school|portal)/i);
    expect(source).not.toMatch(/pathname\.startsWith\(["']\/api/i);
  });
});
