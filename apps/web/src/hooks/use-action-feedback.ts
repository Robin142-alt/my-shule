"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";

export type ActionFeedbackTone = "success" | "warning" | "danger" | "loading";

/** Publish action feedback to the viewport while retaining its inline context. */
export function useActionFeedback() {
  const id = `action-feedback-${useId()}`;
  const active = useRef(true);
  const noticeId = useRef<string | null>(null);
  const noticeSequence = useRef(0);
  const [feedback, setFeedback] = useState<{ message: string; tone: ActionFeedbackTone } | null>(null);

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      if (noticeId.current) toast.dismiss(noticeId.current);
      noticeId.current = null;
    };
  }, [id]);

  const showFeedback = useCallback((message: string, tone: ActionFeedbackTone) => {
    if (!active.current) return;
    setFeedback({ message, tone });
    // Dismissal is deferred by the toast renderer. A new action needs a fresh ID
    // so an earlier notice's animation cannot remove a fast new result.
    noticeId.current ??= `${id}-${++noticeSequence.current}`;
    const options = { id: noticeId.current, duration: tone === "danger" || tone === "loading" ? Infinity : 8000 };
    if (tone === "loading") toast.loading(message, options);
    else if (tone === "danger") toast.error(message, options);
    else if (tone === "warning") toast.warning(message, options);
    else toast.success(message, options);
  }, [id]);

  const clearFeedback = useCallback(() => {
    setFeedback(null);
    if (noticeId.current) toast.dismiss(noticeId.current);
    noticeId.current = null;
  }, []);

  return {
    notice: feedback?.message ?? null,
    noticeTone: feedback?.tone ?? "success",
    showFeedback,
    clearFeedback,
  };
}
