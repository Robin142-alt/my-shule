import { readFileSync } from "node:fs";
import { join } from "node:path";

const commandCenters = [
  "accountant-command-center.tsx",
  "boarding-master-command-center.tsx",
  "dean-academics-command-center.tsx",
  "deputy-principal-command-center.tsx",
  "discipline-master-command-center.tsx",
  "exams-manager-command-center.tsx",
  "grade-master-command-center.tsx",
  "hod-command-center.tsx",
  "guidance-counselling-command-center.tsx",
  "laboratory-technician-command-center.tsx",
  "registrar-command-center.tsx",
  "security-command-center.tsx",
  "storekeeper-command-center.tsx",
  "transport-manager-command-center.tsx",
];

describe("enterprise dashboard architecture", () => {
  it.each(commandCenters)("does not use hash anchor sidebar navigation in %s", (fileName) => {
    const source = readFileSync(
      join(process.cwd(), "src", "components", "school", fileName),
      "utf8",
    );

    expect(source).not.toMatch(/href:\s*["']#/);
    expect(source).not.toMatch(/href=\{?["']#/);
  });

  it.each(commandCenters)("does not redefine the platform widget state machine in %s", (fileName) => {
    const source = readFileSync(
      join(process.cwd(), "src", "components", "school", fileName),
      "utf8",
    );

    expect(source).not.toMatch(/type\s+WidgetState\s*=\s*["']ACTIVE["']\s*\|\s*["']EMPTY["']\s*\|\s*["']LOCKED["']/);
  });
});
