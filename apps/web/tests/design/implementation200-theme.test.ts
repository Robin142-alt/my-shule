import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Implementation 400 enterprise SaaS theme", () => {
  const globalsCss = readFileSync(join(process.cwd(), "src", "app", "globals.css"), "utf8");
  const tailwindConfig = readFileSync(join(process.cwd(), "tailwind.config.ts"), "utf8");
  const tokensTs = readFileSync(join(process.cwd(), "src", "lib", "design-system", "tokens.ts"), "utf8");

  it("uses the My Shule Implementation 400 enterprise palette", () => {
    expect(globalsCss).toContain("--navy: #071D49;");
    expect(globalsCss).toContain("--orange: #FF7A1A;");
    expect(globalsCss).toContain("--lightgray: #F3F4F6;");
    expect(globalsCss).toContain("--darkblue: #0F2345;");
    expect(globalsCss).toContain("--white: #FFFFFF;");
    expect(globalsCss).toContain("--surface: #FFFFFF;");
    expect(globalsCss).toContain("--sidebar: #071D49;");
  });

  it("keeps orange as an accent while using light workspace surfaces", () => {
    expect(globalsCss).toContain("--background: #F3F4F6;");
    expect(globalsCss).toContain("--accent: #FF7A1A;");
    expect(globalsCss).toContain(".ui-button-primary");
    expect(globalsCss).toContain(".enterprise-sidebar");
    expect(globalsCss).toContain(".enterprise-analytics-panel");
    expect(globalsCss).not.toContain("--accent: #059669;");
  });

  it("exports Tailwind and TypeScript design tokens for reuse", () => {
    expect(tailwindConfig).toContain('navy: "#071D49"');
    expect(tailwindConfig).toContain('orange: "#FF7A1A"');
    expect(tailwindConfig).toContain('lightgray: "#F3F4F6"');
    expect(tailwindConfig).toContain('darkblue: "#0F2345"');
    expect(tokensTs).toContain("implementation400BrandTokens");
    expect(tokensTs).toContain('"kpi-highlights"');
  });
});
