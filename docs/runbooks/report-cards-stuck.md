# Report Cards Stuck

Use this when report-card generation or publishing stalls near end-term release.

1. Check report-card generation queue lag, failed jobs, and batch progress in `observability/dashboard`.
2. Confirm mark sheets are locked and corrections requiring dual approval are resolved.
3. Inspect `report_card_generation_batches` and `report_card_artifacts` for failed or partial artifacts.
4. Re-run generation for the affected class/series only; do not overwrite published report-card snapshots.
5. Verify parent download links remain guardian-scoped and withdrawn cards are inaccessible.
6. Notify the school principal with affected class, learner count, retry status, and expected publish window.
