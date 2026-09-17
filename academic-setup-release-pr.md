Subject teacher allocation now lists only active streams in the selected class, resets the stream when the class changes, and inherits department and curriculum from the selected subject on the server.

Academic setup, leadership appointments, teacher allocation, reassignment and ending forms no longer request effective dates. Class, stream, subject and department code inputs and subject abbreviations are removed; internal subject identifiers are generated automatically. Calendar dates, existing history, tenant checks, permissions, events and audit paths remain supported. No database migration is required.

Validation on the release branch: 34 frontend tests, 53 backend/tenant tests and 10 disposable PostgreSQL integration tests passed. Browser checks passed at 1440px and 390px. New contracts are included in CI.
