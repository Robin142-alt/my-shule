"use client";

import { Download, Share, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { isInstalledPwa, isIosDevice } from "@/lib/pwa/installed-mode";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function PwaInstallAction() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosAction, setShowIosAction] = useState(false);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const installButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dismissIosInstructions = useCallback(() => {
    setShowIosInstructions(false);
    window.setTimeout(() => installButtonRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    if (isInstalledPwa()) {
      return;
    }

    const iosActionTimer = window.setTimeout(() => setShowIosAction(isIosDevice()), 0);

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstallPrompt(null);
      setShowIosAction(false);
      setShowIosInstructions(false);
    };

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.clearTimeout(iosActionTimer);
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  useEffect(() => {
    if (!showIosInstructions) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        dismissIosInstructions();
      }

      if (event.key === "Tab") {
        event.preventDefault();
        closeButtonRef.current?.focus();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [dismissIosInstructions, showIosInstructions]);

  if (!installPrompt && !showIosAction) {
    return null;
  }

  async function requestInstall() {
    if (!installPrompt) {
      setShowIosInstructions(true);
      return;
    }

    await installPrompt.prompt();
    await installPrompt.userChoice.catch(() => null);
    setInstallPrompt(null);
  }

  return (
    <>
      <button
        ref={installButtonRef}
        type="button"
        aria-label="Install MyShule"
        onClick={() => void requestInstall()}
        className="inline-flex min-h-11 touch-manipulation items-center gap-2 rounded-xl border border-white/15 bg-white/[0.1] px-3 text-sm font-bold text-white transition hover:border-[#F97316]/60 hover:bg-white/[0.16]"
      >
        <Download className="h-4 w-4 text-[#F4B000]" aria-hidden="true" />
        <span className="hidden sm:inline">Install MyShule</span>
        <span className="sm:hidden" aria-hidden="true">Install</span>
      </button>

      {showIosInstructions ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-[#071D49]/70 p-3 backdrop-blur-sm sm:items-center"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
              dismissIosInstructions();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
            className="w-full max-w-md rounded-3xl bg-white p-5 text-[#071D49] shadow-[0_30px_90px_rgba(0,0,0,0.32)]"
            style={{ marginBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#F97316]">
                  iPhone or iPad
                </p>
                <h2 id="ios-install-title" className="mt-1 text-xl font-black">
                  Add MyShule to your Home Screen
                </h2>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                aria-label="Close install instructions"
                onClick={dismissIosInstructions}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#F3F4F6]"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <ol className="mt-5 space-y-3 text-sm font-semibold leading-6 text-[#5F6F89]">
              <li className="flex gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#071D49] text-xs text-white">1</span>
                <span>Open the browser Share menu <Share className="ml-1 inline h-4 w-4 text-[#2563EB]" aria-hidden="true" />.</span>
              </li>
              <li className="flex gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#071D49] text-xs text-white">2</span>
                <span>Choose <strong className="text-[#071D49]">Add to Home Screen</strong>, then confirm Add.</span>
              </li>
            </ol>
          </section>
        </div>
      ) : null}
    </>
  );
}
