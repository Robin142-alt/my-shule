"use client";

import dynamic from "next/dynamic";
import { createElement, useState, type ComponentType } from "react";

export function WorkspaceContentLoading() {
  return <div role="status" aria-live="polite" className="rounded-xl border border-border bg-surface p-5 text-sm text-muted" data-testid="workspace-content-loading">
    Opening workspace…
  </div>;
}

/** Code-only caching is safe across roles. Records remain in identity-scoped
 * query caches and are fetched by the workspace after authorization. */
export function workspaceResource<P extends object = Record<string, never>>(
  loader: () => Promise<ComponentType<P>>,
  loading = WorkspaceContentLoading,
) {
  let pending: Promise<ComponentType<P>> | undefined;
  let resolved: ComponentType<P> | undefined;
  const preload = () => pending ??= loader().then(component => {
    resolved = component;
    return component;
  }).catch((error: unknown) => { pending = undefined; throw error; });
  const Lazy = dynamic<P>(preload, { loading });
  // A prefetched module can render on the very first commit. React.lazy alone
  // would still suspend once while it unwraps an already fulfilled import.
  function Resource(props: P) {
    const [Component] = useState(() => resolved ?? Lazy);
    return createElement(Component, props);
  }
  return Object.assign(Resource, { preload });
}
