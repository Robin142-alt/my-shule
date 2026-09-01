import type { Metadata } from "next";
import { cookies } from "next/headers";

import { InstalledAppEntry } from "@/components/pwa/installed-app-entry";
import { isExperienceAudience } from "@/lib/auth/experience-audience";
import { readAudienceCookie } from "@/lib/auth/server-session";

export const metadata: Metadata = {
  title: {
    absolute: "MyShule",
  },
  description: "Secure MyShule school and parent access.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function InstalledAppPage() {
  const cookieStore = await cookies();
  const audience = readAudienceCookie(cookieStore);

  return (
    <InstalledAppEntry
      initialAudience={isExperienceAudience(audience) ? audience : null}
    />
  );
}
