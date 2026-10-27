import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { useEffect } from "react";
import { WorkspaceNavigation, workspaceSection, useWorkspaceState } from "@/lib/routing/workspace-navigation";
import { SCHOOL_SECTIONS, PORTAL_SECTIONS, SUPERADMIN_SECTIONS } from "@/lib/routing/experience-routes";
import { isSchoolWorkspaceSection } from "@/lib/routing/school-workspace-contract";
import { dedicatedSchoolWorkspaces } from "@/lib/routing/school-workspace-contract";

const school = { kind: "school", mode: "public", role: "teacher" } as const;

test.each(["principal", "hos", "teacher"])("%s syllabus coverage stays inside the persistent school workspace", (role) => {
  expect(workspaceSection(`/school/${role}/syllabus-coverage`, { ...school, role })).toBe("syllabus-coverage");
  expect(workspaceSection('/syllabus-coverage', { ...school, role, mode: "hosted" })).toBe("syllabus-coverage");
});

test("workspace allowlists agree with public and hosted navigation", () => {
  for (const [role, sections] of Object.entries(dedicatedSchoolWorkspaces)) for (const section of sections) {
    expect(workspaceSection(`/school/${role}/${section}`, { ...school, role })).toBe(section);
    expect(workspaceSection(`/${section}`, { ...school, role, mode: "hosted" })).toBe(section);
  }
  for (const role of ["principal", "deputy-principal", "teacher", "accountant", "bursar", "dean-academics", "exams-manager", "hod", "hos", "grade-master", "class-teacher", "admissions", "secretary", "librarian", "nurse", "storekeeper", "boarding-master", "security-officer", "transport-manager", "ict-manager", "laboratory-technician", "guidance-counselling", "discipline-master", "procurement-officer", "admin", "student"]) {
    for (const section of SCHOOL_SECTIONS) {
      const expected = isSchoolWorkspaceSection(role, section) ? section : null;
      expect(workspaceSection(`/school/${role}/${section}`, { ...school, role })).toBe(expected);
      expect(workspaceSection(`/${section}`, { ...school, role, mode: "hosted" })).toBe(expected);
    }
  }
  for (const viewer of ["parent", "student"]) for (const section of PORTAL_SECTIONS) {
    expect(workspaceSection(`/portal/${viewer}/${section}`, { kind: "portal", mode: "public", role: viewer })).toBe(section);
  }
  for (const section of SUPERADMIN_SECTIONS) expect(workspaceSection(`/superadmin/${section}`, { kind: "superadmin", mode: "public" })).toBe(section);
});

test.each(["/school/principal/students", "/school/login", "/api/students", "/school/teacher/students/another-id", "/school/teacher/unknown"])("server-owned destination %s is never treated as a local workspace", (path) => {
  expect(workspaceSection(path, school)).toBeNull();
});

test("route changes select synchronously and preserve the mounted shell", () => {
  const commits: string[] = [];
  let mounts = 0;
  function Probe({ section }: { section: string }) {
    const [selected, select] = useWorkspaceState(section);
    useEffect(() => { mounts++; }, []);
    useEffect(() => { commits.push(selected); });
    return <button onClick={() => select("reports")}>{selected}</button>;
  }
  const view = render(<Probe section="classes" />);
  const node = screen.getByRole("button");
  view.rerender(<Probe section="attendance" />);
  expect(screen.getByRole("button")).toBe(node);
  expect(commits).toEqual(["classes", "attendance"]);
  expect(mounts).toBe(1);
  fireEvent.click(node);
  expect(node).toHaveTextContent("reports");
  view.rerender(<Probe section="classes" />);
  expect(node).toHaveTextContent("classes");
});

test("native navigation preserves query actions, history, and modified link clicks", () => {
  window.history.replaceState(null, "", "/school/teacher/classes");
  const push = jest.spyOn(window.history, "pushState");
  const close = jest.fn();
  render(<WorkspaceNavigation scope={school}>
    {/* Native anchors are intentional: this tests interception before Next Link. */}
    {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
    <a href="/school/teacher/assignments?action=create" onClick={close}>Assignments</a>
  </WorkspaceNavigation>);
  fireEvent.click(screen.getByText("Assignments"));
  expect(push).toHaveBeenCalledTimes(1);
  expect(window.location.pathname + window.location.search).toBe("/school/teacher/assignments?action=create");
  expect(close).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByText("Assignments"), { ctrlKey: true });
  expect(push).toHaveBeenCalledTimes(1);
  push.mockRestore();
});

test("rapid route updates cannot restore an earlier workspace", () => {
  const { result, rerender } = renderHook(({ section }) => useWorkspaceState(section), { initialProps: { section: "overview" } });
  act(() => result.current[1]("classes"));
  rerender({ section: "attendance" });
  rerender({ section: "reports" });
  expect(result.current[0]).toBe("reports");
});
