"use client";

import { useEffect, useState } from "react";

import { buildTimeAwareGreeting } from "@/lib/greetings/time-aware-greeting";

type DashboardGreetingTone = "dark" | "light";

export function DashboardGreeting({
  name,
  context,
  tone = "dark",
  className = "",
  asHeading = false,
}: {
  name: string;
  context?: string;
  tone?: DashboardGreetingTone;
  className?: string;
  asHeading?: boolean;
}) {
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const textTone = tone === "light" ? "text-white" : "text-foreground";
  const contextTone = tone === "light" ? "text-white/70" : "text-muted";
  const greetingText = buildTimeAwareGreeting(name, currentDate);

  useEffect(() => {
    const updateGreeting = () => setCurrentDate(new Date());

    updateGreeting();
    const timer = window.setInterval(updateGreeting, 60_000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className={className} data-testid="dashboard-time-greeting">
      {asHeading ? (
        <h1 className={`text-sm font-black leading-tight tracking-normal sm:text-base ${textTone}`}>
          {greetingText}
        </h1>
      ) : (
        <p className={`text-sm font-black leading-tight tracking-normal sm:text-base ${textTone}`}>
          {greetingText}
        </p>
      )}
      {context ? (
        <p className={`mt-1 text-xs font-semibold leading-5 ${contextTone}`}>
          {context}
        </p>
      ) : null}
    </div>
  );
}
