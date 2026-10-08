# Report-card signature preview

Missing Class Teacher and Principal signatures leave an empty signing space above the role's line and label. No upload instructions or placeholder text appear there on the report, in HTML print views, or in PDFs. Failed image loads retain a visible retry action on screen; loading and failure messages do not print.

The upload dialog and the on-screen report use `ReportSignature`. Its physical dimensions match the existing PDF `drawSignature` implementation and the HTML template: a 130-point-wide line, an image fitted proportionally into 130 by 32 points, centred horizontally and bottom-aligned, with a 4-point gap above the line. Changing these dimensions requires checking all three renderers. Screen zoom and printer scaling still apply to the whole document.

Both roles see their currently saved image when replacing a signature. Selecting a valid PNG/JPEG updates the preview before upload. The original image is preserved, including its background and margins. Saving uses the existing authenticated, school-scoped upload service, validation, audit, event and query-refresh paths. Replacing a saved signature requires regenerating existing report snapshots through the existing workflow.

The dialog is full-screen on phones with fixed, reachable save/cancel controls. Detailed image requirements are expandable. Invalid files cannot be saved, and a failed upload retains the selected image for retry.

This change does not alter PDF rendering, academic data, publication state, approval rules or report snapshot compatibility.

Verification covers frontend signature rendering and upload behaviour, backend signature ownership and tenant isolation, blank HTML/PDF signing areas, and the existing PDF layout. Browser checks use synthetic fixtures at 320, 768, 1024 and 1440 pixels and compare the preview bounds, image fit and alignment with the report.
