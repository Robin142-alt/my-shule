"use client";

import { useEffect, useId, useRef } from "react";
import { toast } from "sonner";

export interface ToastProps {
  id: string;
  title: string;
  message?: string;
  type?: "success" | "error" | "info";
  onClose: (id: string) => void;
}

/** Keep legacy dashboard notices in the shared, mobile-visible feedback viewport. */
export function WorkflowToast({ id, title, message, type = "info", onClose }: ToastProps) {
  const instanceId = useId();
  const toastId = `workflow:${instanceId}:${id}`;
  const onCloseRef = useRef(onClose);
  const activeToastRef = useRef<string | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    activeToastRef.current = toastId;
    let closed = false;
    const close = () => {
      if (closed || activeToastRef.current !== toastId) return;
      closed = true;
      onCloseRef.current(id);
    };

    toast[type](title, {
      id: toastId,
      description: message,
      duration: type === "error" ? Infinity : 8000,
      closeButton: true,
      onDismiss: close,
      onAutoClose: close,
    });

    return () => {
      activeToastRef.current = null;
      // StrictMode and content updates immediately set up the same notice again.
      // Avoid dismissing that replacement, while still clearing notices on exit.
      queueMicrotask(() => {
        if (activeToastRef.current !== toastId) toast.dismiss(toastId);
      });
    };
  }, [id, message, title, toastId, type]);

  return null;
}

export function ToastContainer({
  toasts,
  removeToast,
}: {
  toasts: Omit<ToastProps, "onClose">[];
  removeToast: (id: string) => void;
}) {
  return toasts.map((notice) => (
    <WorkflowToast key={notice.id} {...notice} onClose={removeToast} />
  ));
}
