# Backup Restore Evidence

Generated evidence is expected from the `Production Operability` workflow.

Required proof:

- Encrypted database backup verification for schema and tenant data.
- Encrypted object-storage metadata verification for report-card and upload artifacts.
- Automated restore test in a disposable environment.
- Full schema restore, tenant-scoped restore, and point-in-time restore results.
- Checksum failure handling before restore mutation.
- RTO/RPO measurements and tenant digest comparison.

Current evidence sources:

- `npm run dr:backup-restore`
- `docs/runbooks/backup-restore.md`
- `docs/runbooks/backup-restore-drill.md`
- `production-backup-restore.txt` workflow artifact
