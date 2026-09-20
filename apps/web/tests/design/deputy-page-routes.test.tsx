import SchoolSectionPage from "@/app/school/[role]/[section]/page";
import InternalSchoolSectionPage from "@/app/internal/school/[section]/page";
import { readPublicSchoolSession } from "@/lib/routing/public-experience-session";
import { readSchoolRequestContext } from "@/lib/routing/experience-context";
import { DEPUTY_WORKSPACES, DEPUTY_WORKSPACE_ALIASES } from "@/lib/routing/deputy-workspaces";

jest.mock("@/components/school/school-pages", () => ({ SchoolPages: () => null }));
jest.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
jest.mock("next/navigation", () => ({
  redirect: (href: string) => { throw new Error(`redirect:${href}`); },
  notFound: () => { throw new Error("not-found"); },
}));
jest.mock("@/lib/routing/public-experience-session", () => ({ readPublicSchoolSession: jest.fn() }));
jest.mock("@/lib/routing/experience-context", () => ({ readSchoolRequestContext: jest.fn() }));

beforeEach(() => {
  const session = { role: "deputy-principal", tenantSlug: "school-a", userLabel: "Deputy A" };
  jest.mocked(readPublicSchoolSession).mockResolvedValue(session as never);
  jest.mocked(readSchoolRequestContext).mockResolvedValue(session as never);
});

it.each(DEPUTY_WORKSPACES)("opens deputy %s with the authenticated school on public and hosted routes", async (section) => {
  const publicPage = await SchoolSectionPage({ params: Promise.resolve({ role: "deputy-principal", section }) });
  expect(readPublicSchoolSession).toHaveBeenCalledWith("deputy-principal", { preserveSection: section });
  expect(publicPage.props).toMatchObject({ role: "deputy-principal", section, tenantSlug: "school-a", sessionVerificationEnabled: true });
  const hosted = await InternalSchoolSectionPage({ params: Promise.resolve({ section }) });
  expect(hosted.props).toMatchObject({ role: "deputy-principal", section, tenantSlug: "school-a", sessionVerificationEnabled: true });
});

it.each(Object.entries(DEPUTY_WORKSPACE_ALIASES))("retires %s in favour of %s", async (section, target) => {
  await expect(SchoolSectionPage({ params: Promise.resolve({ role: "deputy-principal", section }) })).rejects.toThrow(`redirect:/school/deputy-principal/${target}`);
  await expect(InternalSchoolSectionPage({ params: Promise.resolve({ section }) })).rejects.toThrow(`redirect:/${target}`);
});

it("does not expose a blank legacy dashboard for an unsupported deputy workspace", async () => {
  await expect(SchoolSectionPage({ params: Promise.resolve({ role: "deputy-principal", section: "unknown-workspace" }) })).rejects.toThrow("not-found");
});
