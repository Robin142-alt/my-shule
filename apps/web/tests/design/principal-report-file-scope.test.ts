import { savedReportUrl } from "@/lib/report-cards/saved-report-file";

test("Principal files bind the server proxy to the verified school for previews and downloads", () => {
  for (const preview of [true, false]) {
    const url = new URL(
      savedReportUrl("report/one", preview, {
        module: "exams",
        tenantId: "school-a",
      }),
      "https://example.test",
    );
    expect(url.searchParams.get("tenantSlug")).toBe("school-a");
    expect(url.searchParams.get("preview")).toBe(preview ? "true" : null);
    expect(url.pathname).toContain("report%2Fone");
  }
  expect(() =>
    savedReportUrl("id", true, { module: "exams", tenantId: " " }),
  ).toThrow("verified school");
});
