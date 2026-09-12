import { fireEvent, render, screen } from "@testing-library/react";
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

const expectedSecondaryBands = [
  ["A", 80, 100, 12, "Very Good"],
  ["A-", 75, 79, 11, "Very Good"],
  ["B+", 70, 74, 10, "Good"],
  ["B", 65, 69, 9, "Good"],
  ["B-", 60, 64, 8, "Good"],
  ["C+", 55, 59, 7, "Average"],
  ["C", 45, 54, 6, "Average"],
  ["C-", 40, 44, 5, "Average"],
  ["D+", 35, 39, 4, "Average"],
  ["D", 30, 34, 3, "Weak"],
  ["D-", 25, 29, 2, "Weak"],
  ["E", 0, 24, 1, "Poor"],
];

const expectedCbcBands = [
  ["EE1", 90, 100, 8, "Exceeding Expectation"],
  ["EE2", 75, 89, 7, "Exceeding Expectation"],
  ["ME1", 58, 74, 6, "Meeting Expectation"],
  ["ME2", 41, 57, 5, "Meeting Expectation"],
  ["AE1", 31, 40, 4, "Approaching Expectation"],
  ["AE2", 21, 30, 3, "Approaching Expectation"],
  ["BE1", 11, 20, 2, "Below Expectation"],
  ["BE2", 0, 10, 1, "Below Expectation"],
];

function bandTable(container: HTMLElement) {
  return (structuredValue(container, "rules") as Array<Record<string, unknown>>)
    .map(({ label, min, max, points, remark }) => [label, min, max, points, remark]);
}

describe("academic policy builders", () => {
  it("binds grading to one curriculum checkbox and supports a named custom scale", async () => {
    const user = userEvent.setup();
    const { container } = render(<form><AcademicGradeBandsEditor name="rules" curriculumName="curriculum_model" /></form>);
    const selected = () => (container.querySelector('input[name="curriculum_model"]') as HTMLInputElement).value;
    expect(selected()).toBe("8-4-4");
    await user.click(screen.getByRole("checkbox", { name: "CBC", exact: true }));
    expect(selected()).toBe("CBC");
    expect(screen.getByRole("checkbox", { name: "8-4-4", exact: true })).not.toBeChecked();
    expect(bandTable(container)).toEqual(expectedCbcBands);
    await user.click(screen.getByRole("checkbox", { name: "Configure another system" }));
    fireEvent.change(screen.getByLabelText("Curriculum name"), { target: { value: "Cambridge" } });
    fireEvent.change(screen.getByLabelText("Grade label"), { target: { value: "Pass" } });
    expect(selected()).toBe("Cambridge");
    expect(validateAcademicGradeBands(structuredValue(container, "rules"))).toBeNull();
    expect(screen.queryByRole("button", { name: "CBC", exact: true })).not.toBeInTheDocument();
  });

  it("builds complete grading bands from school-friendly presets", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <form>
        <AcademicGradeBandsEditor name="rules" />
      </form>,
    );

    expect(bandTable(container)).toEqual(expectedSecondaryBands);
    expect(validateAcademicGradeBands(structuredValue(container, "rules"))).toBeNull();
    expect(screen.queryByRole("button", { name: /starter/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "CBC", exact: true }));
    expect(bandTable(container)).toEqual(expectedCbcBands);
    expect(validateAcademicGradeBands(structuredValue(container, "rules"))).toBeNull();
    expect(screen.getByText("8 grade bands cover every mark from 0 to 100.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "8-4-4", exact: true }));
    expect(bandTable(container)).toEqual(expectedSecondaryBands);
    expect(screen.getByText("12 grade bands cover every mark from 0 to 100.")).toBeInTheDocument();
  });

  it("keeps every CBC field editable, supports adding and removing rows, and reloads clean defaults", async () => {
    const user = userEvent.setup();
    const { container } = render(<AcademicGradeBandsEditor name="rules" initialPreset="cbc" />);
    expect(bandTable(container)).toEqual(expectedCbcBands);

    fireEvent.change(screen.getAllByLabelText("Grade label")[0], { target: { value: "EE1 revised" } });
    fireEvent.change(screen.getAllByLabelText("Minimum mark")[0], { target: { value: "91" } });
    fireEvent.change(screen.getAllByLabelText("Maximum mark")[1], { target: { value: "90" } });
    fireEvent.change(screen.getAllByLabelText("Points")[0], { target: { value: "9" } });
    fireEvent.change(screen.getAllByLabelText("Report remark")[0], { target: { value: "Outstanding" } });
    await user.click(screen.getAllByLabelText("Pass")[0]);

    expect((structuredValue(container, "rules") as unknown[])[0]).toEqual({
      label: "EE1 revised", min: 91, max: 100, points: 9, remark: "Outstanding", is_pass: false,
    });
    expect(validateAcademicGradeBands(structuredValue(container, "rules"))).toBeNull();

    await user.click(screen.getByRole("button", { name: "Add grade band" }));
    expect(structuredValue(container, "rules")).toHaveLength(9);
    await user.click(screen.getByRole("button", { name: "Remove grade band 9" }));
    expect(structuredValue(container, "rules")).toHaveLength(8);
    await user.click(screen.getByRole("button", { name: "Remove EE1 revised" }));
    expect(validateAcademicGradeBands(structuredValue(container, "rules"))).toContain("cover every mark");

    await user.click(screen.getByRole("button", { name: "CBC", exact: true }));
    expect(bandTable(container)).toEqual(expectedCbcBands);
    expect(screen.getAllByLabelText("Pass")[0]).toBeChecked();
  });

  it("preserves saved custom rules and their extra fields when opening or resetting the editor", async () => {
    const user = userEvent.setup();
    const savedRules = [
      { label: "School distinction", min: 60, max: 100, points: 5, remark: "Well done", is_pass: true, competency: "mastered" },
      { label: "Support", min: 0, max: 59, points: 1, remark: "Keep practising", is_pass: false },
    ];
    const { container } = render(
      <form>
        <AcademicGradeBandsEditor name="rules" defaultValue={savedRules} initialPreset="blank" theme="light" />
        <button type="reset">Reset</button>
      </form>,
    );
    expect(structuredValue(container, "rules")).toEqual(savedRules);
    fireEvent.change(screen.getAllByLabelText("Points")[0], { target: { value: "6" } });
    expect((structuredValue(container, "rules") as unknown[])[0]).toEqual({ ...savedRules[0], points: 6 });
    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect(structuredValue(container, "rules")).toEqual(savedRules);
    expect(savedRules[0].points).toBe(5);
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

  it("preserves edited bands when binding a saved policy and when clicking its selected curriculum", () => {
    const savedRules = [{ label: "School grade", min: 0, max: 100, points: 5, remark: "Custom remark", is_pass: true }];
    const { container } = render(<form><AcademicGradeBandsEditor name="rules" curriculumName="curriculum_model" defaultValue={savedRules} /></form>);
    fireEvent.click(screen.getByRole("checkbox", { name: "CBC", exact: true }));
    expect(structuredValue(container, "rules")).toEqual(savedRules);
    fireEvent.change(screen.getByLabelText("Points"), { target: { value: "6" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "CBC", exact: true }));
    expect(structuredValue(container, "rules")).toEqual([{ ...savedRules[0], points: 6 }]);
    expect(container.querySelector<HTMLInputElement>('input[name="curriculum_model"]')?.value).toBe("CBC");
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
