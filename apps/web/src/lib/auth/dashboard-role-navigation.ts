/** Start a new document so no router, permission or workspace cache survives a role change. */
export function replaceDashboardDocument(path: string) {
  window.location.replace(path);
}
