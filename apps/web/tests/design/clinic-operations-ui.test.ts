import { readFileSync } from "node:fs";
import { join } from "node:path";

test("clinic operations UI exposes finance-safe medicine analytics", () => {
  const source = readFileSync(join(process.cwd(), "src/components/school/school-pages.tsx"), "utf8");

  expect(source).toContain("medicine_consumption_cost_minor");
  expect(source).toContain("wastage_due_to_expiry_minor");
  expect(source).toContain("emergency_supply_ready_rate");
  expect(source).toContain("most_used_medicine");
  expect(source).toContain("Clinic costs");
  expect(source).toContain("Expiry wastage");
  expect(source).toContain("Most used medicine");
  expect(source).not.toContain("confidential_notes");
  expect(source).not.toContain("supplier_invoice_reference");
});
