import {
  buildInviteLoginHref,
  isParentRole,
  redirectAfterInviteAcceptance,
} from "@/lib/auth/invite-redirect";

describe("invite acceptance redirect", () => {
  test("only the exact parent role goes to parent login", () => {
    expect(isParentRole("Parent")).toBe(true);
    expect(isParentRole(" parent ")).toBe(true);
    expect(isParentRole("Teacher")).toBe(false);
    expect(isParentRole("Student")).toBe(false);
    expect(isParentRole("Transport Manager")).toBe(false);
    expect(isParentRole("ICT / Computer Lab user")).toBe(false);

    expect(redirectAfterInviteAcceptance("Parent")).toBe("/parent/login");
    expect(redirectAfterInviteAcceptance("Teacher")).toBe("/school/login");
    expect(redirectAfterInviteAcceptance("Student")).toBe("/school/login");
  });

  test("login href uses invited email and never the invited name", () => {
    expect(buildInviteLoginHref({
      role: "Teacher",
      email: "Teacher.Invited@Example.Test",
      tenantId: "kisumu-boys",
    })).toBe("/school/login?email=teacher.invited%40example.test&tenant=kisumu-boys");

    expect(buildInviteLoginHref({
      role: "Parent",
      email: "parent@example.test",
      tenantId: "kisumu-boys",
    })).toBe("/parent/login?email=parent%40example.test&tenant=kisumu-boys");
  });
});
