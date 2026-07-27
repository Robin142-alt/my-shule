import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  AcademicAttendancePolicyEditor,
  AcademicGradeBandsEditor,
  AcademicReportCardPolicyEditor,
  validateAcademicGradeBands,
  validateAttendanceConfiguration,
} from "@/components/school/academic-policy-builders";

function structuredValue(container: HTMLElement, name: string) {
  const input = container.querySelector<HTMLInputElement>(`input[type="hidden"][name="${name}"]`);
  if (!input) throw new Error(`Missing structured field ${name}`);
  return JSON.parse(input.value) as unknown;
}

describe("academic policy builders", () => {
  it("builds complete grading bands from school-friendly presets", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <form>
        <AcademicGradeBandsEditor name="rules" />
      </form>,
    );

    const secondary = structuredValue(container, "rules");
    expect(Array.isArray(secondary)).toBe(true);
    expect(secondary).toHaveLength(5);
    expect(validateAcademicGradeBands(secondary)).toBeNull();

    await user.click(screen.getByRole("button", { name: "CBC starter" }));
    const cbc = structuredValue(container, "rules") as Array<Record<string, unknown>>;
    expect(cbc).toHaveLength(4);
    expect(cbc[0]).toMatchObject({ label: "EE", min: 75, max: 100, points: 4 });
    expect(validateAcademicGradeBands(cbc)).toBeNull();
    expect(screen.getByText("4 grade bands cover every mark from 0 to 100.")).toBeInTheDocument();
  });

  it("validates gaps and overlaps before a grading policy can be saved", () => {
    expect(validateAcademicGradeBands([
      { label: "A", min: 80, max: 100 },
      { label: "B", min: 0, max: 78 },
    ])).toContain("uncovered mark range");

    expect(validateAcademicGradeBands([
      { label: "A", min: 70, max: 100 },
      { label: "B", min: 0, max: 75 },
    ])).toContain("overlap");
  });

  it("builds the attendance schedule from register checkboxes", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <form>
        <AcademicAttendancePolicyEditor name="configuration" />
      </form>,
    );

    expect(screen.getByLabelText("Morning register")).toBeChecked();
    expect(screen.getByLabelText("Afternoon register")).toBeChecked();
    expect(screen.getByLabelText("Evening / boarding register")).not.toBeChecked();

    await user.click(screen.getByLabelText("Evening / boarding register"));
    const configuration = structuredValue(container, "configuration") as Record<string, unknown>;
    expect(configuration.sessions).toEqual(["morning", "afternoon", "evening"]);
    expect(configuration.late_after).toBe("08:00");
    expect(validateAttendanceConfiguration(configuration)).toBeNull();
  });

  it("builds report-card comments and signature lines without JSON editing", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <form>
        <AcademicReportCardPolicyEditor name="reportConfiguration" />
      </form>,
    );

    expect(screen.getByLabelText("Class teacher comment")).toBeChecked();
    expect(screen.getByLabelText("Principal comment")).toBeChecked();
    expect(screen.getByLabelText("Class Teacher")).toBeChecked();
    expect(screen.getByLabelText("Principal")).toBeChecked();

    await user.type(
      screen.getByPlaceholderText("Add another signature, e.g. Dean of Academics"),
      "Dean of Academics",
    );
    await user.click(screen.getByRole("button", { name: "Add signature" }));

    const configuration = structuredValue(container, "reportConfiguration") as Record<string, unknown>;
    expect(configuration).toMatchObject({
      class_teacher_comment: true,
      principal_comment: true,
    });
    expect(configuration.signature_lines).toEqual(["Class Teacher", "Principal", "Dean of Academics"]);
  });
});
