import type { ExperienceAudience } from "@/lib/auth/experience-audience";

type DisplayModeMatcher = (query: string) => Pick<MediaQueryList, "matches">;

type StandaloneNavigator = {
  maxTouchPoints?: number;
  platform?: string;
  standalone?: boolean;
  userAgent?: string;
};

export type PwaRuntime = {
  matchMedia?: DisplayModeMatcher;
  navigator?: StandaloneNavigator;
};

const audienceLoginPaths: Record<ExperienceAudience, string> = {
  superadmin: "/superadmin/login",
  school: "/school/login",
  portal: "/portal/login",
};

function getBrowserRuntime(): PwaRuntime {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {};
  }

  return {
    matchMedia: typeof window.matchMedia === "function"
      ? window.matchMedia.bind(window)
      : undefined,
    navigator: navigator as StandaloneNavigator,
  };
}

/**
 * Detects iPhone/iPad/iPod browsers, including modern iPads that identify as
 * macOS while using a touch screen.
 */
export function isIosDevice(runtime: PwaRuntime = getBrowserRuntime()) {
  const runtimeNavigator = runtime.navigator;

  if (!runtimeNavigator) {
    return false;
  }

  const userAgent = runtimeNavigator.userAgent ?? "";
  const platform = runtimeNavigator.platform ?? "";

  return /iPad|iPhone|iPod/i.test(userAgent)
    || (platform === "MacIntel" && (runtimeNavigator.maxTouchPoints ?? 0) > 1);
}

/**
 * Detects an installed PWA without storing a second authentication or app-mode
 * flag. Android/desktop PWAs expose display-mode, while iOS exposes the legacy
 * navigator.standalone signal.
 */
export function isInstalledPwa(runtime: PwaRuntime = getBrowserRuntime()) {
  let standaloneDisplayMode = false;

  try {
    standaloneDisplayMode = runtime.matchMedia?.("(display-mode: standalone)").matches === true;
  } catch {
    // Browser capability detection must remain safe in restricted webviews.
  }

  return standaloneDisplayMode || runtime.navigator?.standalone === true;
}

export function getPostLogoutPath(
  audience: ExperienceAudience,
  installed = isInstalledPwa(),
  browserLoginPath?: string,
) {
  return installed ? "/app" : browserLoginPath ?? audienceLoginPaths[audience];
}
