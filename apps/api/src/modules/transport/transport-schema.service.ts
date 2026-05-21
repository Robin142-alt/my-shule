import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';

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
  'vehicle_service_logs',
  'transport_audit_logs',
] as const;

@Injectable()
export class TransportSchemaService implements OnModuleInit {
  private readonly logger = new Logger(TransportSchemaService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async onModuleInit(): Promise<void> {
    await this.databaseService.runSchemaBootstrap(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      CREATE TABLE IF NOT EXISTS transport_routes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        name text NOT NULL,
        code text,
        direction text NOT NULL DEFAULT 'round_trip',
        zone text,
        fare_amount_minor bigint NOT NULL DEFAULT 0,
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

      CREATE UNIQUE INDEX IF NOT EXISTS transport_routes_name
        ON transport_routes (tenant_id, lower(name));
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
      CREATE INDEX IF NOT EXISTS ix_vehicle_service_logs_vehicle
        ON vehicle_service_logs (tenant_id, vehicle_id, service_date DESC);

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
