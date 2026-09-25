# Report-card signature presentation and upload requirements

Report previews, HTML print views and generated PDFs now display the signature image and role label without the signer's account display name. The signature area is larger, and PDF comments reserve space above it.

Both principal and class-teacher uploads open the same preparation dialog. It explains the requirements, validates the selected image and previews it at the report's display size before saving. Invalid selections remain visible with a useful error; failed uploads can be retried. The existing authenticated, school-scoped upload services, file storage, events, audit records and query refreshes remain in use.

Enforced in both browser and API: PNG/JPEG, non-empty and no larger than 2 MB, 300–1600 pixels wide, 80–600 pixels high, and a width-to-height ratio from 2 to 6. The API decodes the actual image before storing it. Recommended preparation: 600 × 200 pixels, tightly cropped with a small margin, dark ink on a plain white or transparent background, no ruled paper or shadows. Background cleanliness is guidance checked in the preview, not automatic image analysis.

Existing uploaded images are preserved. A portrait photograph should be replaced with a suitable crop by its owner, then affected reports regenerated through the normal review workflow. This change does not modify signatures or academic records in production.

Renderer version 5 changes presentation only. Version 4 snapshots remain eligible if their source revision, validity and approval state are current. PDF identities include version 5, forcing a fresh render on subsequent preparation/download without resetting approvals. Older incompatible versions and changed academic/signature inputs still fail freshness checks. The same compatibility rule applies in the service and scope eligibility SQL.

Verification:

- Backend TypeScript build and frontend TypeScript check passed.
- 200 targeted backend tests passed, including authorization, school isolation, signature upload/decode, transport, artifact design, freshness and export coverage.
- 23 disposable-PostgreSQL integration tests passed, including compatible legacy snapshots and rejection of stale sources.
- 19 frontend tests passed across upload validation/retry/cancel, signature presentation and principal school profile.
- Changed frontend files passed ESLint with three existing warnings in class-teacher settings.
- A synthetic report was rendered and visually inspected as a single-page PDF. The actual React components were inspected in the local browser; a 390-pixel mobile dialog rejected a portrait image and previewed a valid landscape image. No school data was used for visual QA.
