import { readSecretaryTableCell } from "@/components/school/secretary-command-center-full";

describe("Secretary table contract", () => {
  it("shows real zero and boolean values instead of fabricated placeholder content", () => {
    expect(readSecretaryTableCell({ duration: 0, action_required: false }, "Duration")).toBe("0");
    expect(readSecretaryTableCell({ duration: 0, action_required: false }, "Action Required")).toBe("No");
  });

  it("resolves canonical aliases and nested workflow payload fields", () => {
    expect(readSecretaryTableCell({ request_no: "REQ-104" }, "Request No.")).toBe("REQ-104");
    expect(readSecretaryTableCell({ payload: { recipient: "John Kamau" } }, "Recipient/Sender")).toBe("John Kamau");
    expect(readSecretaryTableCell({ caller_name: "Rose Akinyi" }, "Caller/Recipient")).toBe("Rose Akinyi");
  });

  it("uses a truthful missing-value marker rather than invented column data", () => {
    expect(readSecretaryTableCell({}, "Parent Name")).toBe("—");
  });
});
