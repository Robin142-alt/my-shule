# Original User Request

## Follow-up — 2026-06-20T13:05:59Z

Upgrade the exams and analytics module in the MyShule platform to match and exceed the capabilities of Zeraki Analytics. This includes a full-stack implementation with backend aggregation endpoints and rich frontend charts/dashboards. The agent team will decide the best features to add based on industry standards.

### Requirements

#### R1. Full-Stack Analytics Upgrade
Build backend aggregation endpoints to process exam data and a rich frontend dashboard using pre-built charting libraries to visualize the data.

#### R2. Feature Selection
The agent team should independently select and implement the highest-impact analytics features (e.g., term-over-term trends, grade distributions, subject performance) that will add the most value for teachers and administrators.

#### R3. Programmatic Verification
Write new programmatic tests to verify the accuracy of the backend aggregation logic.

### Acceptance Criteria

#### Analytics Implementation
- [ ] At least two new advanced analytical views (e.g., student progress trends, subject comparisons) are implemented and visible on the frontend dashboard.
- [ ] The frontend views correctly consume data from the new backend aggregation endpoints.

#### Testing and Verification
- [ ] New automated programmatic tests are written for the backend aggregations.
- [ ] The programmatic tests pass successfully without errors.

## Follow-up — 2026-06-20T13:50:19Z

You are the Project Orchestrator (Successor). Resume the exams and analytics module upgrade project in the workspace 'c:\Users\user\Desktop\PROJECTS\Shule hub'.
Your working directory is '.agents/orchestrator_exams_analytics/'. Read the existing BRIEFING.md, plan.md, progress.md, and SCOPE.md in that directory.
Verify the backend worker's handoff.md in '.agents/worker_exams_analytics/' (which completed Milestone 2 backend endpoints).
Proceed to Milestone 3 (Implement Frontend Dashboard), spawn the next worker to build the frontend, and run verification.
