import { readPublicSuperadminSession } from "@/lib/routing/public-experience-session";

export default async function SuperadminHomePage() {
  await readPublicSuperadminSession();
  return null; // The persistent platform layout owns workspace rendering.
}
