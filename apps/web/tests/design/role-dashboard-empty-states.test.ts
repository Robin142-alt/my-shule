import fs from "node:fs";
import path from "node:path";

const dashboardRoots = [
  "src/components/school",
  "src/components/modules",
];

function readTsxFiles(root: string): Array<{ file: string; source: string }> {
  const absoluteRoot = path.join(process.cwd(), root);
  return fs.readdirSync(absoluteRoot, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(absoluteRoot, entry.name);
    if (entry.isDirectory()) {
      return readTsxFiles(path.join(root, entry.name));
    }
    if (!entry.isFile() || !entry.name.endsWith(".tsx")) {
      return [];
    }
    return [{ file: path.relative(process.cwd(), file), source: fs.readFileSync(file, "utf8") }];
  });
}

describe("role dashboard empty-state contract", () => {
  it("does not leave routed role workspaces with generic scaffold empty states", () => {
    const passiveEmptyStatePatterns = [
      /No records found\.?/,
      /Create the first entry to get started\./,
      /Coming soon/i,
      /Opening module/i,
      /not available yet/i,
    ];
    const offenders = dashboardRoots
      .flatMap(readTsxFiles)
      .flatMap(({ file, source }) =>
        passiveEmptyStatePatterns
          .filter((pattern) => pattern.test(source))
          .map((pattern) => `${file}: ${pattern.source}`),
      );

    expect(offenders).toEqual([]);
  });
});
