import { readFileSync } from "node:fs";
import { join } from "node:path";

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
const root = css.slice(css.indexOf(":root {"), css.indexOf("@theme inline"));
const colours = Object.fromEntries([...root.matchAll(/--([\w-]+):\s*(#[\da-f]{6});/gi)].map((match) => [match[1], match[2]]));

function luminance(hex: string) {
  const channels = hex.slice(1).match(/../g)!.map((channel) => {
    const value = parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(first: string, second: string) {
  const a = luminance(colours[first]);
  const b = luminance(colours[second]);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

describe("Shared colour accessibility", () => {
  it.each(["foreground", "muted", "muted-strong"])("keeps %s readable on workspace surfaces", (text) => {
    for (const surface of ["surface", "background", "primary-soft", "accent-soft", "success-soft", "warning-soft"]) {
      expect(contrast(text, surface)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(["success", "warning", "danger", "info", "accent"])("keeps %s readable on its badge and white surfaces", (tone) => {
    expect(contrast(tone, `${tone}-soft`)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(tone, "surface")).toBeGreaterThanOrEqual(4.5);
  });

  it.each(["primary", "primary-hover", "danger", "danger-hover", "accent", "accent-hover"])("keeps white button labels readable on %s", (fill) => {
    expect(contrast("white", fill)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps navigation labels and active accents readable", () => {
    for (const fill of ["sidebar", "sidebar-active", "primary-hover"]) {
      expect(contrast("sidebar-muted", fill)).toBeGreaterThanOrEqual(4.5);
      expect(contrast("inverse-accent", fill)).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast("focus", "surface")).toBeGreaterThanOrEqual(3);
    expect(contrast("border-control", "surface")).toBeGreaterThanOrEqual(3);
  });

  it("does not give workspaces a different semantic palette from their body portals", () => {
    for (const file of ["authenticated.css", "authenticated-premium.css", "authentication.css"]) {
      const source = readFileSync(join(process.cwd(), "src/app", file), "utf8");
      expect(source).not.toMatch(/--(?:primary|accent|foreground|success|danger|warning|info|muted|border|surface):/);
    }
  });
});
