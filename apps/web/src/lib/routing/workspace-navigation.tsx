"use client";

import { createContext, useCallback, useContext, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isSchoolExperienceRole, normalizeSchoolExperienceRole } from "@/lib/auth/school-role-normalization";
import { isPortalSection } from "./experience-routes";
import { isSuperadminPublicSection } from "./superadmin-sections";
import { isSchoolWorkspaceSection } from "./school-workspace-contract";

export type WorkspaceScope = { kind: "school" | "portal" | "superadmin"; role?: string; mode: "public" | "hosted" };

/** Only client-owned workspace routes qualify. API, auth, exports and detail
 * routes keep their server navigation and authorization contracts. */
export function workspaceSection(pathname: string, scope: WorkspaceScope): string | null {
  const prefix = scope.mode === "hosted" ? "" : scope.kind === "superadmin" ? "/superadmin" : `/${scope.kind}/${scope.role}`;
  if (prefix && pathname !== prefix && !pathname.startsWith(`${prefix}/`)) return null;
  const section = pathname.slice(prefix.length).replace(/^\//, "");
  if (section.includes("/")) return null;
  if (!section) return scope.kind === "superadmin" ? "overview" : "dashboard";
  if (scope.kind === "superadmin") return isSuperadminPublicSection(section) ? section : null;
  if (scope.kind === "portal") return isPortalSection(section) ? section : null;
  return isSchoolWorkspaceSection(scope.role ?? "", section) ? section : null;
}

export function publicSchoolRole(pathname: string) {
  const role = pathname.split("/")[2];
  return pathname.startsWith("/school/") && isSchoolExperienceRole(role) && normalizeSchoolExperienceRole(role) === role
    ? normalizeSchoolExperienceRole(role) : null;
}

const WorkspaceNavigationContext = createContext<((href: string, replace?: boolean) => boolean) | null>(null);

export function WorkspaceNavigation({ scope, children }: { scope: WorkspaceScope; children: ReactNode }) {
  const { kind, mode, role } = scope;
  const navigate = useCallback((href: string, replace = false) => {
    const scope = { kind, mode, role };
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin || url.hash || workspaceSection(url.pathname, scope) === null) return false;
    if (workspaceSection(window.location.pathname, scope) === null) return false;
    const next = url.pathname + url.search;
    if (next !== window.location.pathname + window.location.search) {
      const event=new CustomEvent("myshule:before-workspace-navigation",{cancelable:true,detail:{href:next}});
      if(!window.dispatchEvent(event))return true;
      // Next's supported History API integration updates pathname/search hooks
      // without fetching an identical server shell or resetting its providers.
      window.history[replace ? "replaceState" : "pushState"](null, "", next);
    }
    return true;
  }, [kind, mode, role]);
  return <WorkspaceNavigationContext.Provider value={navigate}>
    <div className="contents" onClickCapture={(event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element).closest<HTMLAnchorElement>("a[href]");
      if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
      if (navigate(link.href)) { event.preventDefault(); /* Let local close/selection handlers run. */ }
    }}>{children}</div>
  </WorkspaceNavigationContext.Provider>;
}

/** Programmatic actions share the same route policy as desktop/mobile links. */
export function useWorkspaceRouter() {
  const router = useRouter();
  const navigate = useContext(WorkspaceNavigationContext);
  return useMemo(() => ({
    ...router,
    push: (...args: Parameters<typeof router.push>) => { if (!navigate?.(args[0])) router.push(...args); },
    replace: (...args: Parameters<typeof router.replace>) => { if (!navigate?.(args[0], true)) router.replace(...args); },
  }), [router, navigate]);
}

/** Apply a changed route before children commit, rather than painting the old
 * workspace and correcting it in an effect. Local action setters still work. */
export function useWorkspaceState<T>(value: T | (() => T)): [T, Dispatch<SetStateAction<T>>] {
  const next = typeof value === "function" ? (value as () => T)() : value;
  const [source, setSource] = useState(next);
  const [selected, setSelected] = useState(next);
  if (!Object.is(source, next)) { setSource(next); setSelected(next); }
  return [Object.is(source, next) ? selected : next, setSelected];
}

export function useWorkspaceSection(fallback: string, scope: WorkspaceScope) {
  return workspaceSection(usePathname(), scope) ?? fallback;
}
