"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { MyShuleMark } from "@/components/brand/myshule-brand";
import { isInstalledPwa } from "@/lib/pwa/installed-mode";

export function InstalledPublicSiteRedirect({
  disabled = false,
}: {
  disabled?: boolean;
}) {
  const router = useRouter();
  const coverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (disabled || !isInstalledPwa()) {
      return;
    }

    coverRef.current?.classList.add("is-visible");
    router.replace("/app");
  }, [disabled, router]);

  if (disabled) {
    return null;
  }

  return (
    <div
      ref={coverRef}
      className="installed-public-site-cover fixed inset-0 z-[100] min-h-dvh flex-col items-center justify-center bg-[#071D49] px-6 text-center text-white"
      role="status"
      aria-live="polite"
      data-testid="installed-public-site-redirect"
    >
      <MyShuleMark size={88} preload label="MyShule" />
      <p className="mt-6 text-2xl font-black">
        My<span className="text-[#F4B000]">Shule</span>
      </p>
      <p className="mt-3 text-sm font-semibold text-white/70">
        Opening your secure app
      </p>
    </div>
  );
}
