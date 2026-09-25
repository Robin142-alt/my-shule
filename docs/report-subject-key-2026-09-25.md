# Complete subject performance keys

The report chart previously selected only four subjects. Its SVG key also extended to the edge of a fixed-height viewport, clipping the final row. The React preview, HTML report and PDF now include every recorded subject series or every scored current subject when history is unavailable.

React and HTML keys are wrapping lists below the plot, with full subject names. PDF key rows are measured to reserve space for wrapped labels; the analytics panel grows with the key. All formats use the same expanded colour palette, and each key marker matches its plotted series. The React history chart now groups by subject ID, as the backend renderers already did, and its single-period fallback point aligns with its period label.

This is a rendering-only change using the existing school-scoped report snapshot. No marks, source revisions, permissions, signatures, events or approval statuses change. PDF renderer version 6 refreshes cached output; source-current version 4 and 5 snapshots remain valid for review and release. Changed source data and incompatible older versions still require regeneration.

Regression coverage includes 12 subjects with and without history, zero marks, missing results, long names, marker/series colour agreement, full key membership, PDF key bounds and one-page A4 output. Existing report freshness, export, scope and signature checks were run alongside these tests. A synthetic 12-subject PDF was rendered and visually inspected. The frontend reference-layout suite is now included in CI's report-card gate.
