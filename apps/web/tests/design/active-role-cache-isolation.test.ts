import { buildPermissionQueryKey } from "@/components/providers/permission-context";
import { buildClassTeacherQueryKey } from "@/lib/data/class-teacher-hooks";
import { buildSchoolQueryKey } from "@/lib/data/school-hooks";

describe("active-role cache isolation", () => {
  it("uses distinct data and permission cache keys for each active role and tenant", () => {
    expect(buildSchoolQueryKey("school-alpha", "user-1", "principal", "/students"))
      .not.toEqual(buildSchoolQueryKey("school-alpha", "user-1", "teacher", "/students"));
    expect(buildPermissionQueryKey("school-alpha", "user-1", "principal"))
      .not.toEqual(buildPermissionQueryKey("school-alpha", "user-1", "teacher"));
    expect(buildSchoolQueryKey("school-alpha", "user-1", "teacher", "/students"))
      .not.toEqual(buildSchoolQueryKey("school-beta", "user-1", "teacher", "/students"));
    expect(buildSchoolQueryKey("school-alpha", "user-1", "teacher", "/students"))
      .not.toEqual(buildSchoolQueryKey("school-alpha", "user-2", "teacher", "/students"));
    expect(buildPermissionQueryKey("school-alpha", "user-1", "teacher"))
      .not.toEqual(buildPermissionQueryKey("school-alpha", "user-2", "teacher"));
  });

  it("scopes class-teacher read models by tenant, user, and raw authorization role", () => {
    const teacherKey = buildClassTeacherQueryKey({
      schoolId: "school-alpha",
      userId: "user-1",
      activeAuthorizationRoleCode: "teacher",
    }, "register", "stream-1");

    expect(teacherKey).not.toEqual(buildClassTeacherQueryKey({
      schoolId: "school-alpha",
      userId: "user-1",
      activeAuthorizationRoleCode: "class_teacher",
    }, "register", "stream-1"));
    expect(teacherKey).not.toEqual(buildClassTeacherQueryKey({
      schoolId: "school-alpha",
      userId: "user-2",
      activeAuthorizationRoleCode: "teacher",
    }, "register", "stream-1"));
    expect(teacherKey).not.toEqual(buildClassTeacherQueryKey({
      schoolId: "school-beta",
      userId: "user-1",
      activeAuthorizationRoleCode: "teacher",
    }, "register", "stream-1"));
  });
});
