# Implementation 20 Certification

Generated at: 2026-07-16T23:35:10.117Z

Status: pass

| Evidence ID | Area | Status | Checks |
| --- | --- | --- | --- |
| IMPLEMENTATION20-001-module-allocation | Superadmin module allocation and runtime enforcement | pass | pass: Global module registry includes requested module stack; pass: School module access schema is tenant scoped with RLS; pass: Runtime guard blocks disabled modules gracefully; pass: Module removal is represented as soft disable; pass: Superadmin UI exposes module allocation editing; pass: Library is registered as an allocatable tenant module |
| IMPLEMENTATION20-002-academic-structure | Flexible academic structure and class assignment | pass | pass: Academic levels, class streams, and assignments are in schema; pass: CBE, CBC, 8-4-4, International, and custom systems are supported; pass: Class structure API exists; pass: Student assignment service enforces structured class linkage |
| IMPLEMENTATION20-003-laboratories | Laboratory operations, safety, and traceability | pass | pass: Lab schema includes departments, labs, sessions, attendance, equipment, chemicals, usage, and disposal; pass: Expired and quarantined chemicals are blocked from use; pass: Mandatory lab completion auto-records missing attendance and emits effects; pass: Mandatory lab absences feed discipline and academic reporting sources; pass: Lab maintenance jobs cover chemical expiry, equipment reconciliation, and mandatory attendance discipline checks; pass: Web app proxies live lab operations to the API; pass: Lab dashboard exposes attendance, equipment, and chemical flows |
| IMPLEMENTATION20-004-leadership-biometric | Leadership command centers and biometric teacher attendance | pass | pass: Leadership schema includes incidents, announcements, minutes, and duty rosters; pass: Principal, deputy, and secretary dashboards are exposed; pass: Biometric schema includes devices, identities, events, logs, and rules; pass: Biometric sync handles offline events and deduplicates event hashes; pass: Biometric attendance processor applies daily absence and half-day rules; pass: Biometric API exposes live feed and monthly reports; pass: Manual teacher attendance override requires an audit reason; pass: Web app proxies leadership command-center requests to the API; pass: Web app proxies teacher biometric attendance requests to the API; pass: School UI includes leadership and teacher attendance dashboards |
| IMPLEMENTATION20-005-frontend-route-guards | Frontend module-aware navigation and disabled states | pass | pass: Frontend maps school sections to backend module codes; pass: School workspace filters navigation using enabled modules; pass: Standalone library workspace verifies the tenant library module before rendering; pass: Library sync API refuses circulation when the tenant lacks the library module; pass: Web app proxies academic structure requests to the API; pass: Web app proxies reports requests to the API; pass: Web app proxies staff requests to the HR API; pass: Web app proxies timetable requests to the API; pass: Production readiness keeps new module-controlled surfaces active; pass: Legacy generic attendance remains retired |

## Notes

- This certification checks source-level release evidence for module allocation, academics, labs, leadership, biometric attendance, and frontend route guards.
- Disabled modules are visibility-controlled only; module data remains preserved for later reactivation.

