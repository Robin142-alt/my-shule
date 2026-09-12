This schema-only fixture captures the mixed Prisma/SQL database contracts that
caused dashboard loading failures. It contains no school records or credentials.
Keep the older column types, names, foreign keys, and RLS policies: testing only
fresh `CREATE TABLE IF NOT EXISTS` definitions misses upgrade failures.

Run `npm run test:sidebar-workspaces` from the repository root. The runner creates
and removes a disposable local PostgreSQL database; the test refuses other hosts
or database names. It applies the owning module bootstraps and the sidebar repair,
checks existing records and repeat initialization, tests reads/writes as a role
without RLS bypass, and executes dashboard GET methods against PostgreSQL.

The GET audit covers 282 methods, including class-teacher routes with a real test
appointment and six legacy lists executed through Prisma. Missing uploaded files
and absent principal membership must still return their expected domain errors.
This is a database contract test, not a replacement for authenticated browser
workflow tests.
