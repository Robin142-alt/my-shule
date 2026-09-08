import SchoolSectionPage from "@/app/school/[role]/[section]/page";
import InternalSchoolSectionPage from "@/app/internal/school/[section]/page";
import { readPublicSchoolSession } from "@/lib/routing/public-experience-session";
import { readSchoolRequestContext } from "@/lib/routing/experience-context";

jest.mock("@/components/school/school-pages", () => ({ SchoolPages: () => null }));
jest.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
jest.mock("next/navigation", () => ({
  redirect: (href: string) => { throw new Error(`redirect:${href}`); },
  notFound: () => { throw new Error("not-found"); },
}));
jest.mock("@/lib/routing/public-experience-session", () => ({ readPublicSchoolSession: jest.fn() }));
jest.mock("@/lib/routing/experience-context", () => ({ readSchoolRequestContext: jest.fn() }));

describe("Principal server page routes", () => {
  beforeEach(() => {
    const session = { role: "principal", tenantSlug: "school-a", userLabel: "Principal A" };
    jest.mocked(readPublicSchoolSession).mockResolvedValue(session as never);
    jest.mocked(readSchoolRequestContext).mockResolvedValue(session as never);
  });

  it.each(["students", "timetable", "academic-intelligence", "users-invitations", "exams-reports", "sick-bay", "attendance-monitoring"])(
    "preserves authenticated Principal context for %s on public and school hosts", async (section) => {
      const publicPage = await SchoolSectionPage({ params: Promise.resolve({ role: "principal", section }) });
      expect(readPublicSchoolSession).toHaveBeenCalledWith("principal", { preserveSection: section });
      expect(publicPage.props).toEqual(expect.objectContaining({ role: "principal", section, tenantSlug: "school-a", sessionVerificationEnabled: true }));
      const hostedPage = await InternalSchoolSectionPage({ params: Promise.resolve({ section }) });
      expect(hostedPage.props).toEqual(expect.objectContaining({ role: "principal", section, tenantSlug: "school-a", sessionVerificationEnabled: true }));
    },
  );

  it("redirects old Principal attendance bookmarks to the supported workspace", async () => {
    await expect(SchoolSectionPage({ params: Promise.resolve({ role: "principal", section: "attendance" }) })).rejects.toThrow("redirect:/school/principal/attendance-monitoring");
    await expect(InternalSchoolSectionPage({ params: Promise.resolve({ section: "attendance" }) })).rejects.toThrow("redirect:/attendance-monitoring");
  });

  it("keeps the retired generic attendance workspace unavailable to other roles", async () => {
    await expect(SchoolSectionPage({ params: Promise.resolve({ role: "teacher", section: "attendance" }) })).rejects.toThrow("not-found");
    jest.mocked(readSchoolRequestContext).mockResolvedValue({ role: "teacher", tenantSlug: "school-a" } as never);
    await expect(InternalSchoolSectionPage({ params: Promise.resolve({ section: "attendance" }) })).rejects.toThrow("not-found");
  });

  it("keeps unknown Principal routes unavailable", async () => {
    await expect(SchoolSectionPage({ params: Promise.resolve({ role: "principal", section: "unknown-workspace" }) })).rejects.toThrow("not-found");
  });
});
