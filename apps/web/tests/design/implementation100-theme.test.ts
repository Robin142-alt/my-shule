import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Implementation 100 theme tokens", () => {
  const globalsCss = readFileSync(join(process.cwd(), "src", "app", "globals.css"), "utf8");

  it("uses the required navy, orange, off-white, and dark text blue palette", () => {
    expect(globalsCss).toContain("--background: #f3f4f6;");
    expect(globalsCss).toContain("--foreground: #0f2345;");
    expect(globalsCss).toContain("--primary: #071d49;");
    expect(globalsCss).toContain("--primary-hover: #0b234f;");
    expect(globalsCss).toContain("--accent: #ff7a1a;");
    expect(globalsCss).toContain("--accent-hover: #e8660d;");
  });

  it("does not keep emerald as the global accent color", () => {
    expect(globalsCss).not.toContain("--accent: #059669;");
    expect(globalsCss).not.toContain("--accent-soft: #d1fae5;");
  });

  it("maps primary tokens into Tailwind theme variables", () => {
    expect(globalsCss).toContain("--color-primary: var(--primary);");
    expect(globalsCss).toContain("--color-primary-hover: var(--primary-hover);");
    expect(globalsCss).toContain("--color-primary-soft: var(--primary-soft);");
  });
});
