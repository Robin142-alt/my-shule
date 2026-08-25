import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

const TRANSPORT_TABLES = [
  'transport_routes',
  'transport_route_stops',
  'transport_vehicles',
  'transport_drivers',
  'transport_manifests',
  'transport_manifest_students',
  'transport_trips',
  'transport_trip_events',
  'transport_alerts',
  'vehicle_fuel_logs',
  'vehicle_service_logs',
  'transport_audit_logs',
] as const;

@Injectable()
export class TransportSchemaService implements OnModuleInit {

  private async executeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
    const firstParam = params[0];
    const isUuid = typeof firstParam === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(firstParam);

    if ((this.prisma as any).query) {
      return (this.prisma as any).query(query, params);
    }

    
    if (isUuid) {
      return this.prisma.executeWithTenant(firstParam, null, async (tx: any) => {
        const result = await tx.$queryRawUnsafe(query, ...params);
        const arr = Array.isArray(result) ? result : [result];
        return { rows: arr, rowCount: arr.length };
      });
    } else {
      const result = await this.prisma.$queryRawUnsafe(query, ...params);
      const arr = Array.isArray(result) ? result : [result];
        return { rows: arr, rowCount: arr.length };
    }
  }

  private readonly logger = new Logger(TransportSchemaService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.prisma.runSchemaBootstrap(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      CREATE TABLE IF NOT EXISTS transport_routes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        name text NOT NULL,
        code text,
        direction text NOT NULL DEFAULT 'round_trip',
        zone text,
        fare_amount_minor bigint NOT NULL DEFAULT 0,
        assigned_vehicle_id uuid,
        vehicle_assigned_at timestamptz,
        vehicle_assigned_by_user_id uuid,
        status text NOT NULL DEFAULT 'active',
        created_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT uq_transport_routes_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT ck_transport_routes_direction CHECK (direction IN ('morning', 'afternoon', 'round_trip')),
        CONSTRAINT ck_transport_routes_status CHECK (status IN ('draft', 'active', 'paused', 'retired'))
      );

      CREATE TABLE IF NOT EXISTS transport_route_stops (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        route_id uuid NOT NULL,
        name text NOT NULL,
        stop_sequence integer NOT NULL,
        planned_time time,
        latitude numeric(10, 7),
        longitude numeric(10, 7),
        notes text,
        is_active boolean NOT NULL DEFAULT TRUE,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT uq_transport_route_stops_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_transport_route_stops_sequence UNIQUE (tenant_id, route_id, stop_sequence),
        CONSTRAINT fk_transport_route_stops_route
          FOREIGN KEY (tenant_id, route_id)
          REFERENCES transport_routes (tenant_id, id)
          ON DELETE CASCADE,
        CONSTRAINT ck_transport_route_stops_sequence CHECK (stop_sequence > 0)
      );

      CREATE TABLE IF NOT EXISTS transport_vehicles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        registration_number text NOT NULL,
        capacity integer NOT NULL,
        ownership_type text NOT NULL,
        make text,
        model text,
        service_due_date date,
        insurance_expiry_date date,
        status text NOT NULL DEFAULT 'active',
        created_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT uq_transport_vehicles_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_transport_vehicles_registration UNIQUE (tenant_id, registration_number),
        CONSTRAINT ck_transport_vehicles_capacity CHECK (capacity > 0),
        CONSTRAINT ck_transport_vehicles_ownership CHECK (ownership_type IN ('school_owned', 'leased', 'contracted')),
        CONSTRAINT ck_transport_vehicles_status CHECK (status IN ('active', 'maintenance', 'suspended', 'retired'))
      );

      CREATE TABLE IF NOT EXISTS transport_drivers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        staff_id uuid,
        name text NOT NULL,
        phone text,
        license_number text,
        license_expiry_date date,
        status text NOT NULL DEFAULT 'active',
        created_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT uq_transport_drivers_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT ck_transport_drivers_status CHECK (status IN ('active', 'suspended', 'retired'))
      );

      CREATE TABLE IF NOT EXISTS transport_manifests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        route_id uuid NOT NULL,
        academic_term_id uuid,
        effective_from date NOT NULL DEFAULT CURRENT_DATE,
        effective_to date,
        status text NOT NULL DEFAULT 'active',
        created_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT uq_transport_manifests_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT fk_transport_manifests_route
          FOREIGN KEY (tenant_id, route_id)
          REFERENCES transport_routes (tenant_id, id),
        CONSTRAINT ck_transport_manifests_status CHECK (status IN ('draft', 'active', 'archived'))
      );

      CREATE TABLE IF NOT EXISTS transport_manifest_students (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        manifest_id uuid NOT NULL,
        student_id uuid NOT NULL,
        pickup_stop_id uuid,
        dropoff_stop_id uuid,
        boarding_status text NOT NULL DEFAULT 'active',
        guardian_contact text,
        notes text,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT uq_transport_manifest_students_tenant_manifest_student UNIQUE (tenant_id, manifest_id, student_id),
        CONSTRAINT fk_transport_manifest_students_manifest
          FOREIGN KEY (tenant_id, manifest_id)
          REFERENCES transport_manifests (tenant_id, id)
          ON DELETE CASCADE,
        CONSTRAINT fk_transport_manifest_students_pickup_stop
          FOREIGN KEY (tenant_id, pickup_stop_id)
          REFERENCES transport_route_stops (tenant_id, id)
          ON DELETE SET NULL,
        CONSTRAINT fk_transport_manifest_students_dropoff_stop
          FOREIGN KEY (tenant_id, dropoff_stop_id)
          REFERENCES transport_route_stops (tenant_id, id)
          ON DELETE SET NULL,
        CONSTRAINT ck_transport_manifest_students_status CHECK (boarding_status IN ('active', 'paused', 'left_route'))
      );

      CREATE TABLE IF NOT EXISTS transport_trips (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        route_id uuid NOT NULL,
        vehicle_id uuid NOT NULL,
        driver_id uuid,
        manifest_id uuid,
        trip_date date NOT NULL DEFAULT CURRENT_DATE,
        direction text NOT NULL DEFAULT 'morning',
        scheduled_start_at time,
        actual_start_at timestamptz,
        actual_end_at timestamptz,
        learner_count integer NOT NULL DEFAULT 0,
        status text NOT NULL DEFAULT 'scheduled',
        started_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT uq_transport_trips_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT fk_transport_trips_route
          FOREIGN KEY (tenant_id, route_id)
          REFERENCES transport_routes (tenant_id, id),
        CONSTRAINT fk_transport_trips_vehicle
          FOREIGN KEY (tenant_id, vehicle_id)
          REFERENCES transport_vehicles (tenant_id, id),
        CONSTRAINT fk_transport_trips_driver
          FOREIGN KEY (tenant_id, driver_id)
          REFERENCES transport_drivers (tenant_id, id)
          ON DELETE SET NULL,
        CONSTRAINT fk_transport_trips_manifest
          FOREIGN KEY (tenant_id, manifest_id)
          REFERENCES transport_manifests (tenant_id, id)
          ON DELETE SET NULL,
        CONSTRAINT ck_transport_trips_direction CHECK (direction IN ('morning', 'afternoon', 'round_trip')),
        CONSTRAINT ck_transport_trips_status CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'incident'))
      );

      CREATE TABLE IF NOT EXISTS transport_trip_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        trip_id uuid NOT NULL,
        event_type text NOT NULL,
        student_id uuid,
        stop_id uuid,
        event_time timestamptz NOT NULL DEFAULT NOW(),
        notes text,
        latitude numeric(10, 7),
        longitude numeric(10, 7),
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        recorded_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT fk_transport_trip_events_trip
          FOREIGN KEY (tenant_id, trip_id)
          REFERENCES transport_trips (tenant_id, id)
          ON DELETE CASCADE,
        CONSTRAINT fk_transport_trip_events_stop
          FOREIGN KEY (tenant_id, stop_id)
          REFERENCES transport_route_stops (tenant_id, id)
          ON DELETE SET NULL,
        CONSTRAINT ck_transport_trip_events_type CHECK (event_type IN ('departed', 'pickup', 'dropoff', 'delay', 'incident', 'arrived'))
      );

      CREATE TABLE IF NOT EXISTS transport_alerts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        route_id uuid,
        vehicle_id uuid,
        trip_id uuid,
        title text NOT NULL,
        message text NOT NULL,
        severity text NOT NULL DEFAULT 'warning',
        status text NOT NULL DEFAULT 'open',
        notify_parent boolean NOT NULL DEFAULT FALSE,
        resolved_by_user_id uuid,
        resolved_at timestamptz,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT ck_transport_alerts_severity CHECK (severity IN ('info', 'warning', 'critical')),
        CONSTRAINT ck_transport_alerts_status CHECK (status IN ('open', 'acknowledged', 'resolved'))
      );

      CREATE TABLE IF NOT EXISTS vehicle_fuel_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        vehicle_id uuid NOT NULL,
        fuel_date date NOT NULL DEFAULT CURRENT_DATE,
        litres numeric(12, 3) NOT NULL,
        cost_minor bigint NOT NULL DEFAULT 0,
        odometer_reading integer,
        station text,
        receipt_reference text,
        recorded_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT fk_vehicle_fuel_logs_vehicle
          FOREIGN KEY (tenant_id, vehicle_id)
          REFERENCES transport_vehicles (tenant_id, id)
          ON DELETE CASCADE,
        CONSTRAINT ck_vehicle_fuel_logs_litres CHECK (litres > 0),
        CONSTRAINT ck_vehicle_fuel_logs_cost CHECK (cost_minor >= 0)
      );

      CREATE TABLE IF NOT EXISTS vehicle_service_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        vehicle_id uuid NOT NULL,
        service_date date NOT NULL DEFAULT CURRENT_DATE,
        odometer_reading integer,
        next_service_date date,
        cost_minor bigint NOT NULL DEFAULT 0,
        service_provider text,
        notes text,
        recorded_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT fk_vehicle_service_logs_vehicle
          FOREIGN KEY (tenant_id, vehicle_id)
          REFERENCES transport_vehicles (tenant_id, id)
          ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS transport_audit_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        actor_user_id uuid,
        action text NOT NULL,
        resource_type text NOT NULL,
        resource_id uuid,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid
      );

      DO $$
      DECLARE
        transport_table text;
      BEGIN
        FOREACH transport_table IN ARRAY ARRAY[
          'transport_routes',
          'transport_route_stops',
          'transport_vehicles',
          'transport_drivers',
          'transport_manifests',
          'transport_manifest_students',
          'transport_trips',
          'transport_trip_events',
          'transport_alerts',
          'vehicle_fuel_logs',
          'vehicle_service_logs',
          'transport_audit_logs'
        ] LOOP
          EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', transport_table);
          EXECUTE format('DROP POLICY IF EXISTS %I ON %I', transport_table || '_tenant_policy', transport_table);
          EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tenant_id text', transport_table);
          IF EXISTS (
            SELECT 1
            FROM information_schema.columns c
            WHERE c.table_name = transport_table
              AND c.column_name = 'tenant_id'
              AND c.data_type <> 'text'
          ) THEN
            EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id TYPE text USING tenant_id::text', transport_table);
          END IF;
          EXECUTE format(
            'UPDATE %I SET tenant_id = COALESCE(NULLIF(tenant_id, ''''), NULLIF(current_setting(''app.tenant_id'', true), ''''), ''00000000-0000-0000-0000-000000000000'') WHERE tenant_id IS NULL OR tenant_id = ''''',
            transport_table
          );
          EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id SET DEFAULT ''00000000-0000-0000-0000-000000000000''', transport_table);
          EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id SET NOT NULL', transport_table);
          EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT NOW()', transport_table);
          EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT NOW()', transport_table);
          EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS audit_log_reference uuid', transport_table);
        END LOOP;
      END $$;

      ALTER TABLE vehicle_fuel_logs ADD COLUMN IF NOT EXISTS fuel_date date NOT NULL DEFAULT CURRENT_DATE;
      ALTER TABLE vehicle_fuel_logs ADD COLUMN IF NOT EXISTS litres numeric(12, 3);
      ALTER TABLE vehicle_fuel_logs ADD COLUMN IF NOT EXISTS cost_minor bigint NOT NULL DEFAULT 0;
      ALTER TABLE vehicle_fuel_logs ADD COLUMN IF NOT EXISTS odometer_reading integer;
      ALTER TABLE vehicle_fuel_logs ADD COLUMN IF NOT EXISTS station text;
      ALTER TABLE vehicle_fuel_logs ADD COLUMN IF NOT EXISTS receipt_reference text;
      ALTER TABLE vehicle_fuel_logs ADD COLUMN IF NOT EXISTS recorded_by_user_id uuid;

      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'vehicle_fuel_logs'
            AND column_name = 'school_id'
        ) THEN
          EXECUTE '
            UPDATE vehicle_fuel_logs
            SET tenant_id = COALESCE(NULLIF(school_id::text, ''''), NULLIF(tenant_id, ''''))
            WHERE tenant_id IS NULL
               OR tenant_id = ''''
               OR tenant_id = ''00000000-0000-0000-0000-000000000000''
          ';
          EXECUTE 'ALTER TABLE vehicle_fuel_logs ALTER COLUMN school_id DROP NOT NULL';
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'vehicle_fuel_logs'
            AND column_name = 'amount'
        ) THEN
          EXECUTE '
            UPDATE vehicle_fuel_logs
            SET cost_minor = ROUND(amount::numeric * 100)::bigint
            WHERE cost_minor = 0 AND COALESCE(amount::numeric, 0) > 0
          ';
          EXECUTE 'ALTER TABLE vehicle_fuel_logs ALTER COLUMN amount SET DEFAULT 0';
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'vehicle_fuel_logs'
            AND column_name = 'recorded_by_user_id'
            AND data_type <> 'uuid'
        ) THEN
          EXECUTE 'ALTER TABLE vehicle_fuel_logs ALTER COLUMN recorded_by_user_id DROP NOT NULL';
          EXECUTE '
            UPDATE vehicle_fuel_logs
            SET recorded_by_user_id = NULL
            WHERE recorded_by_user_id IS NOT NULL
              AND recorded_by_user_id::text !~* ''^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$''
          ';
          EXECUTE '
            ALTER TABLE vehicle_fuel_logs
            ALTER COLUMN recorded_by_user_id TYPE uuid
            USING NULLIF(recorded_by_user_id::text, '''')::uuid
          ';
        END IF;
      END $$;

      ALTER TABLE vehicle_fuel_logs ALTER COLUMN created_at SET DEFAULT NOW();
      ALTER TABLE vehicle_fuel_logs ALTER COLUMN updated_at SET DEFAULT NOW();

      ALTER TABLE transport_routes ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT 'Transport route';
      ALTER TABLE transport_routes ADD COLUMN IF NOT EXISTS direction text NOT NULL DEFAULT 'round_trip';
      ALTER TABLE transport_routes ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
      ALTER TABLE transport_routes ADD COLUMN IF NOT EXISTS assigned_vehicle_id uuid;
      ALTER TABLE transport_routes ADD COLUMN IF NOT EXISTS vehicle_assigned_at timestamptz;
      ALTER TABLE transport_routes ADD COLUMN IF NOT EXISTS vehicle_assigned_by_user_id uuid;

      ALTER TABLE transport_route_stops ADD COLUMN IF NOT EXISTS route_id uuid;
      ALTER TABLE transport_route_stops ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT 'Route stop';
      ALTER TABLE transport_route_stops ADD COLUMN IF NOT EXISTS stop_sequence integer NOT NULL DEFAULT 1;

      ALTER TABLE transport_vehicles ADD COLUMN IF NOT EXISTS registration_number text;
      UPDATE transport_vehicles
      SET registration_number = COALESCE(NULLIF(registration_number, ''), id::text)
      WHERE registration_number IS NULL OR registration_number = '';
      ALTER TABLE transport_vehicles ALTER COLUMN registration_number SET NOT NULL;
      ALTER TABLE transport_vehicles ADD COLUMN IF NOT EXISTS capacity integer NOT NULL DEFAULT 1;
      ALTER TABLE transport_vehicles ADD COLUMN IF NOT EXISTS ownership_type text NOT NULL DEFAULT 'school_owned';
      ALTER TABLE transport_vehicles ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

      ALTER TABLE transport_drivers ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT 'Driver';
      ALTER TABLE transport_drivers ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

      ALTER TABLE transport_manifests ADD COLUMN IF NOT EXISTS route_id uuid;
      ALTER TABLE transport_manifests ADD COLUMN IF NOT EXISTS effective_from date NOT NULL DEFAULT CURRENT_DATE;
      ALTER TABLE transport_manifests ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

      ALTER TABLE transport_manifest_students ADD COLUMN IF NOT EXISTS manifest_id uuid;
      ALTER TABLE transport_manifest_students ADD COLUMN IF NOT EXISTS student_id uuid;
      ALTER TABLE transport_manifest_students ADD COLUMN IF NOT EXISTS boarding_status text NOT NULL DEFAULT 'active';

      ALTER TABLE transport_trips ADD COLUMN IF NOT EXISTS route_id uuid;
      ALTER TABLE transport_trips ADD COLUMN IF NOT EXISTS vehicle_id uuid;
      ALTER TABLE transport_trips ADD COLUMN IF NOT EXISTS driver_id uuid;
      ALTER TABLE transport_trips ADD COLUMN IF NOT EXISTS manifest_id uuid;
      ALTER TABLE transport_trips ADD COLUMN IF NOT EXISTS trip_date date NOT NULL DEFAULT CURRENT_DATE;
      ALTER TABLE transport_trips ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'scheduled';

      ALTER TABLE transport_trip_events ADD COLUMN IF NOT EXISTS trip_id uuid;
      ALTER TABLE transport_trip_events ADD COLUMN IF NOT EXISTS event_type text NOT NULL DEFAULT 'incident';
      ALTER TABLE transport_trip_events ADD COLUMN IF NOT EXISTS event_time timestamptz NOT NULL DEFAULT NOW();
      ALTER TABLE transport_trip_events ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

      ALTER TABLE transport_alerts ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT 'Transport alert';
      ALTER TABLE transport_alerts ADD COLUMN IF NOT EXISTS message text NOT NULL DEFAULT 'Transport alert requires review.';
      ALTER TABLE transport_alerts ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'warning';
      ALTER TABLE transport_alerts ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open';
      ALTER TABLE transport_alerts ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

      ALTER TABLE vehicle_service_logs ADD COLUMN IF NOT EXISTS vehicle_id uuid;
      ALTER TABLE vehicle_service_logs ADD COLUMN IF NOT EXISTS service_date date NOT NULL DEFAULT CURRENT_DATE;
      ALTER TABLE vehicle_service_logs ADD COLUMN IF NOT EXISTS odometer_reading integer;
      ALTER TABLE vehicle_service_logs ADD COLUMN IF NOT EXISTS next_service_date date;
      ALTER TABLE vehicle_service_logs ADD COLUMN IF NOT EXISTS cost_minor bigint NOT NULL DEFAULT 0;
      ALTER TABLE vehicle_service_logs ADD COLUMN IF NOT EXISTS service_provider text;
      ALTER TABLE vehicle_service_logs ADD COLUMN IF NOT EXISTS notes text;
      ALTER TABLE vehicle_service_logs ADD COLUMN IF NOT EXISTS recorded_by_user_id uuid;

      ALTER TABLE transport_audit_logs ADD COLUMN IF NOT EXISTS actor_user_id uuid;
      ALTER TABLE transport_audit_logs ADD COLUMN IF NOT EXISTS action text NOT NULL DEFAULT 'transport.audit';
      ALTER TABLE transport_audit_logs ADD COLUMN IF NOT EXISTS resource_type text NOT NULL DEFAULT 'transport';
      ALTER TABLE transport_audit_logs ADD COLUMN IF NOT EXISTS resource_id uuid;
      ALTER TABLE transport_audit_logs ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

      DO $$
      DECLARE
        vehicle_id_type text;
        assigned_vehicle_id_type text;
        invalid_assigned_vehicle_count bigint;
      BEGIN
        SELECT format_type(attribute.atttypid, attribute.atttypmod)
        INTO vehicle_id_type
        FROM pg_attribute attribute
        WHERE attribute.attrelid = 'transport_vehicles'::regclass
          AND attribute.attname = 'id'
          AND attribute.attnum > 0
          AND NOT attribute.attisdropped;

        SELECT format_type(attribute.atttypid, attribute.atttypmod)
        INTO assigned_vehicle_id_type
        FROM pg_attribute attribute
        WHERE attribute.attrelid = 'transport_routes'::regclass
          AND attribute.attname = 'assigned_vehicle_id'
          AND attribute.attnum > 0
          AND NOT attribute.attisdropped;

        IF vehicle_id_type IS NULL OR assigned_vehicle_id_type IS NULL THEN
          RAISE EXCEPTION 'Transport vehicle assignment columns are missing during schema bootstrap';
        END IF;

        IF assigned_vehicle_id_type <> vehicle_id_type THEN
          IF vehicle_id_type = 'uuid' THEN
            SELECT COUNT(*)
            INTO invalid_assigned_vehicle_count
            FROM transport_routes
            WHERE assigned_vehicle_id IS NOT NULL
              AND BTRIM(assigned_vehicle_id::text) <> ''
              AND BTRIM(assigned_vehicle_id::text) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

            IF invalid_assigned_vehicle_count > 0 THEN
              RAISE EXCEPTION
                'Cannot convert % transport route vehicle assignment(s) to UUID',
                invalid_assigned_vehicle_count
                USING ERRCODE = '22P02';
            END IF;

            UPDATE transport_routes
            SET assigned_vehicle_id = NULL
            WHERE assigned_vehicle_id IS NOT NULL
              AND BTRIM(assigned_vehicle_id::text) = '';

            ALTER TABLE transport_routes
              ALTER COLUMN assigned_vehicle_id TYPE uuid
              USING NULLIF(BTRIM(assigned_vehicle_id::text), '')::uuid;
          ELSIF vehicle_id_type = 'text'
             OR vehicle_id_type LIKE 'character varying%'
             OR vehicle_id_type LIKE 'character(%' THEN
            EXECUTE format(
              'ALTER TABLE transport_routes ALTER COLUMN assigned_vehicle_id TYPE %s USING assigned_vehicle_id::text::%s',
              vehicle_id_type,
              vehicle_id_type
            );
          ELSE
            RAISE EXCEPTION
              'Unsupported transport_vehicles.id type % for route vehicle assignments',
              vehicle_id_type;
          END IF;
        END IF;
      END $$;

      CREATE UNIQUE INDEX IF NOT EXISTS transport_routes_name
        ON transport_routes (tenant_id, lower(name));
      CREATE UNIQUE INDEX IF NOT EXISTS ux_transport_vehicles_tenant_id_id
        ON transport_vehicles (tenant_id, id);
      CREATE INDEX IF NOT EXISTS ix_transport_routes_assigned_vehicle
        ON transport_routes (tenant_id, assigned_vehicle_id)
        WHERE assigned_vehicle_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS ix_transport_route_stops_route_sequence
        ON transport_route_stops (tenant_id, route_id, stop_sequence);
      CREATE INDEX IF NOT EXISTS ix_transport_manifest_students_student
        ON transport_manifest_students (tenant_id, student_id);
      CREATE INDEX IF NOT EXISTS ix_transport_trips_route_date
        ON transport_trips (tenant_id, route_id, trip_date DESC);
      CREATE INDEX IF NOT EXISTS ix_transport_trip_events_trip_time
        ON transport_trip_events (tenant_id, trip_id, event_time DESC);
      CREATE INDEX IF NOT EXISTS ix_transport_alerts_open
        ON transport_alerts (tenant_id, status, severity, created_at DESC);
      CREATE INDEX IF NOT EXISTS ix_vehicle_fuel_logs_vehicle
        ON vehicle_fuel_logs (tenant_id, vehicle_id, fuel_date DESC);
      CREATE INDEX IF NOT EXISTS ix_vehicle_service_logs_vehicle
        ON vehicle_service_logs (tenant_id, vehicle_id, service_date DESC);

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_transport_routes_assigned_vehicle'
            AND conrelid = 'transport_routes'::regclass
        ) THEN
          ALTER TABLE transport_routes
            ADD CONSTRAINT fk_transport_routes_assigned_vehicle
            FOREIGN KEY (tenant_id, assigned_vehicle_id)
            REFERENCES transport_vehicles (tenant_id, id)
            ON DELETE RESTRICT;
        END IF;
      END $$;

      ${TRANSPORT_TABLES.map((table) => `
        ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;
        ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS ${table}_tenant_policy ON ${table};
        CREATE POLICY ${table}_tenant_policy ON ${table}
        FOR ALL USING (
          tenant_id = current_setting('app.tenant_id', true)
          OR NULLIF(current_setting('app.role', true), '') = 'system'
        )
        WITH CHECK (
          tenant_id = current_setting('app.tenant_id', true)
          OR NULLIF(current_setting('app.role', true), '') = 'system'
        );
      `).join('\n')}
    `);

    this.logger.log('Transport operations schema and RLS policies verified');
  }
}
