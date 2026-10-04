import { formatMinorKes, toMinorUnits, formatActivityDate } from "@/lib/billing/billing-utils";

test("money input retains cents without floating point rounding or exponent coercion", () => {
  expect(toMinorUnits("1,234.56")).toBe("123456");
  expect(toMinorUnits("90071992547409.93")).toBe("9007199254740993");
  for (const value of ["1.999", "1e4", "0", "-1", "1,2", "Infinity", "", "92233720368547758.08"]) {
    expect(toMinorUnits(value)).toBeNull();
  }
});
test("large balances and credit cents display exactly", () => {
  expect(formatMinorKes("9007199254740993")).toBe("KES 90,071,992,547,409.93");
  expect(formatMinorKes("-5")).toBe("KES -0.05");
  expect(formatMinorKes("12500")).toBe("KES 125");
  expect(formatMinorKes("invalid")).toBe("Amount unavailable");
});
test("activity uses the school date at Nairobi midnight", () => {
  expect(formatActivityDate("2026-10-03T21:00:00.000Z")).toContain("04");
});
