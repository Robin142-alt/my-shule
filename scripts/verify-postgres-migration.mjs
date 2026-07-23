import { createHash } from 'node:crypto';
import process from 'node:process';

import pg from 'pg';

const { Client } = pg;
const connectionString = process.env.VERIFY_DATABASE_URL;

if (!connectionString) {
  throw new Error('VERIFY_DATABASE_URL is required.');
}

const hash = (value) => createHash('sha256').update(value).digest('hex');
const quoteIdentifier = (value) => `"${value.replaceAll('"', '""')}"`;
const quoteLiteral = (value) => `'${value.replaceAll("'", "''")}'`;

const client = new Client({
  application_name: 'myshule_migration_verification',
  connectionString,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000,
});

await client.connect();

try {
  await client.query('begin read only');

  const inventoryResult = await client.query(`
    with user_tables as (
      select c.oid, c.relrowsecurity, c.relforcerowsecurity
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname in ('public', 'app') and c.relkind = 'r'
    )
    select
      current_database() as database_name,
      current_setting('server_version') as server_version,
      (select count(*)::int from user_tables) as tables,
      (select count(*)::int from pg_indexes where schemaname in ('public', 'app')) as indexes,
      (select count(*)::int from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname in ('public', 'app') and not t.tgisinternal) as triggers,
      (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname in ('public', 'app')) as functions,
      (select count(*)::int from pg_type t join pg_namespace n on n.oid = t.typnamespace where n.nspname in ('public', 'app') and t.typtype = 'e') as enums,
      (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname in ('public', 'app') and c.relkind = 'S') as sequences,
      (select count(*)::int from pg_views where schemaname in ('public', 'app')) as views,
      (select count(*)::int from pg_matviews where schemaname in ('public', 'app')) as materialized_views,
      (select count(*)::int from pg_largeobject_metadata) as large_objects,
      (select count(*)::int from pg_foreign_table ft join pg_class c on c.oid = ft.ftrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname in ('public', 'app')) as foreign_tables,
      (select count(*)::int from pg_partitioned_table pt join pg_class c on c.oid = pt.partrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname in ('public', 'app')) as partitioned_tables,
      (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname in ('public', 'app') and c.relkind in ('r', 'p') and not exists (select 1 from pg_constraint con where con.conrelid = c.oid and con.contype = 'p')) as tables_without_primary_keys,
      (select count(*)::int from pg_index i join pg_class c on c.oid = i.indexrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname in ('public', 'app') and not i.indisvalid) as invalid_indexes,
      (select count(*)::int from pg_constraint c join pg_namespace n on n.oid = c.connamespace where n.nspname in ('public', 'app') and not c.convalidated) as unvalidated_constraints,
      (select count(*)::int from pg_class s join pg_namespace n on n.oid = s.relnamespace where n.nspname in ('public', 'app') and s.relkind = 'S' and not exists (select 1 from pg_depend d where d.objid = s.oid and d.classid = 'pg_class'::regclass and d.refclassid = 'pg_class'::regclass and d.deptype in ('a', 'i'))) as orphan_sequences,
      (select count(*)::int from user_tables where relrowsecurity) as rls_enabled_tables,
      (select count(*)::int from user_tables where relforcerowsecurity) as rls_forced_tables,
      (select count(*)::int from pg_policy p join pg_class c on c.oid = p.polrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname in ('public', 'app')) as rls_policies,
      (select count(distinct table_schema || '.' || table_name)::int from information_schema.columns where table_schema in ('public', 'app') and column_name = 'school_id') as tables_with_school_id,
      (select count(distinct table_schema || '.' || table_name)::int from information_schema.columns where table_schema in ('public', 'app') and column_name = 'tenant_id') as tables_with_tenant_id,
      (select count(*)::int from (select table_schema, table_name from information_schema.columns where table_schema in ('public', 'app') and column_name in ('school_id', 'tenant_id') group by table_schema, table_name having count(distinct column_name) = 2) scoped) as tables_with_both_scope_keys
  `);

  const tableList = await client.query(`
    select schemaname as schema_name, tablename as table_name
    from pg_tables
    where schemaname in ('public', 'app')
    order by schemaname, tablename
  `);

  const countSql = tableList.rows.map(({ schema_name: schemaName, table_name: tableName }) => {
    const qualified = `${quoteIdentifier(schemaName)}.${quoteIdentifier(tableName)}`;
    const name = `${schemaName}.${tableName}`;
    return `select ${quoteLiteral(name)} as table_name, count(*)::bigint as row_count from ${qualified}`;
  }).join('\nunion all\n');
  const rowCountsResult = await client.query(countSql);
  const rowCounts = rowCountsResult.rows
    .map(({ table_name: tableName, row_count: rowCount }) => ({
      table: tableName,
      rows: Number(rowCount),
    }))
    .sort((left, right) => left.table.localeCompare(right.table));

  const tableContentFingerprints = [];
  const databaseContentHash = createHash('sha256');
  const databaseBusinessContentHash = createHash('sha256');
  for (const { table, rows } of rowCounts) {
    const separatorIndex = table.indexOf('.');
    const schemaName = table.slice(0, separatorIndex);
    const tableName = table.slice(separatorIndex + 1);
    const qualified = `${quoteIdentifier(schemaName)}.${quoteIdentifier(tableName)}`;
    const contentResult = await client.query(
      `select
         to_jsonb(source_row)::text as row_json,
         (to_jsonb(source_row) - 'updated_at')::text as business_row_json
       from ${qualified} source_row`,
    );
    const serializedRows = contentResult.rows
      .map(({ row_json: rowJson }) => rowJson)
      .sort();
    const serializedBusinessRows = contentResult.rows
      .map(({ business_row_json: businessRowJson }) => businessRowJson)
      .sort();
    const fingerprint = hash(serializedRows.join('\n'));
    const businessFingerprint = hash(serializedBusinessRows.join('\n'));

    databaseContentHash.update(`${table}|${rows}|${fingerprint}\n`);
    databaseBusinessContentHash.update(`${table}|${rows}|${businessFingerprint}\n`);
    if (rows > 0) {
      tableContentFingerprints.push({
        business_fingerprint: businessFingerprint,
        fingerprint,
        rows,
        table,
      });
    }
  }

  const scopeColumns = await client.query(`
    select table_schema as schema_name, table_name, column_name
    from information_schema.columns
    where table_schema in ('public', 'app')
      and column_name in ('school_id', 'tenant_id')
    order by table_schema, table_name, column_name
  `);
  const scopeTables = new Map();
  for (const { schema_name: schemaName, table_name: tableName, column_name: columnName } of scopeColumns.rows) {
    const key = `${schemaName}.${tableName}`;
    const current = scopeTables.get(key) ?? { schemaName, tableName, columns: new Set() };
    current.columns.add(columnName);
    scopeTables.set(key, current);
  }

  const loadScopeGroups = async (columnNames) => {
    const eligible = [...scopeTables.values()].filter(({ columns }) =>
      columnNames.every((columnName) => columns.has(columnName)));
    const selectList = eligible.map(({ schemaName, tableName }) => {
      const qualified = `${quoteIdentifier(schemaName)}.${quoteIdentifier(tableName)}`;
      const name = `${schemaName}.${tableName}`;
      const values = columnNames.map((columnName) =>
        `coalesce(${quoteIdentifier(columnName)}::text, '<null>')`).join(` || '|' || `);
      return `select ${quoteLiteral(name)} as table_name, ${values} as scope_value, count(*)::bigint as row_count from ${qualified} group by ${columnNames.map(quoteIdentifier).join(', ')}`;
    });
    if (selectList.length === 0) {
      return [];
    }
    const result = await client.query(selectList.join('\nunion all\n'));
    return result.rows
      .map(({ table_name: tableName, scope_value: scopeValue, row_count: rowCount }) => ({
        rows: Number(rowCount),
        scope: scopeValue,
        table: tableName,
      }))
      .sort((left, right) => `${left.table}|${left.scope}`.localeCompare(`${right.table}|${right.scope}`));
  };

  const schoolScopeGroups = await loadScopeGroups(['school_id']);
  const tenantScopeGroups = await loadScopeGroups(['tenant_id']);
  const combinedScopeGroups = await loadScopeGroups(['school_id', 'tenant_id']);

  const summarizeScope = (groups) => {
    const lines = groups.map(({ table, scope, rows }) => `${table}|${scope}|${rows}`).join('\n');
    return {
      distinct_scope_values: new Set(groups.map(({ scope }) => scope).filter((scope) => !scope.includes('<null>'))).size,
      fingerprint: hash(lines),
      groups: groups.length,
      null_scope_rows: groups
        .filter(({ scope }) => scope.includes('<null>'))
        .reduce((total, { rows }) => total + rows, 0),
    };
  };

  const equalsLines = rowCounts.map(({ table, rows }) => `${table}=${rows}`).join('\n');
  const colonLines = rowCounts.map(({ table, rows }) => `${table}:${rows}`).join('\n');
  const csvLines = rowCounts.map(({ table, rows }) => `${table},${rows}`).join('\n');

  const extensions = await client.query(`
    select extname as name, extversion as version
    from pg_extension
    where extname <> 'plpgsql'
    order by extname
  `);
  const exceptionalConstraints = await client.query(`
    select n.nspname || '.' || c.conname as name
    from pg_constraint c
    join pg_namespace n on n.oid = c.connamespace
    where n.nspname in ('public', 'app') and not c.convalidated
    order by 1
  `);
  const orphanSequences = await client.query(`
    select n.nspname || '.' || s.relname as name
    from pg_class s
    join pg_namespace n on n.oid = s.relnamespace
    where n.nspname in ('public', 'app') and s.relkind = 'S'
      and not exists (
        select 1 from pg_depend d
        where d.objid = s.oid
          and d.classid = 'pg_class'::regclass
          and d.refclassid = 'pg_class'::regclass
          and d.deptype in ('a', 'i')
      )
    order by 1
  `);

  await client.query('commit');

  console.log(JSON.stringify({
    ...inventoryResult.rows[0],
    extensions: extensions.rows,
    content_fingerprints: {
      business_database: databaseBusinessContentHash.digest('hex'),
      database: databaseContentHash.digest('hex'),
      non_empty_tables: tableContentFingerprints,
    },
    non_empty_tables: rowCounts.filter(({ rows }) => rows > 0).length,
    orphan_sequence_names: orphanSequences.rows.map(({ name }) => name),
    row_count_fingerprints: {
      colon_lines: hash(colonLines),
      colon_lines_final_newline: hash(`${colonLines}\n`),
      csv_lines: hash(csvLines),
      csv_lines_final_newline: hash(`${csvLines}\n`),
      equals_lines: hash(equalsLines),
      equals_lines_final_newline: hash(`${equalsLines}\n`),
      json: hash(JSON.stringify(rowCounts)),
    },
    scope_fingerprints: {
      school_id: summarizeScope(schoolScopeGroups),
      school_id_and_tenant_id: summarizeScope(combinedScopeGroups),
      tenant_id: summarizeScope(tenantScopeGroups),
    },
    total_rows: rowCounts.reduce((total, current) => total + current.rows, 0),
    unvalidated_constraint_names: exceptionalConstraints.rows.map(({ name }) => name),
  }));
} catch (error) {
  await client.query('rollback').catch(() => undefined);
  throw error;
} finally {
  await client.end().catch(() => undefined);
}
