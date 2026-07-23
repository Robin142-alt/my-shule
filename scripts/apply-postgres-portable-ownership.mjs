import process from 'node:process';

import pg from 'pg';

const { Client } = pg;
const connectionString = process.env.TARGET_DATABASE_URL;
const confirmation = 'RAILWAY_TEST_ONLY';
const expectedDatabase = process.env.MIGRATION_EXPECTED_TARGET_DATABASE ?? 'myshule';

if (!connectionString) {
  throw new Error('TARGET_DATABASE_URL is required.');
}

if (process.env.MYSHULE_RESTORE_CONFIRM !== confirmation) {
  throw new Error(`MYSHULE_RESTORE_CONFIRM must equal ${confirmation}.`);
}

if (!['myshule', 'myshule_final'].includes(expectedDatabase)) {
  throw new Error('MIGRATION_EXPECTED_TARGET_DATABASE must be myshule or myshule_final.');
}

const parsedUrl = new URL(connectionString);
if (parsedUrl.hostname.includes('neon.tech')) {
  throw new Error('Refusing to alter ownership on a Neon database.');
}

const client = new Client({
  application_name: 'myshule_portable_ownership',
  connectionString,
});
await client.connect();

try {
  const identity = await client.query(`
    select current_database() as database_name,
           (select count(*)::int from pg_tables where schemaname in ('public', 'app')) as tables
  `);
  if (identity.rows[0].database_name !== expectedDatabase || identity.rows[0].tables !== 444) {
    throw new Error('Refusing ownership update outside the verified Railway restore.');
  }

  await client.query(`
    begin;

    alter role neondb_owner nologin nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
    alter role shule_hub_runtime nologin nosuperuser nocreatedb nocreaterole noreplication nobypassrls;

    alter schema app owner to neondb_owner;
    alter schema public owner to neondb_owner;

    do $ownership$
    declare
      item record;
    begin
      for item in
        select n.nspname as schema_name, c.relname as object_name, c.relkind
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname in ('public', 'app')
          and c.relkind in ('r', 'p', 'v', 'm', 'S', 'f')
        order by n.nspname, c.relname
      loop
        execute case item.relkind
          when 'S' then format('alter sequence %I.%I owner to neondb_owner', item.schema_name, item.object_name)
          when 'v' then format('alter view %I.%I owner to neondb_owner', item.schema_name, item.object_name)
          when 'm' then format('alter materialized view %I.%I owner to neondb_owner', item.schema_name, item.object_name)
          when 'f' then format('alter foreign table %I.%I owner to neondb_owner', item.schema_name, item.object_name)
          else format('alter table %I.%I owner to neondb_owner', item.schema_name, item.object_name)
        end;
      end loop;

      for item in
        select n.nspname as schema_name, t.typname as object_name
        from pg_type t
        join pg_namespace n on n.oid = t.typnamespace
        where n.nspname in ('public', 'app')
          and t.typtype in ('d', 'e', 'r', 'm')
          and not exists (
            select 1 from pg_depend d
            where d.classid = 'pg_type'::regclass
              and d.objid = t.oid
              and d.deptype = 'e'
          )
        order by n.nspname, t.typname
      loop
        execute format('alter type %I.%I owner to neondb_owner', item.schema_name, item.object_name);
      end loop;

      for item in
        select n.nspname as schema_name,
               p.proname as object_name,
               pg_get_function_identity_arguments(p.oid) as arguments,
               p.prokind
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname in ('public', 'app')
          and not exists (
            select 1 from pg_depend d
            where d.classid = 'pg_proc'::regclass
              and d.objid = p.oid
              and d.deptype = 'e'
          )
        order by n.nspname, p.proname
      loop
        execute case item.prokind
          when 'p' then format('alter procedure %I.%I(%s) owner to neondb_owner', item.schema_name, item.object_name, item.arguments)
          when 'a' then format('alter aggregate %I.%I(%s) owner to neondb_owner', item.schema_name, item.object_name, item.arguments)
          else format('alter function %I.%I(%s) owner to neondb_owner', item.schema_name, item.object_name, item.arguments)
        end;
      end loop;
    end
    $ownership$;

    grant usage on schema app, public to shule_hub_runtime;
    grant select, insert, update, delete on all tables in schema app, public to shule_hub_runtime;
    grant usage, select on all sequences in schema app, public to shule_hub_runtime;
    revoke execute on all functions in schema app, public from shule_hub_runtime;

    do $runtime_functions$
    declare
      item record;
    begin
      for item in
        select n.nspname as schema_name,
               p.proname as object_name,
               pg_get_function_identity_arguments(p.oid) as arguments,
               p.prokind
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname in ('public', 'app')
          and not exists (
            select 1 from pg_depend d
            where d.classid = 'pg_proc'::regclass
              and d.objid = p.oid
              and d.deptype = 'e'
          )
      loop
        execute case item.prokind
          when 'p' then format('grant execute on procedure %I.%I(%s) to shule_hub_runtime', item.schema_name, item.object_name, item.arguments)
          when 'a' then format('grant execute on aggregate %I.%I(%s) to shule_hub_runtime', item.schema_name, item.object_name, item.arguments)
          else format('grant execute on function %I.%I(%s) to shule_hub_runtime', item.schema_name, item.object_name, item.arguments)
        end;
      end loop;
    end
    $runtime_functions$;

    alter default privileges for role neondb_owner in schema app
      grant execute on functions to shule_hub_runtime;
    alter default privileges for role neondb_owner in schema public
      grant select, insert, update, delete on tables to shule_hub_runtime;
    alter default privileges for role neondb_owner in schema public
      grant usage, select on sequences to shule_hub_runtime;
    alter default privileges for role neondb_owner in schema public
      grant execute on functions to shule_hub_runtime;

    commit;
  `);

  const result = await client.query(`
    select r.rolname as owner, count(*)::int as objects
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_roles r on r.oid = c.relowner
    where n.nspname in ('public', 'app')
      and c.relkind in ('r', 'p', 'v', 'm', 'S', 'f')
    group by r.rolname
    order by r.rolname
  `);

  console.log(JSON.stringify({ ownershipApplied: true, owners: result.rows }));
} catch (error) {
  await client.query('rollback').catch(() => undefined);
  throw error;
} finally {
  await client.end().catch(() => undefined);
}
