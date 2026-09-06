"use client";

import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { toast } from "sonner";

type AuthMessageTone = "success" | "error" | "info" | "warning";

export function AuthMessage({
  tone,
  title,
  description,
}: {
  tone: AuthMessageTone;
  title: string;
  description: string;
}) {
  const noticeRef = useRef<HTMLDivElement>(null);
  const toastId = `auth-feedback-${useId()}`;
  useEffect(() => {
    // Static guidance stays inline. Action results also surface if outside the
    // visible phone viewport, including when the keyboard has panned the page.
    const frame = requestAnimationFrame(() => {
      if (tone !== "error" && tone !== "success") return;
      const rect = noticeRef.current?.getBoundingClientRect();
      const viewport = window.visualViewport;
      const top = viewport?.offsetTop ?? 0;
      const bottom = top + (viewport?.height ?? window.innerHeight);
      if (rect && rect.height > 0 && (rect.top < top || rect.bottom > bottom)) {
        toast[tone](title, { id: toastId, description, duration: tone === "error" ? Infinity : 10_000 });
      }
    });
    return () => {
      cancelAnimationFrame(frame);
      toast.dismiss(toastId);
    };
  }, [description, title, toastId, tone]);

  const Icon =
    tone === "success"
      ? CheckCircle2
      : tone === "error"
        ? ShieldAlert
        : tone === "warning"
          ? AlertTriangle
          : Info;

  const toneClasses =
    tone === "success"
      ? "border-success/25 bg-success-soft text-foreground"
      : tone === "error"
        ? "border-danger/25 bg-danger-soft text-foreground"
        : tone === "warning"
          ? "border-warning/25 bg-warning-soft text-foreground"
          : "border-accent/25 bg-accent-soft text-foreground";

  const iconClasses =
    tone === "success"
      ? "text-success"
      : tone === "error"
        ? "text-danger"
        : tone === "warning"
          ? "text-warning"
          : "text-accent";

  return (
    <div ref={noticeRef} className={`min-w-0 rounded-2xl border px-4 py-4 ${toneClasses}`} role={tone === "error" ? "alert" : "status"}>
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconClasses}`} />
        <div className="min-w-0">
          <p className="text-sm font-bold">{title}</p>
          <p className="mt-1 break-words text-sm leading-6 text-muted">{description}</p>
        </div>
      </div>
    </div>
  );
}
