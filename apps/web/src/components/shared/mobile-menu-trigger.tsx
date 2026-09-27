"use client";

import { useSyncExternalStore, type ComponentProps } from "react";
import { createPortal } from "react-dom";

const mobileQuery = "(max-width: 1023px)";
const isMobile = () => window.matchMedia(mobileQuery).matches;
const serverSnapshot = () => false;
function subscribe(listener: () => void) {
  const media = window.matchMedia(mobileQuery);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}

/** Keep the existing trigger on larger screens; anchor mobile navigation to the viewport. */
export function MobileMenuTrigger({
  children,
  className,
  mobilePlacement = "edge",
  ...props
}: ComponentProps<"button"> & { mobilePlacement?: "edge" | "inline" }) {
  const mobile = useSyncExternalStore(subscribe, isMobile, serverSnapshot);
  if (!mobile || mobilePlacement === "inline") {
    return <button {...props} className={`${mobilePlacement === "edge" ? "app-top-menu-trigger " : ""}${className ?? ""}`}>{children}</button>;
  }

  // A portal keeps the tab fixed even inside a toolbar with backdrop blur.
  const tab = createPortal(
    <button {...props} className="app-side-menu-tab">
      <span aria-hidden="true">MENU <span className="app-side-menu-arrow">▸</span></span>
      <span className="sr-only">{children}</span>
    </button>,
    document.body,
  );
  // Preserve sibling-count layout rules when the trigger leaves its header.
  return <><span hidden />{tab}</>;
}
