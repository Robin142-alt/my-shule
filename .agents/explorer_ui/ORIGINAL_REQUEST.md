## 2026-06-20T17:02:22Z

<USER_REQUEST>
Explore the MyShule codebase (frontend and backend) to audit UI Completeness and Workflows.
Refer to the MyShule AGENTS.md rules (especially Section 10: Frontend and Backend Wiring Rules, Section 11: Dashboard, Sidebar, and Workspace Rules, Section 12: Button and Action Rules, Section 13: Form and Import Rules, Section 21: Offline Sync Rules, Section 25: Frontend Rules).
Specifically:
1. Scan the Next.js React frontend (`apps/web/src`) for incomplete workflows, placeholders, "coming soon" items, mock elements, or dead buttons that do not connect to real backend handlers.
2. Verify the route prefix mismatch pattern between the frontend (e.g., `/admin-command/<role>/`) and NestJS controllers. Map out the broken prefixes.
3. Identify forms lacking client/server validation, double-submit protection, or loading states.
4. Verify offline-capable widgets (e.g. attendance, marks entry) for proper sync indicators.
5. Review reports and printing components to check if they have real preview/download actions or print fake documents.
6. Document your findings in a structured report (`ui_completeness_findings.md`) in your working directory `.agents/explorer_ui/`.
Include specific component names, file paths, line numbers, code snippets, and matching AGENTS.md rule references for each gap.
</USER_REQUEST>
