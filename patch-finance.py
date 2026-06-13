import sys

with open("c:/Users/user/Desktop/PROJECTS/Shule hub/apps/web/src/components/school/school-finance-page.tsx", "r") as f:
    content = f.read()

target = """export function SchoolFinancePage({
  role,
  tenantSlug,
  routeMode,
}: {
  role: SchoolExperienceRole;
  tenantSlug?: string | null;
  routeMode: SchoolRouteMode;
}) {"""

replacement = """export function SchoolFinancePage({
  role,
  tenantSlug,
  routeMode,
  activeSection,
}: {
  role: SchoolExperienceRole;
  tenantSlug?: string | null;
  routeMode: SchoolRouteMode;
  activeSection?: string;
}) {"""

new_content = content.replace(target, replacement)

with open("c:/Users/user/Desktop/PROJECTS/Shule hub/apps/web/src/components/school/school-finance-page.tsx", "w") as f:
    f.write(new_content)

print("Patch successful.")
