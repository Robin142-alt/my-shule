import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CohortPromotionDialog } from "@/components/modules/admissions/cohort-promotion-dialog";
import { commitPromotion, fetchPromotionOptions, previewPromotion, type PromotionOptions } from "@/lib/modules/admissions-promotions";

jest.mock("@/lib/modules/admissions-promotions", () => ({ fetchPromotionOptions: jest.fn(), previewPromotion: jest.fn(), commitPromotion: jest.fn() }));

const options: PromotionOptions = {
  placements: [6, 7, 8].map((grade) => ({ id: `placement-${grade}`, version: grade, cohort_id: `cohort-${grade}`, cohort_name: `Intake ${grade}`, class_section_id: `old-${grade}`, class_section_name: `Grade ${grade}`, stream_id: `blue-${grade}`, stream_name: "Blue", student_count: 2, students: [{ id: `learner-${grade}`, name: `Learner ${grade}` }, { id: `other-${grade}`, name: `Other ${grade}` }] })),
  years: [{ id: "2026", name: "2026" }, { id: "2027", name: "2027" }],
  classes: [7, 8, 9].map((grade) => ({ id: `new-${grade}`, name: `Grade ${grade}`, academic_year_id: "2027" })),
  streams: [7, 8, 9].map((grade) => ({ id: `east-${grade}`, name: "East", class_section_id: `new-${grade}` })),
};

async function mapDestination(user: ReturnType<typeof userEvent.setup>, position: number, grade: number) {
  await user.selectOptions(screen.getByRole("combobox", { name: `Destination academic year ${position}` }), "2027");
  await user.selectOptions(screen.getByRole("combobox", { name: `Destination class ${position}` }), `new-${grade}`);
  await user.selectOptions(screen.getByRole("combobox", { name: `Destination stream ${position}` }), `east-${grade}`);
}

describe("cohort promotion mapping", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetchPromotionOptions as jest.Mock).mockResolvedValue(options);
    (previewPromotion as jest.Mock).mockImplementation(async (command) => ({ can_commit: true, blockers: [], warnings: [], mappings: command.mappings.map((item: { source_placement_id: string }) => ({ source_placement_id: item.source_placement_id, student_count: 2, subject_count: 3, teacher_count: 3 })) }));
    (commitPromotion as jest.Mock).mockResolvedValue({ request_id: "saved", promoted_students: 6, moved_cohorts: 3, results: [] });
    Object.defineProperty(global.crypto, "randomUUID", { configurable: true, value: jest.fn(() => "request-123") });
  });

  it("reviews and commits several grades together using actual renamed destination stream IDs", async () => {
    const user = userEvent.setup();
    const onPromoted = jest.fn();
    render(<CohortPromotionDialog onClose={jest.fn()} onPromoted={onPromoted} />);
    await screen.findByRole("combobox", { name: "Source cohort 1" });
    for (let index = 0; index < 3; index++) {
      if (index) await user.click(screen.getByRole("button", { name: "Add cohort mapping" }));
      await user.selectOptions(screen.getByRole("combobox", { name: `Source cohort ${index + 1}` }), `placement-${index + 6}`);
      await mapDestination(user, index + 1, index + 7);
    }
    await user.type(screen.getByRole("textbox", { name: "Promotion reason" }), "Annual progression");
    await user.click(screen.getByRole("button", { name: "Review promotion" }));
    const confirm = await screen.findByRole("button", { name: "Confirm promotion" });
    expect(previewPromotion).toHaveBeenCalledWith({ request_id: "request-123", reason: "Annual progression", mappings: [6, 7, 8].map((grade) => ({ source_placement_id: `placement-${grade}`, expected_version: grade, target_class_section_id: `new-${grade + 1}`, target_stream_id: `east-${grade + 1}` })) });
    expect(screen.getAllByText(/2 learners, 3 subjects, 3 teacher assignments/)).toHaveLength(3);
    await user.click(confirm);
    await waitFor(() => expect(onPromoted).toHaveBeenCalled());
    expect(commitPromotion).toHaveBeenCalledWith(jest.mocked(previewPromotion).mock.calls[0][0]);
    expect(screen.getByText(/6 learners promoted across 3 cohorts/)).toBeInTheDocument();
  });

  it("retains the same request for a failed commit retry and limits a single learner move", async () => {
    const user = userEvent.setup();
    (commitPromotion as jest.Mock).mockRejectedValueOnce(new Error("Connection interrupted. Retry safely."));
    render(<CohortPromotionDialog studentId="learner-6" onClose={jest.fn()} onPromoted={jest.fn()} />);
    expect(await screen.findByRole("combobox", { name: "Source cohort 1" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Add cohort mapping" })).not.toBeInTheDocument();
    await mapDestination(user, 1, 7);
    await user.type(screen.getByRole("textbox", { name: "Promotion reason" }), "Approved progression");
    await user.click(screen.getByRole("button", { name: "Review promotion" }));
    await user.click(await screen.findByRole("button", { name: "Confirm promotion" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Connection interrupted");
    await user.click(screen.getByRole("button", { name: "Confirm promotion" }));
    await waitFor(() => expect(commitPromotion).toHaveBeenCalledTimes(2));
    const [first, second] = jest.mocked(commitPromotion).mock.calls;
    expect(first[0]).toEqual(second[0]);
    expect(first[0].mappings[0].student_ids).toEqual(["learner-6"]);
  });

  it("blocks confirmation for an occupied destination and preserves mappings for correction", async () => {
    const user = userEvent.setup();
    (previewPromotion as jest.Mock).mockResolvedValue({ can_commit: false, mappings: [], warnings: [], blockers: ["The destination contains a different cohort that is not included in this promotion."] });
    render(<CohortPromotionDialog onClose={jest.fn()} onPromoted={jest.fn()} />);
    await user.selectOptions(await screen.findByRole("combobox", { name: "Source cohort 1" }), "placement-6");
    await mapDestination(user, 1, 7);
    await user.type(screen.getByRole("textbox", { name: "Promotion reason" }), "Annual progression");
    await user.click(screen.getByRole("button", { name: "Review promotion" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("different cohort");
    expect(screen.getByRole("button", { name: "Confirm promotion" })).toBeDisabled();
    expect(commitPromotion).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Edit mappings" }));
    expect(screen.getByRole("combobox", { name: "Destination stream 1" })).toHaveValue("east-7");
  });

  it("resets dependent class and stream selections when the destination year changes", async () => {
    const user = userEvent.setup();
    render(<CohortPromotionDialog onClose={jest.fn()} onPromoted={jest.fn()} />);
    await user.selectOptions(await screen.findByRole("combobox", { name: "Source cohort 1" }), "placement-6");
    await mapDestination(user, 1, 7);
    await user.selectOptions(screen.getByRole("combobox", { name: "Destination academic year 1" }), "2026");
    expect(screen.getByRole("combobox", { name: "Destination class 1" })).toHaveValue("");
    expect(screen.getByRole("combobox", { name: "Destination stream 1" })).toHaveValue("");
    expect(within(screen.getByRole("combobox", { name: "Destination class 1" })).queryByRole("option", { name: "Grade 7" })).not.toBeInTheDocument();
  });
});
