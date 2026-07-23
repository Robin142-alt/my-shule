import { createHash } from 'node:crypto';
import process from 'node:process';

import pg from 'pg';

const { Client } = pg;
const sourceUrl = process.env.SOURCE_DATABASE_URL;
const targetUrl = process.env.TARGET_DATABASE_URL;

if (!sourceUrl || !targetUrl) {
  throw new Error('SOURCE_DATABASE_URL and TARGET_DATABASE_URL are required.');
}

const sourceParsed = new URL(sourceUrl);
const targetParsed = new URL(targetUrl);
if (!sourceParsed.hostname.includes('neon.tech')) {
  throw new Error('The source must be a Neon PostgreSQL database.');
}
if (targetParsed.hostname.includes('neon.tech')) {
  throw new Error('The target must not be a Neon PostgreSQL database.');
}

const expectedSource = process.env.MIGRATION_EXPECTED_SOURCE_DATABASE ?? 'neondb';
const expectedTarget = process.env.MIGRATION_EXPECTED_TARGET_DATABASE ?? 'myshule_final';
const hash = (value) => createHash('sha256').update(value).digest('hex');
const quoteIdentifier = (value) => `"${value.replaceAll('"', '""')}"`;

const catalogQueries = {
  schemas: `
    select nspname as schema_name
    from pg_namespace
    where nspname in ('public', 'app')
    order by 1
  `,
  tables: `
    select n.nspname as schema_name, c.relname as table_name, c.relkind,
           c.relpersistence, c.relrowsecurity, c.relforcerowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('public', 'app') and c.relkind in ('r', 'p')
    order by 1, 2
  `,
  columns: `
    select n.nspname as schema_name, c.relname as table_name, a.attnum,
           a.attname as column_name, format_type(a.atttypid, a.atttypmod) as data_type,
           a.attnotnull, a.attidentity, a.attgenerated,
           pg_get_expr(d.adbin, d.adrelid) as column_default,
           coll.collname as collation
    from pg_attribute a
    join pg_class c on c.oid = a.attrelid
    join pg_namespace n on n.oid = c.relnamespace
    left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
    left join pg_collation coll on coll.oid = a.attcollation and a.attcollation <> 0
    where n.nspname in ('public', 'app')
      and c.relkind in ('r', 'p')
      and a.attnum > 0
      and not a.attisdropped
    order by 1, 2, 3
  `,
  constraints: `
    select n.nspname as schema_name, rel.relname as table_name, c.conname,
           c.contype, c.convalidated, c.condeferrable, c.condeferred,
           pg_get_constraintdef(c.oid, true) as definition
    from pg_constraint c
    join pg_namespace n on n.oid = c.connamespace
    join pg_class rel on rel.oid = c.conrelid
    where n.nspname in ('public', 'app')
      -- PostgreSQL 18 also materializes column NOT NULL state as contype = 'n'.
      -- Column nullability is already compared exactly by the columns catalog check.
      and c.contype <> 'n'
    order by 1, 2, 3
  `,
  indexes: `
    select n.nspname as schema_name, rel.relname as table_name,
           idx.relname as index_name, i.indisprimary, i.indisunique,
           i.indisvalid, i.indisready, pg_get_indexdef(i.indexrelid) as definition
    from pg_index i
    join pg_class idx on idx.oid = i.indexrelid
    join pg_class rel on rel.oid = i.indrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname in ('public', 'app')
    order by 1, 2, 3
  `,
  enums: `
    select n.nspname as schema_name, t.typname as type_name,
           e.enumsortorder::text, e.enumlabel
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname in ('public', 'app')
    order by 1, 2, e.enumsortorder
  `,
  views: `
    select n.nspname as schema_name, c.relname as view_name, c.relkind,
           pg_get_viewdef(c.oid, true) as definition
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('public', 'app') and c.relkind in ('v', 'm')
    order by 1, 2
  `,
  functions: `
    select n.nspname as schema_name, p.proname as function_name,
           pg_get_function_identity_arguments(p.oid) as arguments,
           p.prokind, p.prorettype::regtype::text as result_type,
           lang.lanname as language, p.prosrc, p.provolatile, p.proparallel,
           p.prosecdef, p.proleakproof, p.proisstrict, p.proretset,
           coalesce(p.proconfig, array[]::text[]) as configuration
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    join pg_language lang on lang.oid = p.prolang
    where n.nspname in ('public', 'app')
      and not exists (
        select 1
        from pg_depend d
        where d.classid = 'pg_proc'::regclass
          and d.objid = p.oid
          and d.deptype = 'e'
      )
    order by 1, 2, 3, 4
  `,
  triggers: `
    select n.nspname as schema_name, c.relname as table_name,
           t.tgname as trigger_name, t.tgenabled,
           pg_get_triggerdef(t.oid, true) as definition
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('public', 'app') and not t.tgisinternal
    order by 1, 2, 3
  `,
  policies: `
    select n.nspname as schema_name, c.relname as table_name,
           p.polname as policy_name, p.polpermissive, p.polcmd,
           array(
             select r.rolname
             from unnest(p.polroles) role_oid
             join pg_roles r on r.oid = role_oid
             order by r.rolname
           ) as roles,
           pg_get_expr(p.polqual, p.polrelid) as using_expression,
           pg_get_expr(p.polwithcheck, p.polrelid) as check_expression
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('public', 'app')
    order by 1, 2, 3
  `,
  sequences: `
    select n.nspname as schema_name, c.relname as sequence_name,
           format_type(s.seqtypid, null) as data_type,
           s.seqstart::text, s.seqincrement::text, s.seqmax::text,
           s.seqmin::text, s.seqcache::text, s.seqcycle,
           c.relpersistence
    from pg_sequence s
    join pg_class c on c.oid = s.seqrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('public', 'app')
    order by 1, 2
  `,
  sequence_ownership: `
    select sequence_ns.nspname as schema_name,
           sequence_rel.relname as sequence_name,
           owner_ns.nspname as owner_schema,
           owner_rel.relname as owner_table,
           owner_att.attname as owner_column,
           d.deptype
    from pg_class sequence_rel
    join pg_namespace sequence_ns on sequence_ns.oid = sequence_rel.relnamespace
    left join pg_depend d
      on d.classid = 'pg_class'::regclass
     and d.objid = sequence_rel.oid
     and d.refclassid = 'pg_class'::regclass
     and d.deptype in ('a', 'i')
    left join pg_class owner_rel on owner_rel.oid = d.refobjid
    left join pg_namespace owner_ns on owner_ns.oid = owner_rel.relnamespace
    left join pg_attribute owner_att
      on owner_att.attrelid = owner_rel.oid
     and owner_att.attnum = d.refobjsubid
    where sequence_ns.nspname in ('public', 'app')
      and sequence_rel.relkind = 'S'
    order by 1, 2
  `,
};

const loadSequenceValues = async (client, sequenceRows) => {
  const values = [];
  for (const { schema_name: schemaName, sequence_name: sequenceName } of sequenceRows) {
    const result = await client.query(
      `select last_value::text, is_called from ${quoteIdentifier(schemaName)}.${quoteIdentifier(sequenceName)}`,
    );
    values.push({
      is_called: result.rows[0].is_called,
      last_value: result.rows[0].last_value,
      schema_name: schemaName,
      sequence_name: sequenceName,
    });
  }
  return values;
};

const loadMigrationHistory = async (client) => {
  const candidates = ['_prisma_migrations', 'schema_migrations'];
  const histories = [];
  for (const tableName of candidates) {
    const exists = await client.query('select to_regclass($1) is not null as exists', [`public.${tableName}`]);
    if (!exists.rows[0].exists) {
      histories.push({ exists: false, table: tableName });
      continue;
    }
    const result = await client.query(
      `select to_jsonb(history_row)::text as row_json from public.${quoteIdentifier(tableName)} history_row`,
    );
    const rows = result.rows.map(({ row_json: rowJson }) => rowJson).sort();
    histories.push({ exists: true, fingerprint: hash(rows.join('\n')), rows: rows.length, table: tableName });
  }
  return histories;
};

const loadForeignKeys = async (client) => {
  const result = await client.query(`
    select c.conname,
           child_ns.nspname as child_schema,
           child.relname as child_table,
           parent_ns.nspname as parent_schema,
           parent.relname as parent_table,
           array_agg(child_att.attname::text order by keys.ordinality)::text[] as child_columns,
           array_agg(parent_att.attname::text order by keys.ordinality)::text[] as parent_columns
    from pg_constraint c
    join pg_class child on child.oid = c.conrelid
    join pg_namespace child_ns on child_ns.oid = child.relnamespace
    join pg_class parent on parent.oid = c.confrelid
    join pg_namespace parent_ns on parent_ns.oid = parent.relnamespace
    join lateral unnest(c.conkey, c.confkey) with ordinality
      as keys(child_attnum, parent_attnum, ordinality) on true
    join pg_attribute child_att
      on child_att.attrelid = child.oid and child_att.attnum = keys.child_attnum
    join pg_attribute parent_att
      on parent_att.attrelid = parent.oid and parent_att.attnum = keys.parent_attnum
    where c.contype = 'f' and child_ns.nspname in ('public', 'app')
    group by c.oid, c.conname, child_ns.nspname, child.relname, parent_ns.nspname, parent.relname
    order by child_ns.nspname, child.relname, c.conname
  `);

  const checks = [];
  for (const foreignKey of result.rows) {
    const child = `${quoteIdentifier(foreignKey.child_schema)}.${quoteIdentifier(foreignKey.child_table)}`;
    const parent = `${quoteIdentifier(foreignKey.parent_schema)}.${quoteIdentifier(foreignKey.parent_table)}`;
    const populated = foreignKey.child_columns
      .map((column) => `child_row.${quoteIdentifier(column)} is not null`)
      .join(' and ');
    const join = foreignKey.child_columns
      .map((column, index) =>
        `child_row.${quoteIdentifier(column)} is not distinct from parent_row.${quoteIdentifier(foreignKey.parent_columns[index])}`)
      .join(' and ');
    const count = await client.query(`
      select count(*)::int as violations
      from ${child} child_row
      where ${populated}
        and not exists (select 1 from ${parent} parent_row where ${join})
    `);
    checks.push({
      constraint: foreignKey.conname,
      table: `${foreignKey.child_schema}.${foreignKey.child_table}`,
      violations: count.rows[0].violations,
    });
  }
  return checks;
};

const loadUniqueDuplicates = async (client) => {
  const result = await client.query(`
    select c.conname, n.nspname as schema_name, rel.relname as table_name,
           array_agg(a.attname::text order by keys.ordinality)::text[] as columns
    from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    join lateral unnest(c.conkey) with ordinality as keys(attnum, ordinality) on true
    join pg_attribute a on a.attrelid = rel.oid and a.attnum = keys.attnum
    where c.contype = 'u' and n.nspname in ('public', 'app')
    group by c.oid, c.conname, n.nspname, rel.relname
    order by n.nspname, rel.relname, c.conname
  `);

  const checks = [];
  for (const uniqueConstraint of result.rows) {
    const table = `${quoteIdentifier(uniqueConstraint.schema_name)}.${quoteIdentifier(uniqueConstraint.table_name)}`;
    const columns = uniqueConstraint.columns.map(quoteIdentifier).join(', ');
    const populated = uniqueConstraint.columns.map((column) => `${quoteIdentifier(column)} is not null`).join(' and ');
    const count = await client.query(`
      select count(*)::int as duplicate_groups
      from (
        select ${columns}
        from ${table}
        where ${populated}
        group by ${columns}
        having count(*) > 1
      ) duplicate_values
    `);
    checks.push({
      constraint: uniqueConstraint.conname,
      duplicate_groups: count.rows[0].duplicate_groups,
      table: `${uniqueConstraint.schema_name}.${uniqueConstraint.table_name}`,
    });
  }
  return checks;
};

const loadDatabase = async (connectionString, applicationName, expectedDatabase) => {
  const client = new Client({ application_name: applicationName, connectionString, keepAlive: true });
  await client.connect();
  try {
    await client.query('begin isolation level repeatable read read only');
    const identity = await client.query(`
      select current_database() as database_name,
             current_setting('server_version') as server_version,
             current_setting('server_encoding') as encoding,
             d.datcollate as collation,
             current_setting('TimeZone') as timezone
      from pg_database d
      where d.datname = current_database()
    `);
    if (identity.rows[0].database_name !== expectedDatabase) {
      throw new Error(`Expected ${expectedDatabase}, received ${identity.rows[0].database_name}.`);
    }

    const catalogs = {};
    for (const [name, query] of Object.entries(catalogQueries)) {
      const result = await client.query(query);
      catalogs[name] = result.rows;
    }
    const extensions = await client.query(`
      select extname as name, extversion as version
      from pg_extension
      where extname <> 'plpgsql'
      order by extname
    `);
    const sequenceValues = await loadSequenceValues(client, catalogs.sequences);
    const migrationHistory = await loadMigrationHistory(client);
    const foreignKeyChecks = await loadForeignKeys(client);
    const uniqueChecks = await loadUniqueDuplicates(client);
    await client.query('commit');
    return {
      catalogs,
      extensions: extensions.rows,
      foreignKeyChecks,
      identity: identity.rows[0],
      migrationHistory,
      sequenceValues,
      uniqueChecks,
    };
  } catch (error) {
    await client.query('rollback').catch(() => undefined);
    throw error;
  } finally {
    await client.end().catch(() => undefined);
  }
};

const [source, target] = await Promise.all([
  loadDatabase(sourceUrl, 'myshule_structural_source_verification', expectedSource),
  loadDatabase(targetUrl, 'myshule_structural_target_verification', expectedTarget),
]);

const catalogChecks = {};
for (const name of Object.keys(catalogQueries)) {
  const sourceRows = source.catalogs[name];
  const targetRows = target.catalogs[name];
  const sourceHash = hash(JSON.stringify(sourceRows));
  const targetHash = hash(JSON.stringify(targetRows));
  catalogChecks[name] = {
    match: sourceHash === targetHash,
    source_count: sourceRows.length,
    source_fingerprint: sourceHash,
    target_count: targetRows.length,
    target_fingerprint: targetHash,
  };
}

const fingerprintCheck = (sourceRows, targetRows) => {
  const sourceFingerprint = hash(JSON.stringify(sourceRows));
  const targetFingerprint = hash(JSON.stringify(targetRows));
  return {
    match: sourceFingerprint === targetFingerprint,
    source_count: sourceRows.length,
    source_fingerprint: sourceFingerprint,
    target_count: targetRows.length,
    target_fingerprint: targetFingerprint,
  };
};

const extensionNamesMatch = source.extensions.map(({ name }) => name).join('|')
  === target.extensions.map(({ name }) => name).join('|');
const extensionVersionDifferences = source.extensions.flatMap((sourceExtension) => {
  const targetExtension = target.extensions.find(({ name }) => name === sourceExtension.name);
  if (!targetExtension || targetExtension.version === sourceExtension.version) {
    return [];
  }
  return [{ name: sourceExtension.name, source: sourceExtension.version, target: targetExtension.version }];
});

const sequenceValues = fingerprintCheck(source.sequenceValues, target.sequenceValues);
const migrationHistory = fingerprintCheck(source.migrationHistory, target.migrationHistory);
const foreignKeys = fingerprintCheck(source.foreignKeyChecks, target.foreignKeyChecks);
const uniqueConstraints = fingerprintCheck(source.uniqueChecks, target.uniqueChecks);
const sourceForeignKeyViolations = source.foreignKeyChecks.reduce((total, current) => total + current.violations, 0);
const targetForeignKeyViolations = target.foreignKeyChecks.reduce((total, current) => total + current.violations, 0);
const sourceDuplicateGroups = source.uniqueChecks.reduce((total, current) => total + current.duplicate_groups, 0);
const targetDuplicateGroups = target.uniqueChecks.reduce((total, current) => total + current.duplicate_groups, 0);

const criticalFailures = [
  ...Object.entries(catalogChecks).filter(([, check]) => !check.match).map(([name]) => `catalog:${name}`),
  ...(!extensionNamesMatch ? ['extensions:names'] : []),
  ...(!sequenceValues.match ? ['sequences:values'] : []),
  ...(!migrationHistory.match ? ['migration:history'] : []),
  ...(!foreignKeys.match ? ['foreign_keys:orphan-comparison'] : []),
  ...(!uniqueConstraints.match ? ['unique_constraints:duplicate-comparison'] : []),
  ...(targetForeignKeyViolations !== sourceForeignKeyViolations ? ['foreign_keys:target-violations'] : []),
  ...(targetDuplicateGroups !== sourceDuplicateGroups ? ['unique_constraints:target-duplicates'] : []),
];

console.log(JSON.stringify({
  catalog_checks: catalogChecks,
  critical_failures: criticalFailures,
  extensions: {
    names_match: extensionNamesMatch,
    source: source.extensions,
    target: target.extensions,
    version_differences: extensionVersionDifferences,
  },
  foreign_keys: {
    ...foreignKeys,
    source_violations: sourceForeignKeyViolations,
    target_violations: targetForeignKeyViolations,
  },
  migration_history: migrationHistory,
  sequence_values: sequenceValues,
  source: source.identity,
  target: target.identity,
  unique_constraints: {
    ...uniqueConstraints,
    source_duplicate_groups: sourceDuplicateGroups,
    target_duplicate_groups: targetDuplicateGroups,
  },
  verified: criticalFailures.length === 0,
}, null, 2));

if (criticalFailures.length > 0) {
  process.exitCode = 1;
}
