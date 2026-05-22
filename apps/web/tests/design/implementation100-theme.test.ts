import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Implementation 100/400 theme tokens", () => {
  const globalsCss = readFileSync(join(process.cwd(), "src", "app", "globals.css"), "utf8");

  it("uses the Implementation 400 enterprise school ERP palette", () => {
    expect(globalsCss).toContain("--navy: #071D49;");
    expect(globalsCss).toContain("--orange: #FF7A1A;");
    expect(globalsCss).toContain("--lightgray: #F3F4F6;");
    expect(globalsCss).toContain("--darkblue: #0F2345;");
    expect(globalsCss).toContain("--white: #FFFFFF;");
    expect(globalsCss).toContain("--background: #F3F4F6;");
    expect(globalsCss).toContain("--foreground: #0F2345;");
    expect(globalsCss).toContain("--primary: #071D49;");
    expect(globalsCss).toContain("--accent: #FF7A1A;");
  });

  it("does not keep emerald as the global accent color", () => {
    expect(globalsCss).not.toContain("--accent: #059669;");
    expect(globalsCss).not.toContain("--accent-soft: #d1fae5;");
  });

  it("maps primary tokens into Tailwind theme variables", () => {
    expect(globalsCss).toContain("--color-navy: var(--navy);");
    expect(globalsCss).toContain("--color-orange: var(--orange);");
    expect(globalsCss).toContain("--color-lightgray: var(--lightgray);");
    expect(globalsCss).toContain("--color-darkblue: var(--darkblue);");
    expect(globalsCss).toContain("--color-primary: var(--primary);");
    expect(globalsCss).toContain("--color-primary-hover: var(--primary-hover);");
    expect(globalsCss).toContain("--color-primary-soft: var(--primary-soft);");
  });
});
