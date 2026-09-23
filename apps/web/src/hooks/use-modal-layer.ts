"use client";

import { useEffect, useEffectEvent, useRef } from "react";

const layers: symbol[] = [];
let originalOverflow = "";
let scrollLocks = 0;

/** Shared by portalled sheets, dialogs and navigation. Only the top layer handles keys. */
export function useModalLayer<T extends HTMLElement>(open: boolean, onClose: () => void, options: { lockScroll?: boolean; restoreFocus?: () => boolean } = {}) {
  const ref = useRef<T>(null);
  const close = useEffectEvent(onClose);
  const lockScroll = options.lockScroll ?? true;
  const shouldRestoreFocus = useEffectEvent(() => options.restoreFocus?.() ?? true);

  useEffect(() => {
    if (!open) return;
    const id = Symbol("modal-layer");
    const previousFocus = document.activeElement as HTMLElement | null;
    if (lockScroll && scrollLocks === 0) {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    if (lockScroll) scrollLocks += 1;
    layers.push(id);

    function updateViewport() {
      const viewport = window.visualViewport;
      document.documentElement.style.setProperty("--app-viewport-height", `${viewport?.height ?? window.innerHeight}px`);
      document.documentElement.style.setProperty("--app-viewport-top", `${viewport?.offsetTop ?? 0}px`);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (layers.at(-1) !== id || event.defaultPrevented) return;
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
      if (event.key !== "Tab") return;
      const elements = Array.from(ref.current?.querySelectorAll<HTMLElement>(
        "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
      ) ?? []).filter((element) => {
        if (element.closest("[hidden], [inert], [aria-hidden='true']")) return false;
        for (let node: HTMLElement | null = element; node; node = node.parentElement) {
          const style = getComputedStyle(node);
          if (style.display === "none" || style.visibility === "hidden") return false;
          if (node === ref.current) break;
        }
        return true;
      });
      const first = elements[0];
      const last = elements.at(-1);
      const inside = ref.current?.contains(document.activeElement);
      if (!first) {
        event.preventDefault();
        ref.current?.focus();
      } else if (event.shiftKey && (!inside || document.activeElement === first || document.activeElement === ref.current)) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && (!inside || document.activeElement === last || document.activeElement === ref.current)) {
        event.preventDefault();
        first.focus();
      }
    }
    updateViewport();
    const frame = requestAnimationFrame(() => ref.current?.focus());
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updateViewport);
    window.visualViewport?.addEventListener("resize", updateViewport);
    window.visualViewport?.addEventListener("scroll", updateViewport);
    return () => {
      cancelAnimationFrame(frame);
      layers.splice(layers.indexOf(id), 1);
      if (lockScroll) scrollLocks -= 1;
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updateViewport);
      window.visualViewport?.removeEventListener("resize", updateViewport);
      window.visualViewport?.removeEventListener("scroll", updateViewport);
      if (lockScroll && !scrollLocks) {
        document.body.style.overflow = originalOverflow;
      }
      if (!layers.length) {
        document.documentElement.style.removeProperty("--app-viewport-height");
        document.documentElement.style.removeProperty("--app-viewport-top");
      }
      if (shouldRestoreFocus() && previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open, lockScroll]);

  return ref;
}
