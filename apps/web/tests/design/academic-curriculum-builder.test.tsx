import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  AcademicCurriculumConfigurationEditor,
  validateAcademicCurriculumConfiguration,
} from "@/components/school/academic-curriculum-builder";

function structuredValue(container: HTMLElement, name: string) {
  const input = container.querySelector<HTMLInputElement>(`input[type="hidden"][name="${name}"]`);
  if (!input) throw new Error(`Missing structured field ${name}`);
  return JSON.parse(input.value) as Record<string, unknown>;
}

function hiddenValue(container: HTMLElement, name: string) {
  const input = container.querySelector<HTMLInputElement>(`input[type="hidden"][name="${name}"]`);
  if (!input) throw new Error(`Missing hidden field ${name}`);
  return input.value;
}

describe("academic curriculum configuration builder", () => {
  it("turns the CBC starter into structured school data without JSON editing", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <form>
        <AcademicCurriculumConfigurationEditor configurationName="configuration" />
      </form>,
    );

    await user.selectOptions(screen.getByLabelText("Curriculum model"), "CBC");

    expect(hiddenValue(container, "curriculum_model")).toBe("CBC");
    const configuration = structuredValue(container, "configuration");
    expect(configuration.levels).toEqual(["Pre-primary", "Primary", "Junior School", "Senior School"]);
    expect(configuration.pathways).toEqual(["STEM", "Social Sciences", "Arts and Sports Science"]);
    expect(configuration).toMatchObject({
      assessment_mode: "competency",
      promotion_rules: {
        decision_mode: "teacher_review",
        minimum_attendance: 75,
      },
    });
    expect(validateAcademicCurriculumConfiguration("CBC", configuration)).toBeNull();
    expect(screen.getByText(/CBC structure is ready with 7 configured options/)).toBeInTheDocument();
  });

  it("lets school staff add and remove choices using labels and suggestions", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <form>
        <AcademicCurriculumConfigurationEditor
          configurationName="configuration"
          defaultModel="Custom"
          defaultConfiguration={{
            levels: ["Primary"],
            pathways: [],
            tracks: [],
            frameworks: [],
          }}
        />
      </form>,
    );

    await user.click(screen.getByRole("button", { name: "Remove Primary" }));
    await user.type(screen.getByLabelText("Add custom school levels and stages"), "Middle School");
    await user.click(screen.getAllByRole("button", { name: "Add" })[0]);

    const configuration = structuredValue(container, "configuration");
    expect(configuration.levels).toEqual(["Middle School"]);
    expect(validateAcademicCurriculumConfiguration("Custom", configuration)).toBeNull();
  });

  it("preserves unknown legacy configuration keys when a saved record is managed", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <form>
        <AcademicCurriculumConfigurationEditor
          configurationName="configuration"
          defaultModel="International"
          defaultConfiguration={{
            levels: [{ name: "Upper Secondary", code: "US" }],
            pathways: [],
            tracks: [],
            frameworks: ["Cambridge"],
            assessment_mode: "mixed",
            promotion_rules: {
              decision_mode: "principal_approval",
              minimum_attendance: 80,
              moderation_required: true,
            },
            legacy_mapping: { source: "import" },
          }}
        />
      </form>,
    );

    await user.click(screen.getByLabelText("Require core-subject pass"));
    const configuration = structuredValue(container, "configuration");
    expect(configuration.levels).toEqual([{ name: "Upper Secondary", code: "US" }]);
    expect(configuration.legacy_mapping).toEqual({ source: "import" });
    expect(configuration.promotion_rules).toMatchObject({
      decision_mode: "principal_approval",
      minimum_attendance: 80,
      moderation_required: true,
      require_core_subject_pass: true,
    });
  });

  it("validates empty structures and invalid promotion thresholds", () => {
    expect(validateAcademicCurriculumConfiguration("", {})).toBe(
      "Choose the curriculum model used by this school.",
    );
    expect(validateAcademicCurriculumConfiguration("Custom", {
      levels: [],
      pathways: [],
      tracks: [],
      frameworks: [],
      assessment_mode: "mixed",
      promotion_rules: {},
    })).toContain("Add at least one");
    expect(validateAcademicCurriculumConfiguration("CBC", {
      levels: ["Primary"],
      pathways: [],
      tracks: [],
      frameworks: [],
      assessment_mode: "competency",
      promotion_rules: { minimum_attendance: 120 },
    })).toContain("between 0 and 100");
  });
});
