import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SchoolPages } from "@/components/school/school-pages";

import { renderWithProviders } from "./test-utils";

function jsonResponse(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({ data, meta: {} }),
  } as Response);
}

describe("principal school profile", () => {
  it("opens a routed editable profile and persists tenant school details", async () => {
    const user = userEvent.setup();
    const originalFetch = global.fetch;
    const fetchMock = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/api/auth/csrf")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ token: "csrf-token" }),
        } as Response);
      }
      if (url.includes("/api/admin-command/principal/school-profile") && init?.method === "POST") {
        expect(JSON.parse(String(init.body))).toEqual(expect.objectContaining({
          schoolName: "Maranda High School",
          county: "Siaya",
          address: "P.O. Box 1, Bondo",
        }));
        return jsonResponse({ success: true, message: "School profile updated" });
      }
      if (url.includes("/api/admin-command/principal/school-profile")) {
        return jsonResponse({
          status: "setup_required",
          schoolName: "Maranda High",
          subdomain: "maranda-high",
          motto: "",
          county: "",
          subCounty: "",
          ward: "",
          address: "",
          website: "",
          registrationStatus: "active",
          curriculum: "",
          schoolType: "",
          logoUrl: null,
          contactInfo: { email: "", phone: "" },
        });
      }
      if (url.includes("/api/admin-command/principal/dashboard")) {
        return jsonResponse({ enabled_modules: ["academics"], alerts: [], notifications: [] });
      }
      return jsonResponse({});
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    try {
      renderWithProviders(
        <SchoolPages role="principal" section="school-profile" tenantSlug="maranda-high" userLabel="Principal Wanjiku" />,
      );

      const workspace = await screen.findByRole("region", { name: /Principal school profile workspace/i });
      expect(screen.getByRole("heading", { name: /^School Profile$/i })).toBeVisible();
      expect(await screen.findByRole("button", { name: /Upload logo/i })).toBeVisible();

      const name = await screen.findByLabelText(/School name/i);
      await user.clear(name);
      await user.type(name, "Maranda High School");
      await user.type(screen.getByLabelText(/^County$/i), "Siaya");
      const address = screen.getByLabelText(/Postal\/physical address/i);
      await user.type(address, "P.O. Box 1, Bondo");
      const saveButton = screen.getByRole("button", { name: /Save school profile/i });
      const form = saveButton.closest("form");
      expect(name).toHaveValue("Maranda High School");
      expect(address).toHaveValue("P.O. Box 1, Bondo");
      expect(saveButton).toBeEnabled();
      expect(form?.checkValidity()).toBe(true);
      fireEvent.submit(form!);

      await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin-command/principal/school-profile",
        expect.objectContaining({ method: "POST" }),
      ));
      expect(await screen.findByRole("status")).toHaveTextContent(/School profile saved/i);
      expect(workspace).toBeVisible();
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("links the school setup checklist to the real profile workspace", async () => {
    const source = await import("node:fs/promises").then((fs) => fs.readFile(
      "src/components/school/principal-command-center.tsx",
      "utf8",
    ));

    expect(source).toContain('actionLabel: "Open School Profile"');
    expect(source).toContain('target: "school-profile"');
    expect(source).toContain('<PrincipalSchoolProfileWorkspace />');
  });
});
