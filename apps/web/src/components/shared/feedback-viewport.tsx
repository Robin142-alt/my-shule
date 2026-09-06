"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { Toaster } from "sonner";

/** One viewport for action feedback, outside every workspace's scrolling container. */
export function FeedbackViewport() {
  const viewportRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const viewport = window.visualViewport;
    const updateViewport = () => {
      viewportRef.current?.style.setProperty(
        "--feedback-viewport-top",
        `${viewport?.offsetTop ?? 0}px`,
      );
      viewportRef.current?.style.setProperty(
        "--feedback-viewport-height",
        `${viewport?.height ?? window.innerHeight}px`,
      );
    };

    updateViewport();
    viewport?.addEventListener("resize", updateViewport);
    viewport?.addEventListener("scroll", updateViewport);
    window.addEventListener("resize", updateViewport);
    return () => {
      viewport?.removeEventListener("resize", updateViewport);
      viewport?.removeEventListener("scroll", updateViewport);
      window.removeEventListener("resize", updateViewport);
    };
  }, []);

  return (
    <Toaster
      ref={viewportRef}
      className="myshule-feedback"
      style={{ "--width": "420px" } as CSSProperties}
      position="top-center"
      richColors
      closeButton
      expand
      duration={10_000}
      visibleToasts={Infinity}
      gap={12}
      swipeDirections={[]}
      containerAriaLabel="Action feedback"
      offset={{ top: "calc(var(--feedback-viewport-top, 0px) + max(16px, env(safe-area-inset-top)))" }}
      mobileOffset={{
        top: "calc(var(--feedback-viewport-top, 0px) + max(12px, env(safe-area-inset-top)))",
        left: "max(12px, env(safe-area-inset-left))",
        right: "max(12px, env(safe-area-inset-right))",
      }}
      toastOptions={{ closeButtonAriaLabel: "Dismiss message" }}
    />
  );
}
