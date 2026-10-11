/** The persistent school layout selects the new role from the URL/session.
 * Call only after the server confirms the role and outgoing caches are cleared. */
export function replaceDashboardDocument(path: string) {
  window.history.replaceState(null, "", path);
}
