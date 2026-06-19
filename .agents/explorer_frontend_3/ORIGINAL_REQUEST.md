## 2026-06-18T08:34:04Z

Objective: Programmatically extract all expected backend API endpoints from the React frontend codebase.
Steps:
1. Search within `C:\Users\user\Desktop\PROJECTS\Shule hub\apps\web\src\components` (and other subfolders of `apps/web/src` if relevant) for query hooks (`useSchoolQuery`, `useQuery`), `fetch` hooks, `axios` calls, or HTTP clients.
2. Write a Node.js script or Python script to perform static analysis, regex scanning, or parsing of these React files to extract all referenced API routes.
3. List the endpoints, HTTP methods, parameters, and the exact files/line numbers where they are used.
4. Output your findings into `C:\Users\user\Desktop\PROJECTS\Shule hub\.agents\explorer_frontend_3\analysis.md`.
5. Run the script and write the results. Make sure not to make assumptions. Ensure the output is objective and verified by running the script.
6. When done, write `handoff.md` and send a message back.
