"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";

export type ActionFeedbackTone = "success" | "warning" | "danger" | "loading";

/** Publish action feedback to the viewport while retaining its inline context. */
export function useActionFeedback() {
  const id = `action-feedback-${useId()}`;
  const active = useRef(true);
  const [feedback, setFeedback] = useState<{ message: string; tone: ActionFeedbackTone } | null>(null);

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      toast.dismiss(id);
    };
  }, [id]);

  const showFeedback = useCallback((message: string, tone: ActionFeedbackTone) => {
    if (!active.current) return;
    setFeedback({ message, tone });
    const options = { id, duration: tone === "danger" || tone === "loading" ? Infinity : 8000 };
    if (tone === "loading") toast.loading(message, options);
    else if (tone === "danger") toast.error(message, options);
    else if (tone === "warning") toast.warning(message, options);
    else toast.success(message, options);
  }, [id]);

  const clearFeedback = useCallback(() => {
    setFeedback(null);
    toast.dismiss(id);
  }, [id]);

  return {
    notice: feedback?.message ?? null,
    noticeTone: feedback?.tone ?? "success",
    showFeedback,
    clearFeedback,
  };
}
