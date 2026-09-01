import {
  getPostLogoutPath,
  isInstalledPwa,
  isIosDevice,
  type PwaRuntime,
} from "@/lib/pwa/installed-mode";
import { getExpiredSessionLoginPath } from "@/lib/auth/session-expiry-client";

function runtime(
  input: {
    displayMode?: boolean;
    maxTouchPoints?: number;
    platform?: string;
    standalone?: boolean;
    userAgent?: string;
  } = {},
): PwaRuntime {
  return {
    matchMedia: () => ({ matches: input.displayMode === true }),
    navigator: {
      maxTouchPoints: input.maxTouchPoints,
      platform: input.platform,
      standalone: input.standalone,
      userAgent: input.userAgent,
    },
  };
}

describe("installed PWA routing", () => {
  it("detects standalone display mode used by installed Android and desktop PWAs", () => {
    expect(isInstalledPwa(runtime({ displayMode: true }))).toBe(true);
  });

  it("detects the iOS navigator standalone signal", () => {
    expect(isInstalledPwa(runtime({ standalone: true }))).toBe(true);
  });

  it("keeps ordinary browser tabs out of installed mode", () => {
    expect(isInstalledPwa(runtime())).toBe(false);
    expect(isInstalledPwa({})).toBe(false);
  });

  it("detects native iOS user agents and touch-enabled iPad desktop mode", () => {
    expect(
      isIosDevice(
        runtime({
          userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
        }),
      ),
    ).toBe(true);
    expect(
      isIosDevice(runtime({ platform: "MacIntel", maxTouchPoints: 5 })),
    ).toBe(true);
    expect(
      isIosDevice(runtime({ platform: "MacIntel", maxTouchPoints: 0 })),
    ).toBe(false);
  });

  it("returns the app entry after installed logout and existing audience logins in browsers", () => {
    expect(getPostLogoutPath("school", true)).toBe("/app");
    expect(getPostLogoutPath("portal", false)).toBe("/portal/login");
    expect(getPostLogoutPath("portal", false, "/parent/login")).toBe(
      "/parent/login",
    );
    expect(getPostLogoutPath("school", false)).toBe("/school/login");
    expect(getPostLogoutPath("superadmin", false)).toBe("/superadmin/login");
  });

  it("returns installed expired sessions to the chooser without changing browser expiry routes", () => {
    expect(getExpiredSessionLoginPath("school", true)).toBe("/app");
    expect(getExpiredSessionLoginPath("portal", true)).toBe("/app");
    expect(getExpiredSessionLoginPath("school", false)).toBe(
      "/school/login?expired=1",
    );
    expect(getExpiredSessionLoginPath("portal", false)).toBe(
      "/portal/login?expired=1",
    );
  });
});
