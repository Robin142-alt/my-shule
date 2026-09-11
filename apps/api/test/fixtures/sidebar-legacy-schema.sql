-- Schema-only regression fixture for deployed Prisma and SQL contracts. Contains no school data.

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;
CREATE SCHEMA app;
COMMENT ON SCHEMA public IS '';
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;
COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;
COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';
CREATE TYPE public."AcademicYearStatus" AS ENUM (
    'PLANNED',
    'ACTIVE',
    'CLOSED',
    'ARCHIVED'
);
CREATE TYPE public."AccountCategory" AS ENUM (
    'ASSET',
    'LIABILITY',
    'EQUITY',
    'REVENUE',
    'EXPENSE'
);
CREATE TYPE public."ApplicationStatus" AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'INTERVIEW',
    'ACCEPTED',
    'REJECTED',
    'ADMITTED',
    'CANCELLED'
);
CREATE TYPE public."AppointmentStatus" AS ENUM (
    'SCHEDULED',
    'DONE',
    'MISSED',
    'CANCELLED'
);
CREATE TYPE public."ApprovalLevel" AS ENUM (
    'NONE',
    'SINGLE',
    'MULTI_LEVEL',
    'AUTO_APPROVE'
);
CREATE TYPE public."ApprovalStatus" AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'PENDING_APPROVAL',
    'APPROVED',
    'REJECTED',
    'CHANGES_REQUESTED',
    'ESCALATED',
    'CANCELLED',
    'EXPIRED'
);
CREATE TYPE public."AssessmentResponsibility" AS ENUM (
    'MAIN_TEACHER',
    'ASSISTANT_TEACHER',
    'SUBSTITUTE'
);
CREATE TYPE public."AssetCategory" AS ENUM (
    'LAPTOP',
    'PROJECTOR',
    'DESKTOP',
    'PRINTER',
    'CAMERA',
    'ROUTER',
    'FURNITURE',
    'OTHER'
);
CREATE TYPE public."AssetMovementType" AS ENUM (
    'ASSIGN',
    'RETURN',
    'TRANSFER',
    'REPAIR',
    'LOST',
    'DAMAGED'
);
CREATE TYPE public."AssetState" AS ENUM (
    'AVAILABLE',
    'IN_USE',
    'MISSING',
    'DAMAGED'
);
CREATE TYPE public."AssignmentStatus" AS ENUM (
    'ACTIVE',
    'REVOKED'
);
CREATE TYPE public."AttendanceSessionStatus" AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'LOCKED'
);
CREATE TYPE public."AttendanceStatus" AS ENUM (
    'PRESENT',
    'ABSENT',
    'LATE',
    'EXCUSED',
    'SICK'
);
CREATE TYPE public."BedStatus" AS ENUM (
    'AVAILABLE',
    'OCCUPIED',
    'DAMAGED',
    'RESERVED'
);
CREATE TYPE public."BillingCycle" AS ENUM (
    'MONTHLY',
    'ANNUAL'
);
CREATE TYPE public."BoardingAllocationStatus" AS ENUM (
    'ACTIVE',
    'MOVED',
    'ENDED'
);
CREATE TYPE public."BoardingStatus" AS ENUM (
    'DAY_SCHOLAR',
    'BOARDER'
);
CREATE TYPE public."CBCAssessmentLevel" AS ENUM (
    'EXCEEDING_EXPECTATION',
    'MEETING_EXPECTATION',
    'APPROACHING_EXPECTATION',
    'BELOW_EXPECTATION'
);
CREATE TYPE public."ChecklistStatus" AS ENUM (
    'PENDING',
    'IN_PROGRESS',
    'COMPLETE',
    'SKIPPED'
);
CREATE TYPE public."ClassStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'ARCHIVED'
);
CREATE TYPE public."ConfidentialityLevel" AS ENUM (
    'NORMAL',
    'SENSITIVE',
    'RESTRICTED'
);
CREATE TYPE public."CounsellingStatus" AS ENUM (
    'OPEN',
    'FOLLOW_UP',
    'CLOSED'
);
CREATE TYPE public."CreditTransactionType" AS ENUM (
    'TOPUP',
    'USAGE',
    'ADJUSTMENT',
    'REFUND'
);
CREATE TYPE public."CurriculumMode" AS ENUM (
    'CBC',
    'EIGHT_FOUR_FOUR',
    'HYBRID'
);
CREATE TYPE public."CurriculumType" AS ENUM (
    'CBC',
    'EIGHT_FOUR_FOUR',
    'BOTH'
);
CREATE TYPE public."DepartmentScope" AS ENUM (
    'CBC',
    'EIGHT_FOUR_FOUR',
    'BOTH'
);
CREATE TYPE public."DisciplineActionType" AS ENUM (
    'WARNING',
    'DETENTION',
    'PARENT_MEETING',
    'SUSPENSION',
    'EXPULSION_RECOMMENDATION',
    'COUNSELLING_REFERRAL'
);
CREATE TYPE public."DisciplineStatus" AS ENUM (
    'OPEN',
    'UNDER_REVIEW',
    'ACTION_TAKEN',
    'REFERRED',
    'CLOSED'
);
CREATE TYPE public."DocumentStatus" AS ENUM (
    'UPLOADED',
    'VERIFIED',
    'REJECTED'
);
CREATE TYPE public."DocumentType" AS ENUM (
    'BIRTH_CERTIFICATE',
    'REPORT_FORM',
    'PHOTO',
    'TRANSFER_LETTER',
    'OTHER',
    'ADMISSION_LETTER',
    'CLEARANCE_FORM',
    'FEE_STATEMENT',
    'REPORT_CARD',
    'GENERAL_LETTER'
);
CREATE TYPE public."EducationStage" AS ENUM (
    'PRE_PRIMARY',
    'PRIMARY',
    'JUNIOR_SECONDARY',
    'SENIOR_SECONDARY'
);
CREATE TYPE public."EnrollmentStatus" AS ENUM (
    'ACTIVE',
    'TRANSFERRED',
    'PROMOTED',
    'REPEATED',
    'GRADUATED'
);
CREATE TYPE public."EntryDirection" AS ENUM (
    'DEBIT',
    'CREDIT'
);
CREATE TYPE public."ExamCycleStatus" AS ENUM (
    'DRAFT',
    'ACTIVE',
    'MARKS_ENTRY',
    'REVIEW',
    'RELEASED',
    'CLOSED'
);
CREATE TYPE public."ExamSubjectStatus" AS ENUM (
    'ACTIVE',
    'LOCKED'
);
CREATE TYPE public."ExamType" AS ENUM (
    'OPENER',
    'MIDTERM',
    'ENDTERM',
    'MOCK',
    'CAT',
    'PROJECT'
);
CREATE TYPE public."FeeAccountStatus" AS ENUM (
    'ACTIVE',
    'ON_HOLD',
    'CLOSED'
);
CREATE TYPE public."FeeStructureStatus" AS ENUM (
    'DRAFT',
    'ACTIVE',
    'ARCHIVED'
);
CREATE TYPE public."GateIncidentStatus" AS ENUM (
    'OPEN',
    'RESOLVED',
    'ESCALATED'
);
CREATE TYPE public."GuardianRelationship" AS ENUM (
    'FATHER',
    'MOTHER',
    'GUARDIAN',
    'SPONSOR',
    'OTHER'
);
CREATE TYPE public."GuardianStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE'
);
CREATE TYPE public."HealthStatus" AS ENUM (
    'HEALTHY',
    'DEGRADED',
    'DOWN'
);
CREATE TYPE public."IdempotencyStatus" AS ENUM (
    'IN_PROGRESS',
    'COMPLETED',
    'FAILED',
    'EXPIRED'
);
CREATE TYPE public."ImportStatus" AS ENUM (
    'UPLOADED',
    'VALIDATING',
    'READY',
    'IMPORTED',
    'FAILED',
    'ROLLED_BACK'
);
CREATE TYPE public."ImportType" AS ENUM (
    'STUDENTS',
    'PARENTS',
    'STAFF',
    'FEES',
    'BOOKS',
    'INVENTORY'
);
CREATE TYPE public."IncidentSeverity" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);
CREATE TYPE public."InterviewStatus" AS ENUM (
    'SCHEDULED',
    'DONE',
    'MISSED',
    'CANCELLED'
);
CREATE TYPE public."InventoryCategoryType" AS ENUM (
    'PERISHABLE',
    'NON_PERISHABLE',
    'FIXED_ASSET',
    'CONSUMABLE'
);
CREATE TYPE public."InventoryRequestStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'ISSUED',
    'CANCELLED'
);
CREATE TYPE public."InventoryState" AS ENUM (
    'AVAILABLE',
    'LOW_STOCK',
    'EXPIRED',
    'OUT_OF_STOCK',
    'IN_USE',
    'MISSING',
    'DAMAGED',
    'RESERVED',
    'OCCUPIED'
);
CREATE TYPE public."InventoryUnit" AS ENUM (
    'TABLETS',
    'BOTTLES',
    'ML',
    'PACKETS',
    'OTHER'
);
CREATE TYPE public."InvoiceStatus" AS ENUM (
    'DRAFT',
    'ISSUED',
    'PARTIALLY_PAID',
    'PAID',
    'OVERDUE',
    'CANCELLED'
);
CREATE TYPE public."LabSessionStatus" AS ENUM (
    'SCHEDULED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED'
);
CREATE TYPE public."LibraryBookCopyState" AS ENUM (
    'AVAILABLE',
    'IN_USE',
    'MISSING',
    'DAMAGED'
);
CREATE TYPE public."LibraryBookStatus" AS ENUM (
    'ACTIVE',
    'LOST',
    'DAMAGED',
    'ARCHIVED'
);
CREATE TYPE public."LibraryFineStatus" AS ENUM (
    'UNPAID',
    'PAID',
    'WAIVED',
    'CANCELLED'
);
CREATE TYPE public."LibraryLoanStatus" AS ENUM (
    'ACTIVE',
    'RETURNED',
    'OVERDUE',
    'LOST',
    'DAMAGED'
);
CREATE TYPE public."MaintenanceTicketPriority" AS ENUM (
    'LOW',
    'NORMAL',
    'HIGH',
    'URGENT'
);
CREATE TYPE public."MaintenanceTicketStatus" AS ENUM (
    'OPEN',
    'IN_PROGRESS',
    'RESOLVED',
    'CLOSED'
);
CREATE TYPE public."MarksEntryStatus" AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'RETURNED',
    'APPROVED',
    'LOCKED'
);
CREATE TYPE public."MedicalSeverity" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'EMERGENCY'
);
CREATE TYPE public."MedicalVisitStatus" AS ENUM (
    'OPEN',
    'TREATED',
    'REFERRED',
    'CLOSED'
);
CREATE TYPE public."MembershipStatus" AS ENUM (
    'INVITED',
    'ACTIVE',
    'SUSPENDED',
    'REMOVED'
);
CREATE TYPE public."MembershipType" AS ENUM (
    'STAFF',
    'PARENT',
    'STUDENT',
    'PLATFORM_SUPPORT'
);
CREATE TYPE public."ModuleStatus" AS ENUM (
    'ENABLED',
    'DISABLED',
    'TRIAL',
    'EXPIRED'
);
CREATE TYPE public."MpesaMatchStatus" AS ENUM (
    'UNMATCHED',
    'AUTO_MATCHED',
    'MANUALLY_MATCHED',
    'CONFLICT',
    'REVERSED'
);
CREATE TYPE public."NotificationChannel" AS ENUM (
    'SMS',
    'EMAIL',
    'IN_APP'
);
CREATE TYPE public."NotificationDeliveryStatus" AS ENUM (
    'QUEUED',
    'SENT',
    'DELIVERED',
    'FAILED',
    'RETRYING',
    'CANCELLED'
);
CREATE TYPE public."NotificationPriority" AS ENUM (
    'LOW',
    'NORMAL',
    'HIGH',
    'URGENT'
);
CREATE TYPE public."NotificationStatus" AS ENUM (
    'UNREAD',
    'READ',
    'ACTION_REQUIRED',
    'ACTION_TAKEN',
    'DISMISSED',
    'EXPIRED',
    'FAILED'
);
CREATE TYPE public."OwnershipType" AS ENUM (
    'PUBLIC',
    'PRIVATE',
    'FAITH_BASED',
    'COMMUNITY'
);
CREATE TYPE public."PaymentMethod" AS ENUM (
    'CASH',
    'BANK',
    'MPESA',
    'CHEQUE',
    'CARD',
    'OTHER'
);
CREATE TYPE public."PaymentStatus" AS ENUM (
    'PENDING',
    'CONFIRMED',
    'REVERSED',
    'FAILED'
);
CREATE TYPE public."PeriodType" AS ENUM (
    'LESSON',
    'BREAK',
    'LUNCH',
    'ASSEMBLY',
    'GAMES',
    'PREP'
);
CREATE TYPE public."PurchaseOrderStatus" AS ENUM (
    'DRAFT',
    'SENT',
    'PARTIALLY_RECEIVED',
    'RECEIVED',
    'CANCELLED'
);
CREATE TYPE public."PurchaseRequestStatus" AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'APPROVED',
    'REJECTED',
    'ORDERED',
    'RECEIVED',
    'CANCELLED'
);
CREATE TYPE public."ReceiptStatus" AS ENUM (
    'ISSUED',
    'CANCELLED'
);
CREATE TYPE public."ReportCardStatus" AS ENUM (
    'DRAFT',
    'REVIEW',
    'APPROVED',
    'RELEASED',
    'ARCHIVED'
);
CREATE TYPE public."RiskLevel" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);
CREATE TYPE public."RoleType" AS ENUM (
    'PLATFORM',
    'SCHOOL',
    'PORTAL'
);
CREATE TYPE public."RouteStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE'
);
CREATE TYPE public."RowValidationStatus" AS ENUM (
    'VALID',
    'INVALID',
    'WARNING'
);
CREATE TYPE public."SchoolStatus" AS ENUM (
    'ONBOARDING',
    'ACTIVE',
    'SUSPENDED',
    'READ_ONLY',
    'ARCHIVED'
);
CREATE TYPE public."SchoolType" AS ENUM (
    'PRIMARY',
    'JUNIOR_SECONDARY',
    'SECONDARY',
    'MIXED'
);
CREATE TYPE public."ScopeType" AS ENUM (
    'PLATFORM',
    'SCHOOL',
    'DEPARTMENT',
    'GRADE_FORM',
    'CLASS_STREAM',
    'CLASS',
    'STREAM',
    'SUBJECT',
    'BOARDING_HOUSE',
    'ASSIGNED_STUDENTS',
    'OWN_CHILDREN',
    'SELF',
    'READ_ONLY',
    'NONE'
);
CREATE TYPE public."SessionType" AS ENUM (
    'MORNING',
    'AFTERNOON',
    'EVENING',
    'BOARDING',
    'LESSON',
    'NIGHT'
);
CREATE TYPE public."SmsStatus" AS ENUM (
    'QUEUED',
    'SENT',
    'DELIVERED',
    'FAILED'
);
CREATE TYPE public."StockMovementType" AS ENUM (
    'STOCK_IN',
    'ISSUE',
    'RETURN',
    'ADJUSTMENT',
    'DAMAGE',
    'LOSS',
    'ASSIGN',
    'TRANSFER',
    'REPAIR'
);
CREATE TYPE public."StreamStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE'
);
CREATE TYPE public."StudentStatus" AS ENUM (
    'APPLICANT',
    'ACCEPTED',
    'ENROLLED',
    'ACTIVE',
    'SUSPENDED',
    'ON_LEAVE',
    'TRANSFERRED_OUT',
    'WITHDRAWN',
    'GRADUATED',
    'ALUMNI',
    'ARCHIVED',
    'INACTIVE'
);
CREATE TYPE public."SubjectStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'LOCKED'
);
CREATE TYPE public."SubscriptionPlanStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE'
);
CREATE TYPE public."SubscriptionStatus" AS ENUM (
    'TRIAL',
    'ACTIVE',
    'PAST_DUE',
    'EXPIRED',
    'CANCELLED'
);
CREATE TYPE public."SupplierStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'BLACKLISTED'
);
CREATE TYPE public."SyncConflictResolution" AS ENUM (
    'PENDING',
    'SERVER_WINS',
    'CLIENT_WINS',
    'MANUAL_MERGE'
);
CREATE TYPE public."SyncEventStatus" AS ENUM (
    'PENDING',
    'SYNCING',
    'SYNCED',
    'FAILED',
    'NEEDS_REVIEW'
);
CREATE TYPE public."SyncOperationType" AS ENUM (
    'CREATE',
    'UPDATE',
    'DELETE'
);
CREATE TYPE public."SystemJobStatus" AS ENUM (
    'QUEUED',
    'RUNNING',
    'SUCCESS',
    'FAILED',
    'RETRYING'
);
CREATE TYPE public."TaskPriority" AS ENUM (
    'LOW',
    'NORMAL',
    'HIGH',
    'URGENT'
);
CREATE TYPE public."TaskStatus" AS ENUM (
    'TODO',
    'IN_PROGRESS',
    'DONE',
    'CANCELLED'
);
CREATE TYPE public."TeacherAssignmentStatus" AS ENUM (
    'ACTIVE',
    'ENDED'
);
CREATE TYPE public."TermStatus" AS ENUM (
    'PLANNED',
    'ACTIVE',
    'CLOSED'
);
CREATE TYPE public."TicketIssueType" AS ENUM (
    'FEES',
    'ADMISSION',
    'MEETING',
    'DOCUMENT',
    'COMPLAINT',
    'GENERAL'
);
CREATE TYPE public."TicketStatus" AS ENUM (
    'OPEN',
    'IN_PROGRESS',
    'RESOLVED',
    'CLOSED'
);
CREATE TYPE public."UserStatus" AS ENUM (
    'ACTIVE',
    'INVITED',
    'SUSPENDED',
    'DISABLED'
);
CREATE TYPE public."VehicleStatus" AS ENUM (
    'ACTIVE',
    'MAINTENANCE',
    'INACTIVE'
);
CREATE TYPE public."VisitorStatus" AS ENUM (
    'CHECKED_IN',
    'CHECKED_OUT',
    'DENIED'
);
CREATE FUNCTION app.claim_communication_sms_outbox(batch_size integer, lease_ms integer) RETURNS TABLE(id uuid, tenant_id text, attempt_count integer, dispatch_key text, lease_token uuid)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'pg_temp'
    SET row_security TO 'on'
    AS $$
      DECLARE
        stale_message record;
        active_tenant record;
        candidate_message record;
        claimed_message record;
        original_tenant text;
        original_role text;
        candidate_ids uuid[] := ARRAY[]::uuid[];
        candidate_tenants text[] := ARRAY[]::text[];
        candidate_available_at timestamptz[] := ARRAY[]::timestamptz[];
        candidate_created_at timestamptz[] := ARRAY[]::timestamptz[];
      BEGIN
        IF batch_size IS NULL OR batch_size < 1 OR batch_size > 250 THEN
          RAISE EXCEPTION 'batch_size must be between 1 and 250'
            USING ERRCODE = '22023';
        END IF;
        IF lease_ms IS NULL OR lease_ms < 30000 OR lease_ms > 900000 THEN
          RAISE EXCEPTION 'lease_ms must be between 30000 and 900000'
            USING ERRCODE = '22023';
        END IF;
        original_tenant := current_setting('app.tenant_id', true);
        original_role := current_setting('app.role', true);
        PERFORM set_config('app.role', 'platform_owner', true);
        -- Claim transactions are short. Serializing only candidate selection
        -- prevents concurrent worker replicas from choosing the same oldest
        -- rows and returning under-filled batches after one replica wins the
        -- conditional UPDATE.
        PERFORM pg_advisory_xact_lock(
          hashtextextended('app.claim_communication_sms_outbox', 0)
        );
        FOR active_tenant IN
          SELECT
            tenant.tenant_id,
            lower(COALESCE(tenant.status, 'active')) AS tenant_status
          FROM public.tenants tenant
          WHERE btrim(tenant.tenant_id) <> ''
            AND lower(btrim(tenant.tenant_id)) <> 'global'
          ORDER BY tenant.tenant_id
        LOOP
          PERFORM set_config('app.tenant_id', active_tenant.tenant_id, true);
          FOR stale_message IN
          UPDATE public.communication_sms_outbox AS stale
          SET status = CASE
                WHEN stale.dispatch_started_at IS NULL THEN 'Pending'
                ELSE 'DeliveryUnknown'
              END,
              available_at = CASE
                WHEN stale.dispatch_started_at IS NULL THEN NOW() + INTERVAL '5 seconds'
                ELSE stale.available_at
              END,
              delivery_unknown_at = CASE
                WHEN stale.dispatch_started_at IS NULL THEN NULL
                ELSE COALESCE(stale.delivery_unknown_at, NOW())
              END,
              last_error = CASE
                WHEN stale.dispatch_started_at IS NULL
                  THEN 'Dispatch claim expired before a provider request started; safely returned to the queue'
                ELSE COALESCE(
                  stale.last_error,
                  'Provider acceptance is unknown because the previous dispatch lease expired; manual review is required'
                )
              END,
              lease_expires_at = NULL,
              lease_token = NULL,
              updated_at = NOW()
          WHERE lower(stale.status) = 'processing'
            AND stale.tenant_id = active_tenant.tenant_id
            AND stale.lease_expires_at IS NOT NULL
            AND stale.lease_expires_at <= NOW()
          RETURNING
            stale.id,
            stale.tenant_id,
            stale.attempt_count,
            stale.dispatch_started_at,
            stale.delivery_unknown_at,
            stale.updated_at
          LOOP
          IF to_regclass('public.audit_logs') IS NOT NULL THEN
            INSERT INTO public.audit_logs (
              tenant_id,
              actor_user_id,
              action,
              module,
              entity_type,
              entity_id,
              resource_type,
              resource_id,
              aggregate_id,
              metadata,
              occurred_at,
              created_at,
              updated_at
            )
            VALUES (
              stale_message.tenant_id,
              NULL,
              CASE
                WHEN stale_message.dispatch_started_at IS NULL
                  THEN 'communication.sms.claim_released'
                ELSE 'communication.sms.delivery_unknown'
              END,
              'communication',
              'communication_sms',
              stale_message.id::text,
              'communication_sms',
              stale_message.id,
              stale_message.id,
              jsonb_build_object(
                'attempt_count', stale_message.attempt_count,
                'delivery_status', CASE
                  WHEN stale_message.dispatch_started_at IS NULL THEN 'retry_scheduled'
                  ELSE 'unknown'
                END,
                'reason', CASE
                  WHEN stale_message.dispatch_started_at IS NULL
                    THEN 'dispatch_claim_expired_before_provider_request'
                  ELSE 'dispatch_lease_expired_without_provider_outcome'
                END
              ),
              COALESCE(stale_message.delivery_unknown_at, stale_message.updated_at),
              COALESCE(stale_message.delivery_unknown_at, stale_message.updated_at),
              COALESCE(stale_message.delivery_unknown_at, stale_message.updated_at)
            );
          END IF;
          IF stale_message.dispatch_started_at IS NOT NULL
             AND to_regclass('public.outbox_events') IS NOT NULL THEN
            INSERT INTO public.outbox_events (
              tenant_id,
              school_id,
              event_key,
              event_name,
              aggregate_type,
              aggregate_id,
              payload,
              headers,
              status,
              available_at,
              actor_role,
              source_dashboard,
              created_at,
              updated_at
            )
            VALUES (
              stale_message.tenant_id,
              stale_message.tenant_id,
              'communication.sms.delivery_unknown:' || stale_message.id::text,
              'communication.sms.delivery_unknown',
              'communication_sms',
              stale_message.id,
              jsonb_build_object(
                'tenant_id', stale_message.tenant_id,
                'sms_id', stale_message.id::text,
                'recipient_phone_last4', NULL,
                'requested_by_user_id', NULL,
                'attempt_count', stale_message.attempt_count,
                'failure_reason', 'Provider acceptance is unknown because the dispatch lease expired',
                'outcome_recorded_at', stale_message.delivery_unknown_at
              ),
              jsonb_build_object(
                'request_id', 'communication-sms-stale-lease:' || stale_message.id::text,
                'role', 'system',
                'tenant_id', stale_message.tenant_id,
                'school_id', stale_message.tenant_id,
                'source_dashboard', 'system:communication-sms-outbox'
              ),
              'pending',
              NOW(),
              'system',
              'system:communication-sms-outbox',
              stale_message.delivery_unknown_at,
              stale_message.delivery_unknown_at
            )
            ON CONFLICT ON CONSTRAINT uq_outbox_events_tenant_event_key DO NOTHING;
          END IF;
          END LOOP;
          -- Suspended/inactive schools must still have ambiguous expired
          -- leases reconciled above, but no new messages may be dispatched.
          IF active_tenant.tenant_status = 'active' THEN
            FOR candidate_message IN
              SELECT sms.id, sms.tenant_id, sms.available_at, sms.created_at
              FROM public.communication_sms_outbox sms
              WHERE lower(sms.status) IN ('pending', 'queued')
                AND sms.available_at <= NOW()
                AND sms.tenant_id = active_tenant.tenant_id
              ORDER BY sms.available_at ASC, sms.created_at ASC, sms.id ASC
              LIMIT batch_size
            LOOP
              candidate_ids := array_append(candidate_ids, candidate_message.id);
              candidate_tenants := array_append(candidate_tenants, candidate_message.tenant_id);
              candidate_available_at := array_append(candidate_available_at, candidate_message.available_at);
              candidate_created_at := array_append(candidate_created_at, candidate_message.created_at);
            END LOOP;
          END IF;
        END LOOP;
        FOR candidate_message IN
          SELECT candidate.*
          FROM unnest(
            candidate_ids,
            candidate_tenants,
            candidate_available_at,
            candidate_created_at
          ) AS candidate(id, tenant_id, available_at, created_at)
          ORDER BY candidate.available_at ASC, candidate.created_at ASC, candidate.id ASC
          LIMIT batch_size
        LOOP
          PERFORM set_config('app.tenant_id', candidate_message.tenant_id, true);
          FOR claimed_message IN
            UPDATE public.communication_sms_outbox AS target
            SET status = 'Processing',
                attempt_count = target.attempt_count + 1,
                last_attempt_at = NOW(),
                lease_expires_at = NOW() + (lease_ms * INTERVAL '1 millisecond'),
                lease_token = gen_random_uuid(),
                dispatch_started_at = NULL,
                last_error = NULL,
                updated_at = NOW()
            WHERE target.id = candidate_message.id
              AND target.tenant_id = candidate_message.tenant_id
              AND lower(target.status) IN ('pending', 'queued')
              AND target.available_at <= NOW()
            RETURNING
              target.id,
              target.tenant_id,
              target.attempt_count,
              target.dispatch_key,
              target.lease_token
          LOOP
            id := claimed_message.id;
            tenant_id := claimed_message.tenant_id;
            attempt_count := claimed_message.attempt_count;
            dispatch_key := claimed_message.dispatch_key;
            lease_token := claimed_message.lease_token;
            RETURN NEXT;
          END LOOP;
        END LOOP;
        PERFORM set_config('app.tenant_id', COALESCE(original_tenant, ''), true);
        PERFORM set_config('app.role', COALESCE(original_role, ''), true);
        RETURN;
      END;
      $$;
CREATE FUNCTION app.claim_outbox_events(batch_size integer, stale_processing_after_ms integer) RETURNS TABLE(id uuid, tenant_id text, request_id text, trace_id text, span_id text, user_id text, role text, session_id text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'app', 'pg_temp'
    AS $$
      BEGIN
        IF batch_size IS NULL OR batch_size < 1 THEN
          RAISE EXCEPTION 'batch_size must be greater than zero'
            USING ERRCODE = '22023';
        END IF;
        IF stale_processing_after_ms IS NULL OR stale_processing_after_ms < 0 THEN
          RAISE EXCEPTION 'stale_processing_after_ms must be zero or greater'
            USING ERRCODE = '22023';
        END IF;
        RETURN QUERY
        WITH candidate_events AS (
          SELECT outbox_events.id
          FROM outbox_events
          WHERE (
            outbox_events.status = 'pending'
            AND outbox_events.available_at <= NOW()
          )
          OR (
            outbox_events.status = 'failed'
            AND outbox_events.available_at <= NOW()
          )
          OR (
            outbox_events.status = 'processing'
            AND outbox_events.updated_at <= NOW() - (stale_processing_after_ms * INTERVAL '1 millisecond')
          )
          ORDER BY outbox_events.available_at ASC, outbox_events.created_at ASC
          FOR UPDATE SKIP LOCKED
          LIMIT batch_size
        )
        UPDATE outbox_events AS target
        SET
          status = 'processing',
          attempt_count = target.attempt_count + 1,
          last_error = NULL,
          updated_at = NOW()
        FROM candidate_events
        WHERE target.id = candidate_events.id
        RETURNING
          target.id,
          target.tenant_id,
          COALESCE(NULLIF(target.headers ->> 'request_id', ''), format('outbox:%s', target.id)),
          COALESCE(
            NULLIF(target.headers ->> 'trace_id', ''),
            NULLIF(target.headers ->> 'request_id', ''),
            format('outbox:%s', target.id)
          ),
          NULLIF(target.headers ->> 'span_id', ''),
          COALESCE(NULLIF(target.headers ->> 'user_id', ''), 'anonymous'),
          COALESCE(NULLIF(target.headers ->> 'role', ''), 'system'),
          NULLIF(target.headers ->> 'session_id', '');
      END;
      $$;
CREATE FUNCTION app.consume_email_verification_action(input_token_hash text) RETURNS TABLE(user_id uuid, email text, tenant_id text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'app', 'pg_temp'
    AS $$
      DECLARE
        request_user_id text;
        request_path text;
        token_id uuid;
        token_user_id uuid;
        token_email text;
        token_tenant_id text;
      BEGIN
        request_user_id := COALESCE(NULLIF(current_setting('app.user_id', true), ''), 'anonymous');
        request_path := COALESCE(NULLIF(current_setting('app.path', true), ''), '');
        IF request_user_id <> 'anonymous' THEN
          RAISE EXCEPTION 'Email verification is only available before authentication'
            USING ERRCODE = '42501';
        END IF;
        IF request_path NOT LIKE '%/auth/email-verification/verify%' THEN
          RAISE EXCEPTION 'Email verification tokens are only consumed on verification routes'
            USING ERRCODE = '42501';
        END IF;
        PERFORM set_config('app.auth_action_token_operation', 'email_verification_consume', true);
        SELECT token.id, token.user_id, token.email, token.tenant_id
        INTO token_id, token_user_id, token_email, token_tenant_id
        FROM auth_action_tokens token
        WHERE token.token_hash = input_token_hash
          AND token.purpose = 'email_verification'
          AND token.consumed_at IS NULL
          AND token.expires_at > NOW()
        LIMIT 1
        FOR UPDATE;
        IF token_id IS NULL THEN
          RAISE EXCEPTION 'Invalid or expired email verification token'
            USING ERRCODE = '28000';
        END IF;
        UPDATE users
        SET
          email_verified_at = COALESCE(email_verified_at, NOW()),
          updated_at = NOW()
        WHERE id = token_user_id
          AND lower(email) = lower(token_email)
          AND status = 'active';
        IF NOT FOUND THEN
          RAISE EXCEPTION 'Invalid or expired email verification token'
            USING ERRCODE = '28000';
        END IF;
        UPDATE auth_action_tokens
        SET consumed_at = NOW()
        WHERE id = token_id;
        RETURN QUERY
        SELECT token_user_id, token_email, token_tenant_id;
        PERFORM set_config('app.auth_action_token_operation', '', true);
      END;
      $$;
CREATE FUNCTION app.consume_invite_acceptance_action(input_token_hash text, input_password_hash text, input_display_name text, input_expected_tenant_id text DEFAULT NULL::text) RETURNS TABLE(user_id uuid, tenant_id text, email text, display_name text, role_code text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'app', 'pg_temp'
    AS $_$
      #variable_conflict use_column
      DECLARE
        request_user_id text;
        request_path text;
        token_id uuid;
        invite_tenant_id text;
        invite_email text;
        invite_metadata jsonb;
        invite_role_code text;
        invite_display_name text;
        invited_user_id uuid;
        invited_role_id uuid;
      BEGIN
        request_user_id := COALESCE(NULLIF(current_setting('app.user_id', true), ''), 'anonymous');
        request_path := COALESCE(NULLIF(current_setting('app.path', true), ''), '');
        IF request_user_id <> 'anonymous' THEN
          RAISE EXCEPTION 'Invitation acceptance is only available before authentication'
            USING ERRCODE = '42501';
        END IF;
        IF request_path NOT LIKE '%/auth/invitations/accept%' THEN
          RAISE EXCEPTION 'Invitation tokens are only consumed on invitation acceptance routes'
            USING ERRCODE = '42501';
        END IF;
        PERFORM set_config('app.auth_action_token_operation', 'invite_acceptance_consume', true);
        SELECT token.id, token.tenant_id, token.email, token.metadata
        INTO token_id, invite_tenant_id, invite_email, invite_metadata
        FROM auth_action_tokens token
        WHERE token.token_hash = input_token_hash
          AND token.purpose = 'invite_acceptance'
          AND token.consumed_at IS NULL
          AND token.expires_at > NOW()
        LIMIT 1
        FOR UPDATE;
        IF token_id IS NULL THEN
          RAISE EXCEPTION 'Invalid or expired invitation token'
            USING ERRCODE = '28000';
        END IF;
        IF invite_tenant_id IS NULL OR length(invite_tenant_id) = 0 THEN
          RAISE EXCEPTION 'Invitation tenant is missing'
            USING ERRCODE = '22023';
        END IF;
        IF NULLIF(input_expected_tenant_id, '') IS NOT NULL
          AND NULLIF(input_expected_tenant_id, '') <> invite_tenant_id THEN
          RAISE EXCEPTION 'Invitation tenant mismatch'
            USING ERRCODE = '28000';
        END IF;
        PERFORM set_config('app.tenant_id', invite_tenant_id, true);
        invite_role_code := COALESCE(NULLIF(invite_metadata ->> 'role_code', ''), 'member');
        invite_display_name := COALESCE(
          NULLIF(input_display_name, ''),
          NULLIF(invite_metadata ->> 'display_name', ''),
          split_part(invite_email, '@', 1)
        );
        SELECT r.id
        INTO invited_role_id
        FROM roles r
        WHERE r.tenant_id = invite_tenant_id
          AND r.code = invite_role_code
        LIMIT 1;
        IF invited_role_id IS NULL THEN
          RAISE EXCEPTION 'Invitation role is not available'
            USING ERRCODE = '22023';
        END IF;
        SELECT u.id
        INTO invited_user_id
        FROM users u
        WHERE lower(u.email) = lower(invite_email)
        LIMIT 1
        FOR UPDATE;
        IF invited_user_id IS NULL THEN
          INSERT INTO users (
            tenant_id,
            email,
            password_hash,
            full_name,
            display_name,
            status,
            email_verified_at,
            password_changed_at,
            created_at,
            updated_at
          )
          VALUES (
            invite_tenant_id,
            lower(invite_email),
            input_password_hash,
            invite_display_name,
            invite_display_name,
            'active',
            NOW(),
            NOW(),
            NOW(),
            NOW()
          )
          RETURNING id INTO invited_user_id;
        ELSE
          UPDATE users
          SET
            password_hash = input_password_hash,
            full_name = invite_display_name,
            display_name = invite_display_name,
            status = 'active',
            email_verified_at = COALESCE(email_verified_at, NOW()),
            password_changed_at = NOW(),
            updated_at = NOW()
          WHERE id = invited_user_id;
        END IF;
        INSERT INTO tenant_memberships (tenant_id, user_id, role_id, status)
        VALUES (invite_tenant_id, invited_user_id, invited_role_id, 'active')
        ON CONFLICT (tenant_id, user_id)
        DO UPDATE SET
          role_id = EXCLUDED.role_id,
          status = 'active',
          updated_at = NOW();
        IF invite_role_code = ANY (ARRAY['owner', 'admin', 'staff', 'principal', 'deputy_principal', 'secretary', 'bursar', 'accountant', 'teacher', 'class_teacher', 'grade_master', 'hod', 'dean_academics', 'exams_manager', 'nurse', 'clinic_staff', 'school_counsellor', 'discipline_master', 'librarian', 'storekeeper', 'boarding_master', 'security_officer', 'transport_manager', 'lab_technician', 'admissions_officer', 'ict_manager']::text[])
          AND to_regclass('public.staff_profiles') IS NOT NULL THEN
          EXECUTE $staff_projection$
            INSERT INTO staff_profiles (
              tenant_id,
              user_id,
              display_name,
              status,
              created_at,
              updated_at
            )
            VALUES (
              $1,
              $2,
              $3,
              'active',
              NOW(),
              NOW()
            )
            ON CONFLICT (tenant_id, user_id)
              WHERE user_id IS NOT NULL
            DO UPDATE SET
              display_name = COALESCE(NULLIF(EXCLUDED.display_name, ''), staff_profiles.display_name),
              status = 'active',
              updated_at = NOW()
          $staff_projection$
          USING invite_tenant_id, invited_user_id, invite_display_name;
        END IF;
        IF invite_role_code = 'parent' THEN
          UPDATE student_guardians
          SET
            user_id = invited_user_id,
            status = 'active',
            accepted_at = COALESCE(accepted_at, NOW()),
            updated_at = NOW()
          WHERE tenant_id = invite_tenant_id
            AND lower(email) = lower(invite_email)
            AND (user_id IS NULL OR user_id = invited_user_id)
            AND status IN ('invited', 'active');
        END IF;
        UPDATE auth_action_tokens
        SET
          consumed_at = NOW(),
          user_id = invited_user_id,
          metadata = auth_action_tokens.metadata || jsonb_build_object(
            'status', 'accepted',
            'accepted_at', NOW(),
            'accepted_by_user_id', invited_user_id,
            'accepted_role_code', invite_role_code
          )
        WHERE id = token_id;
        RETURN QUERY
        SELECT
          invited_user_id,
          invite_tenant_id,
          lower(invite_email),
          invite_display_name,
          invite_role_code;
        PERFORM set_config('app.auth_action_token_operation', '', true);
      END;
      $_$;
CREATE FUNCTION app.consume_password_recovery_action(input_token_hash text, input_password_hash text) RETURNS TABLE(user_id uuid, email text, tenant_id text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'app', 'pg_temp'
    AS $$
      DECLARE
        request_user_id text;
        request_path text;
        token_id uuid;
        token_user_id uuid;
        token_email text;
        token_tenant_id text;
      BEGIN
        request_user_id := COALESCE(NULLIF(current_setting('app.user_id', true), ''), 'anonymous');
        request_path := COALESCE(NULLIF(current_setting('app.path', true), ''), '');
        IF request_user_id <> 'anonymous' THEN
          RAISE EXCEPTION 'Password reset is only available before authentication'
            USING ERRCODE = '42501';
        END IF;
        IF request_path NOT LIKE '%/auth/password-recovery/reset%' THEN
          RAISE EXCEPTION 'Password reset tokens are only consumed on reset routes'
            USING ERRCODE = '42501';
        END IF;
        PERFORM set_config('app.auth_action_token_operation', 'password_recovery_consume', true);
        SELECT token.id, token.user_id, token.email, token.tenant_id
        INTO token_id, token_user_id, token_email, token_tenant_id
        FROM auth_action_tokens token
        WHERE token.token_hash = input_token_hash
          AND token.purpose = 'password_recovery'
          AND token.consumed_at IS NULL
          AND token.expires_at > NOW()
        LIMIT 1
        FOR UPDATE;
        IF token_id IS NULL THEN
          RAISE EXCEPTION 'Invalid or expired recovery token'
            USING ERRCODE = '28000';
        END IF;
        UPDATE users
        SET
          password_hash = input_password_hash,
          password_changed_at = NOW(),
          updated_at = NOW()
        WHERE id = token_user_id
          AND status = 'active';
        IF NOT FOUND THEN
          RAISE EXCEPTION 'Invalid or expired recovery token'
            USING ERRCODE = '28000';
        END IF;
        UPDATE auth_action_tokens
        SET consumed_at = NOW()
        WHERE id = token_id;
        RETURN QUERY
        SELECT token_user_id, token_email, token_tenant_id;
        PERFORM set_config('app.auth_action_token_operation', '', true);
      END;
      $$;
CREATE FUNCTION app.create_email_verification_action(input_tenant_id text, input_user_id uuid, input_email text, input_token_hash text, input_expires_at timestamp with time zone, input_subject text, input_payload jsonb) RETURNS TABLE(token_id uuid, outbox_id uuid)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'app', 'pg_temp'
    AS $$
      DECLARE
        request_user_id text;
        request_path text;
        created_token_id uuid;
        created_outbox_id uuid;
      BEGIN
        request_user_id := COALESCE(NULLIF(current_setting('app.user_id', true), ''), 'anonymous');
        request_path := COALESCE(NULLIF(current_setting('app.path', true), ''), '');
        IF request_user_id = 'anonymous' OR request_user_id <> input_user_id::text THEN
          RAISE EXCEPTION 'Email verification can only be requested by the current user'
            USING ERRCODE = '42501';
        END IF;
        IF request_path NOT LIKE '%/auth/email-verification/request%' THEN
          RAISE EXCEPTION 'Email verification tokens are only issued on verification routes'
            USING ERRCODE = '42501';
        END IF;
        PERFORM set_config('app.auth_action_token_operation', 'email_verification_create', true);
        PERFORM set_config('app.auth_email_outbox_operation', 'email_verification_create', true);
        UPDATE auth_action_tokens
        SET consumed_at = NOW()
        WHERE user_id = input_user_id
          AND purpose = 'email_verification'
          AND consumed_at IS NULL;
        INSERT INTO auth_action_tokens (
          tenant_id,
          user_id,
          email,
          purpose,
          token_hash,
          metadata,
          expires_at
        )
        VALUES (
          input_tenant_id,
          input_user_id,
          lower(input_email),
          'email_verification',
          input_token_hash,
          input_payload,
          input_expires_at
        )
        RETURNING id INTO created_token_id;
        INSERT INTO auth_email_outbox (
          tenant_id,
          user_id,
          recipient_email,
          template,
          subject,
          payload,
          status
        )
        VALUES (
          input_tenant_id,
          input_user_id,
          lower(input_email),
          'email_verification',
          input_subject,
          input_payload,
          'pending'
        )
        RETURNING id INTO created_outbox_id;
        RETURN QUERY SELECT created_token_id, created_outbox_id;
        PERFORM set_config('app.auth_action_token_operation', '', true);
        PERFORM set_config('app.auth_email_outbox_operation', '', true);
      END;
      $$;
CREATE FUNCTION app.create_global_user_from_invitation(input_email text, input_password_hash text, input_display_name text) RETURNS TABLE(id uuid, tenant_id text, email text, password_hash text, display_name text, status text, email_verified_at timestamp with time zone, mfa_enabled boolean, mfa_verified_at timestamp with time zone, created_at timestamp with time zone, updated_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'app', 'pg_temp'
    AS $$
      DECLARE
        request_user_id text;
        request_path text;
        normalized_email text;
        existing_user_id uuid;
      BEGIN
        request_user_id := COALESCE(NULLIF(current_setting('app.user_id', true), ''), 'anonymous');
        request_path := COALESCE(NULLIF(current_setting('app.path', true), ''), '');
        normalized_email := lower(input_email);
        IF request_user_id <> 'anonymous' THEN
          RAISE EXCEPTION 'Invitation account setup is only available before authentication'
            USING ERRCODE = '42501';
        END IF;
        IF request_path <> '/auth/invitations/accept' THEN
          RAISE EXCEPTION 'Invitation account setup is only available through invitation acceptance'
            USING ERRCODE = '42501';
        END IF;
        SELECT u.id
        INTO existing_user_id
        FROM users u
        WHERE lower(u.email) = normalized_email
        LIMIT 1
        FOR UPDATE;
        IF existing_user_id IS NULL THEN
          RETURN QUERY
          INSERT INTO users (tenant_id, email, password_hash, full_name, display_name, status, email_verified_at, created_at, updated_at)
          VALUES ('global', normalized_email, input_password_hash, input_display_name, input_display_name, 'active', NOW(), NOW(), NOW())
          RETURNING
            users.id,
            users.tenant_id,
            users.email,
            users.password_hash,
            users.display_name,
            users.status,
            users.email_verified_at,
            users.mfa_enabled,
            users.mfa_verified_at,
            users.created_at,
            users.updated_at;
          RETURN;
        END IF;
        IF EXISTS (
          SELECT 1
          FROM users u
          WHERE u.id = existing_user_id
            AND u.tenant_id <> 'global'
        ) THEN
          RAISE EXCEPTION 'Invitation account setup only supports global users'
            USING ERRCODE = '42501';
        END IF;
        RETURN QUERY
        SELECT
          users.id,
          users.tenant_id,
          users.email,
          users.password_hash,
          users.display_name,
          users.status,
          users.email_verified_at,
          users.mfa_enabled,
          users.mfa_verified_at,
          users.created_at,
          users.updated_at
        FROM users
        WHERE users.id = existing_user_id
        LIMIT 1
        FOR UPDATE;
      END;
      $$;
CREATE FUNCTION app.create_password_recovery_action(input_tenant_id text, input_user_id uuid, input_email text, input_token_hash text, input_expires_at timestamp with time zone, input_subject text, input_payload jsonb) RETURNS TABLE(token_id uuid, outbox_id uuid)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'app', 'pg_temp'
    AS $$
      DECLARE
        request_user_id text;
        request_path text;
        created_token_id uuid;
        created_outbox_id uuid;
      BEGIN
        request_user_id := COALESCE(NULLIF(current_setting('app.user_id', true), ''), 'anonymous');
        request_path := COALESCE(NULLIF(current_setting('app.path', true), ''), '');
        IF request_user_id <> 'anonymous' THEN
          RAISE EXCEPTION 'Password recovery is only available before authentication'
            USING ERRCODE = '42501';
        END IF;
        IF request_path NOT LIKE '%/auth/password-recovery/request%' THEN
          RAISE EXCEPTION 'Password recovery tokens are only issued on recovery routes'
            USING ERRCODE = '42501';
        END IF;
        PERFORM set_config('app.auth_action_token_operation', 'password_recovery_create', true);
        PERFORM set_config('app.auth_email_outbox_operation', 'password_recovery_create', true);
        UPDATE auth_action_tokens
        SET consumed_at = NOW()
        WHERE user_id = input_user_id
          AND purpose = 'password_recovery'
          AND consumed_at IS NULL;
        INSERT INTO auth_action_tokens (
          tenant_id,
          user_id,
          email,
          purpose,
          token_hash,
          metadata,
          expires_at
        )
        VALUES (
          input_tenant_id,
          input_user_id,
          lower(input_email),
          'password_recovery',
          input_token_hash,
          input_payload,
          input_expires_at
        )
        RETURNING id INTO created_token_id;
        INSERT INTO auth_email_outbox (
          tenant_id,
          user_id,
          recipient_email,
          template,
          subject,
          payload,
          status
        )
        VALUES (
          input_tenant_id,
          input_user_id,
          lower(input_email),
          'password_recovery',
          input_subject,
          input_payload,
          'pending'
        )
        RETURNING id INTO created_outbox_id;
        RETURN QUERY SELECT created_token_id, created_outbox_id;
        PERFORM set_config('app.auth_action_token_operation', '', true);
        PERFORM set_config('app.auth_email_outbox_operation', '', true);
      END;
      $$;
CREATE FUNCTION app.ensure_finance_period_open() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM finance_close_periods fcp
          WHERE fcp.tenant_id = NEW.tenant_id
            AND fcp.status = 'closed'
            AND COALESCE(NEW.effective_at, NEW.created_at, NOW()) >= fcp.period_started_at
            AND COALESCE(NEW.effective_at, NEW.created_at, NOW()) < fcp.period_ended_at
        ) THEN
          RAISE EXCEPTION 'finance period is closed for tenant "%" and cannot be silently modified', NEW.tenant_id
            USING ERRCODE = '55000';
        END IF;
        RETURN NEW;
      END;
      $$;
CREATE FUNCTION app.find_active_memberships_by_user_for_auth(input_user_id uuid) RETURNS TABLE(id uuid, tenant_id text, user_id uuid, role_id uuid, role_code text, role_name text, status text, created_at timestamp with time zone, updated_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'app', 'pg_temp'
    AS $$
      DECLARE
        request_user_id text;
        request_path text;
      BEGIN
        request_user_id := COALESCE(NULLIF(current_setting('app.user_id', true), ''), 'anonymous');
        request_path := COALESCE(NULLIF(current_setting('app.path', true), ''), '');
        IF request_user_id <> 'anonymous' THEN
          RAISE EXCEPTION 'Membership auto-resolution is only available before authentication'
            USING ERRCODE = '42501';
        END IF;
        IF request_path <> '/auth/login' THEN
          RAISE EXCEPTION 'Membership auto-resolution is only available on login routes'
            USING ERRCODE = '42501';
        END IF;
        RETURN QUERY
        SELECT
          tm.id,
          tm.tenant_id,
          tm.user_id,
          tm.role_id,
          r.code AS role_code,
          r.name AS role_name,
          tm.status,
          tm.created_at,
          tm.updated_at
        FROM tenant_memberships tm
        INNER JOIN roles r
          ON r.tenant_id = tm.tenant_id
         AND r.id = tm.role_id
        WHERE tm.user_id = input_user_id
          AND tm.status = 'active'
        ORDER BY tm.created_at DESC;
      END;
      $$;
CREATE FUNCTION app.find_daraja_integration_by_id_for_callback(input_integration_id uuid) RETURNS TABLE(id uuid, tenant_id text, integration_type text, paybill_number text, till_number text, shortcode text, consumer_key_ciphertext text, consumer_secret_ciphertext text, passkey_ciphertext text, environment text, callback_url text, is_active boolean, last_test_status text, last_tested_at timestamp with time zone, created_at timestamp with time zone, updated_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'app', 'pg_temp'
    AS $$
      DECLARE
        request_user_id text;
        request_path text;
      BEGIN
        request_user_id := COALESCE(NULLIF(current_setting('app.user_id', true), ''), 'anonymous');
        request_path := COALESCE(NULLIF(current_setting('app.path', true), ''), '');
        IF request_user_id <> 'anonymous' THEN
          RAISE EXCEPTION 'Daraja callback integration lookup is only available before authentication'
            USING ERRCODE = '42501';
        END IF;
        IF request_path NOT LIKE '/payments/mpesa/callback/%'
           AND request_path NOT LIKE '/mpesa/callback/%' THEN
          RAISE EXCEPTION 'Daraja callback integration lookup is only available on callback routes'
            USING ERRCODE = '42501';
        END IF;
        RETURN QUERY
        SELECT
          si.id,
          si.tenant_id,
          si.integration_type,
          si.paybill_number,
          si.till_number,
          si.shortcode,
          si.consumer_key_ciphertext,
          si.consumer_secret_ciphertext,
          si.passkey_ciphertext,
          si.environment,
          si.callback_url,
          si.is_active,
          si.last_test_status,
          si.last_tested_at,
          si.created_at,
          si.updated_at
        FROM school_integrations si
        WHERE si.id = input_integration_id
          AND si.integration_type = 'mpesa_daraja'
        LIMIT 1;
      END;
      $$;
CREATE FUNCTION app.find_linked_parent_auth_subject(input_tenant_id text, input_admission_number text, input_phone_hash text) RETURNS TABLE(user_id uuid, tenant_id text, role_id uuid, role_code text, email text, display_name text, phone_number_hash text, phone_number_last4 text, force_password_change boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'app', 'pg_temp'
    AS $$
      DECLARE
        request_user_id text;
        request_path text;
      BEGIN
        request_user_id := COALESCE(NULLIF(current_setting('app.user_id', true), ''), 'anonymous');
        request_path := COALESCE(NULLIF(current_setting('app.path', true), ''), '');
        IF request_user_id <> 'anonymous'
           OR request_path NOT IN ('/auth/parent/otp/request', '/auth/parent/otp/verify') THEN
          RAISE EXCEPTION 'Linked parent lookup is only available on parent OTP routes'
            USING ERRCODE = '42501';
        END IF;
        RETURN QUERY
        WITH matches AS (
          SELECT
            parent_user.id AS user_id,
            student.tenant_id,
            membership.role_id,
            role.code AS role_code,
            parent_user.email::text,
            parent_user.display_name,
            parent_user.phone_number_hash,
            parent_user.phone_number_last4,
            (parent_user.password_changed_at IS NULL) AS force_password_change,
            link.created_at
          FROM students student
          INNER JOIN student_guardians link
            ON link.tenant_id = student.tenant_id
           AND link.student_id = student.id
           AND link.status = 'active'
          INNER JOIN users parent_user
            ON parent_user.id = link.user_id
           AND parent_user.status = 'active'
          INNER JOIN tenant_memberships membership
            ON membership.tenant_id = student.tenant_id
           AND membership.user_id = parent_user.id
           AND membership.status = 'active'
          INNER JOIN roles role
            ON role.tenant_id = membership.tenant_id
           AND role.id = membership.role_id
           AND role.code = 'parent'
          WHERE student.status = 'active'
            AND lower(student.admission_number) = lower(btrim(input_admission_number))
            AND parent_user.phone_number_hash = input_phone_hash
            AND (input_tenant_id IS NULL OR student.tenant_id = input_tenant_id)
        )
        SELECT
          match.user_id,
          match.tenant_id,
          match.role_id,
          match.role_code,
          match.email,
          match.display_name,
          match.phone_number_hash,
          match.phone_number_last4,
          match.force_password_change
        FROM matches match
        WHERE input_tenant_id IS NOT NULL
           OR (SELECT COUNT(*) FROM matches) = 1
        ORDER BY match.created_at DESC
        LIMIT 1;
      END;
      $$;
CREATE FUNCTION app.find_linked_parent_password_auth_subject(input_tenant_id text, input_admission_number text) RETURNS TABLE(user_id uuid, tenant_id text, role_id uuid, role_code text, email text, display_name text, phone_number_hash text, phone_number_last4 text, password_hash text, force_password_change boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'app', 'pg_temp'
    AS $$
      DECLARE
        request_user_id text;
        request_path text;
      BEGIN
        request_user_id := COALESCE(NULLIF(current_setting('app.user_id', true), ''), 'anonymous');
        request_path := COALESCE(NULLIF(current_setting('app.path', true), ''), '');
        IF request_user_id <> 'anonymous' OR request_path <> '/auth/parent/login' THEN
          RAISE EXCEPTION 'Linked parent password lookup is only available on the parent login route'
            USING ERRCODE = '42501';
        END IF;
        RETURN QUERY
        WITH matches AS (
          SELECT
            parent_user.id AS user_id,
            student.tenant_id,
            membership.role_id,
            role.code AS role_code,
            parent_user.email::text,
            parent_user.display_name,
            parent_user.phone_number_hash,
            parent_user.phone_number_last4,
            parent_user.password_hash,
            (parent_user.password_changed_at IS NULL) AS force_password_change,
            link.created_at
          FROM students student
          INNER JOIN student_guardians link
            ON link.tenant_id = student.tenant_id
           AND link.student_id = student.id
           AND link.status = 'active'
          INNER JOIN users parent_user
            ON parent_user.id = link.user_id
           AND parent_user.status = 'active'
          INNER JOIN tenant_memberships membership
            ON membership.tenant_id = student.tenant_id
           AND membership.user_id = parent_user.id
           AND membership.status = 'active'
          INNER JOIN roles role
            ON role.tenant_id = membership.tenant_id
           AND role.id = membership.role_id
           AND role.code = 'parent'
          WHERE student.status = 'active'
            AND lower(student.admission_number) = lower(btrim(input_admission_number))
            AND (input_tenant_id IS NULL OR student.tenant_id = input_tenant_id)
        )
        SELECT
          match.user_id,
          match.tenant_id,
          match.role_id,
          match.role_code,
          match.email,
          match.display_name,
          match.phone_number_hash,
          match.phone_number_last4,
          match.password_hash,
          match.force_password_change
        FROM matches match
        WHERE input_tenant_id IS NOT NULL
           OR (SELECT COUNT(*) FROM matches) = 1
        ORDER BY match.created_at DESC
        LIMIT 1;
      END;
      $$;
CREATE FUNCTION app.find_parent_auth_subject_for_otp(input_identifier text, input_phone_hash text) RETURNS TABLE(user_id uuid, tenant_id text, role_id uuid, role_code text, email text, display_name text, phone_number_hash text, phone_number_last4 text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'app', 'pg_temp'
    AS $$
      DECLARE
        request_user_id text;
        request_path text;
      BEGIN
        request_user_id := COALESCE(NULLIF(current_setting('app.user_id', true), ''), 'anonymous');
        request_path := COALESCE(NULLIF(current_setting('app.path', true), ''), '');
        IF request_user_id <> 'anonymous' THEN
          RAISE EXCEPTION 'Parent OTP lookup is only available before authentication'
            USING ERRCODE = '42501';
        END IF;
        IF request_path NOT IN ('/auth/parent/otp/request', '/auth/parent/otp/verify') THEN
          RAISE EXCEPTION 'Parent OTP lookup is only available on parent OTP routes'
            USING ERRCODE = '42501';
        END IF;
        RETURN QUERY
        SELECT
          u.id AS user_id,
          tm.tenant_id,
          tm.role_id,
          r.code AS role_code,
          u.email::text,
          u.display_name,
          u.phone_number_hash,
          u.phone_number_last4
        FROM users u
        INNER JOIN tenant_memberships tm
          ON tm.user_id = u.id
         AND tm.status = 'active'
        INNER JOIN roles r
          ON r.tenant_id = tm.tenant_id
         AND r.id = tm.role_id
         AND r.code = 'parent'
        WHERE u.status = 'active'
          AND (
            lower(u.email::text) = lower(input_identifier)
            OR (
              input_phone_hash IS NOT NULL
              AND u.phone_number_hash = input_phone_hash
            )
          )
        ORDER BY tm.created_at DESC
        LIMIT 1;
      END;
      $$;
CREATE FUNCTION app.find_parent_otp_challenge_for_verify(input_challenge_id uuid) RETURNS TABLE(id uuid, tenant_id text, user_id uuid, email text, phone_hash text, phone_last4 text, otp_hash text, purpose text, expires_at timestamp with time zone, consumed_at timestamp with time zone, attempts integer)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'app', 'pg_temp'
    AS $$
      DECLARE
        request_user_id text;
        request_path text;
      BEGIN
        request_user_id := COALESCE(NULLIF(current_setting('app.user_id', true), ''), 'anonymous');
        request_path := COALESCE(NULLIF(current_setting('app.path', true), ''), '');
        IF request_user_id <> 'anonymous' THEN
          RAISE EXCEPTION 'Parent OTP verification is only available before authentication'
            USING ERRCODE = '42501';
        END IF;
        IF request_path NOT IN ('/auth/parent/otp/verify', '/auth/student/otp/verify') THEN
          RAISE EXCEPTION 'OTP verification is only available on portal OTP verify routes'
            USING ERRCODE = '42501';
        END IF;
        RETURN QUERY
        SELECT
          c.id,
          c.tenant_id,
          c.user_id,
          c.email,
          c.phone_hash,
          c.phone_last4,
          c.otp_hash,
          c.purpose,
          c.expires_at,
          c.consumed_at,
          c.attempts
        FROM parent_otp_challenges c
        WHERE c.id = input_challenge_id
        LIMIT 1;
      END;
      $$;
CREATE FUNCTION app.find_platform_owner_by_email_for_auth(input_email text) RETURNS TABLE(id uuid, tenant_id text, email text, password_hash text, display_name text, status text, email_verified_at timestamp with time zone, mfa_enabled boolean, mfa_verified_at timestamp with time zone, created_at timestamp with time zone, updated_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'app', 'pg_temp'
    AS $$
      DECLARE
        request_user_id text;
        request_path text;
      BEGIN
        request_user_id := COALESCE(NULLIF(current_setting('app.user_id', true), ''), 'anonymous');
        request_path := COALESCE(NULLIF(current_setting('app.path', true), ''), '');
        IF request_user_id <> 'anonymous' THEN
          RAISE EXCEPTION 'Platform owner lookup is only available before authentication'
            USING ERRCODE = '42501';
        END IF;
        IF request_path <> '/auth/login' THEN
          RAISE EXCEPTION 'Platform owner lookup is only available on login routes'
            USING ERRCODE = '42501';
        END IF;
        RETURN QUERY
        SELECT
          u.id,
          u.tenant_id,
          u.email,
          u.password_hash,
          u.display_name,
          u.status,
          u.email_verified_at,
          u.mfa_enabled,
          u.mfa_verified_at,
          u.created_at,
          u.updated_at
        FROM users u
        WHERE lower(u.email) = lower(input_email)
          AND u.tenant_id = 'global'
          AND u.user_type = 'platform_owner'
        LIMIT 1;
      END;
      $$;
CREATE FUNCTION app.find_platform_owner_by_id_for_auth(input_user_id uuid) RETURNS TABLE(id uuid, tenant_id text, email text, password_hash text, display_name text, status text, email_verified_at timestamp with time zone, mfa_enabled boolean, mfa_verified_at timestamp with time zone, created_at timestamp with time zone, updated_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'app', 'pg_temp'
    AS $$
      DECLARE
        request_path text;
      BEGIN
        request_path := COALESCE(NULLIF(current_setting('app.path', true), ''), '');
        IF request_path NOT IN ('/auth/refresh', '/auth/me') THEN
          RAISE EXCEPTION 'Platform owner lookup is only available on authenticated auth routes'
            USING ERRCODE = '42501';
        END IF;
        RETURN QUERY
        SELECT
          u.id,
          u.tenant_id,
          u.email,
          u.password_hash,
          u.display_name,
          u.status,
          u.email_verified_at,
          u.mfa_enabled,
          u.mfa_verified_at,
          u.created_at,
          u.updated_at
        FROM users u
        WHERE u.id = input_user_id
          AND u.tenant_id = 'global'
          AND u.user_type = 'platform_owner'
        LIMIT 1;
      END;
      $$;
CREATE FUNCTION app.find_student_auth_subject_for_otp(input_tenant_id text, input_username text, input_phone_hash text) RETURNS TABLE(user_id uuid, tenant_id text, role_id uuid, role_code text, email text, display_name text, phone_number_hash text, phone_number_last4 text, force_password_change boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'app', 'pg_temp'
    AS $$
      DECLARE
        request_user_id text;
        request_path text;
      BEGIN
        request_user_id := COALESCE(NULLIF(current_setting('app.user_id', true), ''), 'anonymous');
        request_path := COALESCE(NULLIF(current_setting('app.path', true), ''), '');
        IF request_user_id <> 'anonymous' THEN
          RAISE EXCEPTION 'Student OTP lookup is only available before authentication'
            USING ERRCODE = '42501';
        END IF;
        IF request_path NOT IN ('/auth/student/otp/request', '/auth/student/otp/verify') THEN
          RAISE EXCEPTION 'Student OTP lookup is only available on student OTP routes'
            USING ERRCODE = '42501';
        END IF;
        RETURN QUERY
        WITH matches AS (
          SELECT
            u.id AS user_id,
            access.tenant_id,
            membership.role_id,
            role.code AS role_code,
            u.email::text,
            u.display_name,
            u.phone_number_hash,
            u.phone_number_last4,
            access.force_password_change,
            access.created_at
          FROM student_portal_access access
          INNER JOIN users u
            ON u.id = access.user_id
           AND u.status = 'active'
          INNER JOIN tenant_memberships membership
            ON membership.tenant_id = access.tenant_id
           AND membership.user_id = access.user_id
           AND membership.status = 'active'
          INNER JOIN roles role
            ON role.tenant_id = membership.tenant_id
           AND role.id = membership.role_id
           AND role.code = 'student'
          WHERE access.status = 'active'
            AND lower(access.username) = lower(btrim(input_username))
            AND access.guardian_phone_hash = input_phone_hash
            AND (input_tenant_id IS NULL OR access.tenant_id = input_tenant_id)
        )
        SELECT
          match.user_id,
          match.tenant_id,
          match.role_id,
          match.role_code,
          match.email,
          match.display_name,
          match.phone_number_hash,
          match.phone_number_last4,
          match.force_password_change
        FROM matches match
        WHERE input_tenant_id IS NOT NULL
           OR (SELECT COUNT(*) FROM matches) = 1
        ORDER BY match.created_at DESC
        LIMIT 1;
      END;
      $$;
CREATE FUNCTION app.find_student_auth_subject_for_password(input_tenant_id text, input_username text) RETURNS TABLE(user_id uuid, tenant_id text, role_id uuid, role_code text, email text, display_name text, phone_number_hash text, phone_number_last4 text, password_hash text, force_password_change boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'app', 'pg_temp'
    AS $$
      DECLARE
        request_user_id text;
        request_path text;
      BEGIN
        request_user_id := COALESCE(NULLIF(current_setting('app.user_id', true), ''), 'anonymous');
        request_path := COALESCE(NULLIF(current_setting('app.path', true), ''), '');
        IF request_user_id <> 'anonymous' OR request_path <> '/auth/student/login' THEN
          RAISE EXCEPTION 'Student password lookup is only available on the student login route'
            USING ERRCODE = '42501';
        END IF;
        RETURN QUERY
        WITH matches AS (
          SELECT
            u.id AS user_id,
            access.tenant_id,
            membership.role_id,
            role.code AS role_code,
            u.email::text,
            u.display_name,
            u.phone_number_hash,
            u.phone_number_last4,
            u.password_hash,
            access.force_password_change,
            access.created_at
          FROM student_portal_access access
          INNER JOIN users u
            ON u.id = access.user_id
           AND u.status = 'active'
          INNER JOIN tenant_memberships membership
            ON membership.tenant_id = access.tenant_id
           AND membership.user_id = access.user_id
           AND membership.status = 'active'
          INNER JOIN roles role
            ON role.tenant_id = membership.tenant_id
           AND role.id = membership.role_id
           AND role.code = 'student'
          WHERE access.status = 'active'
            AND lower(access.username) = lower(btrim(input_username))
            AND (input_tenant_id IS NULL OR access.tenant_id = input_tenant_id)
        )
        SELECT
          match.user_id,
          match.tenant_id,
          match.role_id,
          match.role_code,
          match.email,
          match.display_name,
          match.phone_number_hash,
          match.phone_number_last4,
          match.password_hash,
          match.force_password_change
        FROM matches match
        WHERE input_tenant_id IS NOT NULL
           OR (SELECT COUNT(*) FROM matches) = 1
        ORDER BY match.created_at DESC
        LIMIT 1;
      END;
      $$;
CREATE FUNCTION app.find_user_by_email_for_auth(input_email text) RETURNS TABLE(id uuid, tenant_id text, email text, password_hash text, display_name text, status text, email_verified_at timestamp with time zone, mfa_enabled boolean, mfa_verified_at timestamp with time zone, created_at timestamp with time zone, updated_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'app', 'pg_temp'
    AS $$
      DECLARE
        request_user_id text;
        request_path text;
      BEGIN
        request_user_id := COALESCE(NULLIF(current_setting('app.user_id', true), ''), 'anonymous');
        request_path := COALESCE(NULLIF(current_setting('app.path', true), ''), '');
        IF request_user_id <> 'anonymous' THEN
          RAISE EXCEPTION 'Auth user lookup is only available before authentication'
            USING ERRCODE = '42501';
        END IF;
        IF request_path <> '/auth/login' THEN
          RAISE EXCEPTION 'Auth user lookup is only available on login routes'
            USING ERRCODE = '42501';
        END IF;
        RETURN QUERY
        SELECT
          u.id,
          u.tenant_id,
          u.email,
          u.password_hash,
          u.display_name,
          u.status,
          u.email_verified_at,
          u.mfa_enabled,
          u.mfa_verified_at,
          u.created_at,
          u.updated_at
        FROM users u
        WHERE lower(u.email) = lower(input_email)
        LIMIT 1;
      END;
      $$;
CREATE FUNCTION app.find_user_for_password_recovery(input_email text, input_audience text, input_tenant_id text, input_system_owner_email text) RETURNS TABLE(id uuid, tenant_id text, email text, display_name text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'app', 'pg_temp'
    AS $$
      DECLARE
        request_user_id text;
        request_path text;
        normalized_email text;
      BEGIN
        request_user_id := COALESCE(NULLIF(current_setting('app.user_id', true), ''), 'anonymous');
        request_path := COALESCE(NULLIF(current_setting('app.path', true), ''), '');
        normalized_email := lower(input_email);
        IF request_user_id <> 'anonymous' THEN
          RAISE EXCEPTION 'Password recovery is only available before authentication'
            USING ERRCODE = '42501';
        END IF;
        IF request_path NOT LIKE '%/auth/password-recovery/request%' THEN
          RAISE EXCEPTION 'Password recovery lookup is only available on recovery routes'
            USING ERRCODE = '42501';
        END IF;
        IF input_audience = 'superadmin' THEN
          IF input_system_owner_email IS NULL
            OR length(input_system_owner_email) = 0
            OR normalized_email <> lower(input_system_owner_email)
          THEN
            RETURN;
          END IF;
          RETURN QUERY
          SELECT u.id, u.tenant_id, u.email, u.display_name
          FROM users u
          WHERE lower(u.email) = normalized_email
            AND u.tenant_id = 'global'
            AND u.user_type = 'platform_owner'
            AND u.status = 'active'
          LIMIT 1;
          RETURN;
        END IF;
        IF input_tenant_id IS NOT NULL AND length(input_tenant_id) > 0 THEN
          RETURN QUERY
          SELECT u.id, u.tenant_id, u.email, u.display_name
          FROM users u
          WHERE lower(u.email) = normalized_email
            AND u.tenant_id = input_tenant_id
            AND u.status = 'active'
          LIMIT 1;
          IF FOUND THEN
            RETURN;
          END IF;
        END IF;
        RETURN QUERY
        WITH matching_recovery_users AS (
          SELECT u.id, u.tenant_id, u.email, u.display_name
          FROM users u
          WHERE lower(u.email) = normalized_email
            AND u.tenant_id <> 'global'
            AND u.status = 'active'
        )
        SELECT
          matching_recovery_users.id,
          matching_recovery_users.tenant_id,
          matching_recovery_users.email,
          matching_recovery_users.display_name
        FROM matching_recovery_users
        WHERE (SELECT count(*) FROM matching_recovery_users) = 1
        LIMIT 1;
      END;
      $$;
CREATE FUNCTION app.mark_auth_email_outbox_delivery(input_outbox_id uuid, input_status text, input_error_code text DEFAULT NULL::text, input_error_summary text DEFAULT NULL::text, input_provider_status_code integer DEFAULT NULL::integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'app', 'pg_temp'
    AS $$
      DECLARE
        request_path text;
      BEGIN
        request_path := COALESCE(NULLIF(current_setting('app.path', true), ''), '');
        IF request_path NOT LIKE '%/auth/password-recovery/request%'
          AND request_path NOT LIKE '%/auth/email-verification/request%'
          AND request_path NOT LIKE '%/auth/invitations%'
          AND request_path NOT LIKE '%/platform/schools%'
        THEN
          RAISE EXCEPTION 'Email outbox delivery status can only be updated by auth email routes'
            USING ERRCODE = '42501';
        END IF;
        IF input_status NOT IN ('sent', 'failed') THEN
          RAISE EXCEPTION 'Unsupported email outbox status'
            USING ERRCODE = '22023';
        END IF;
        IF input_provider_status_code IS NOT NULL
          AND (input_provider_status_code < 100 OR input_provider_status_code > 599)
        THEN
          RAISE EXCEPTION 'Unsupported email provider status code'
            USING ERRCODE = '22023';
        END IF;
        PERFORM set_config('app.auth_email_outbox_operation', 'mark_delivery', true);
        UPDATE auth_email_outbox
        SET
          status = input_status,
          attempts = attempts + 1,
          sent_at = CASE WHEN input_status = 'sent' THEN NOW() ELSE sent_at END,
          last_error_code = CASE
            WHEN input_status = 'sent' THEN NULL
            ELSE NULLIF(input_error_code, '')
          END,
          last_error_summary = CASE
            WHEN input_status = 'sent' THEN NULL
            ELSE NULLIF(input_error_summary, '')
          END,
          provider_status_code = CASE
            WHEN input_status = 'sent' THEN NULL
            ELSE input_provider_status_code
          END,
          last_attempt_at = NOW(),
          next_attempt_at = CASE
            WHEN input_status = 'failed' THEN NOW() + INTERVAL '10 minutes'
            ELSE next_attempt_at
          END
        WHERE id = input_outbox_id;
        PERFORM set_config('app.auth_email_outbox_operation', '', true);
      END;
      $$;
CREATE FUNCTION app.prevent_append_only_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        RAISE EXCEPTION 'append-only table "%" cannot be %', TG_TABLE_NAME, lower(TG_OP)
          USING ERRCODE = '55000';
      END;
      $$;
CREATE FUNCTION app.prevent_discipline_audit_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        RAISE EXCEPTION 'discipline audit table "%" cannot be %', TG_TABLE_NAME, lower(TG_OP)
          USING ERRCODE = '55000';
      END;
      $$;
CREATE FUNCTION app.validate_financial_transaction_balance() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      DECLARE
        target_tenant_id text;
        target_transaction_id uuid;
        entry_count integer;
        debit_total bigint;
        credit_total bigint;
        currency_count integer;
      BEGIN
        target_tenant_id := COALESCE(NEW.tenant_id, OLD.tenant_id);
        IF TG_TABLE_NAME = 'transactions' THEN
          RETURN NULL;
        END IF;
        target_transaction_id := COALESCE(NEW.transaction_id, OLD.transaction_id);
        SELECT
          COUNT(*)::integer,
          COALESCE(SUM(CASE WHEN lower(direction::text) = 'debit' THEN amount_minor ELSE 0 END), 0)::bigint,
          COALESCE(SUM(CASE WHEN lower(direction::text) = 'credit' THEN amount_minor ELSE 0 END), 0)::bigint,
          COUNT(DISTINCT currency_code)::integer
        INTO entry_count, debit_total, credit_total, currency_count
        FROM ledger_entries
        WHERE tenant_id = target_tenant_id
          AND transaction_id = target_transaction_id;
        IF entry_count < 2 THEN
          RAISE EXCEPTION 'financial transaction "%" must have at least two ledger entries', target_transaction_id
            USING ERRCODE = '23514';
        END IF;
        IF currency_count <> 1 THEN
          RAISE EXCEPTION 'financial transaction "%" must use exactly one currency', target_transaction_id
            USING ERRCODE = '23514';
        END IF;
        IF debit_total <> credit_total THEN
          RAISE EXCEPTION 'financial transaction "%" is unbalanced: debits (%) do not equal credits (%)',
            target_transaction_id, debit_total, credit_total
            USING ERRCODE = '23514';
        END IF;
        RETURN NULL;
      END;
      $$;
CREATE FUNCTION public.prevent_clinic_stock_movement_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        RAISE EXCEPTION 'clinic stock movements are append-only and cannot be %', lower(TG_OP)
          USING ERRCODE = '55000';
      END;
      $$;
CREATE FUNCTION public.prevent_inventory_movement_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        RAISE EXCEPTION 'inventory stock movements are append-only and cannot be %', lower(TG_OP)
          USING ERRCODE = '55000';
      END;
      $$;
CREATE FUNCTION public.prevent_library_ledger_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        RAISE EXCEPTION 'library circulation ledger is append-only';
      END;
      $$;
CREATE FUNCTION public.prevent_report_snapshot_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        RAISE EXCEPTION 'report snapshots are immutable and cannot be %', lower(TG_OP)
          USING ERRCODE = '55000';
      END;
      $$;
CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$;
CREATE FUNCTION public.sync_event_school_columns() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        NEW.tenant_id = COALESCE(NULLIF(NEW.tenant_id::text, ''), NULLIF(NEW.school_id, ''));
        NEW.school_id = NEW.tenant_id::text;
        RETURN NEW;
      END;
      $$;
CREATE FUNCTION public.sync_student_tenant_columns() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        NEW.tenant_id = COALESCE(NULLIF(NEW.tenant_id, ''), NULLIF(NEW.school_id, ''));
        NEW.school_id = COALESCE(NULLIF(NEW.school_id, ''), NULLIF(NEW.tenant_id, ''));
        NEW.student_status = COALESCE(NEW.student_status, upper(COALESCE(NULLIF(NEW.status, ''), 'active'))::"StudentStatus");
        NEW.status = lower(COALESCE(NULLIF(NEW.status, ''), NEW.student_status::text, 'active'));
        RETURN NEW;
      END;
      $$;
CREATE FUNCTION public.validate_admissions_class_section_reference() RETURNS trigger
    LANGUAGE plpgsql
    AS $_$
      DECLARE
        referenced_section_id text;
        section_exists boolean := FALSE;
      BEGIN
        referenced_section_id := CASE
          WHEN TG_TABLE_NAME = 'student_academic_enrollments'
            THEN to_jsonb(NEW) ->> 'class_section_id'
          ELSE to_jsonb(NEW) ->> 'to_class_section_id'
        END;
        IF referenced_section_id IS NULL THEN
          RETURN NEW;
        END IF;
        IF to_regclass('public.class_sections') IS NOT NULL THEN
          EXECUTE '
            SELECT EXISTS (
              SELECT 1
              FROM public.class_sections section
              WHERE section.tenant_id = $1
                AND section.id::text = $2
            )
          '
          INTO section_exists
          USING NEW.tenant_id, referenced_section_id;
        END IF;
        IF NOT section_exists THEN
          SELECT EXISTS (
            SELECT 1
            FROM academic_class_sections legacy_section
            WHERE legacy_section.tenant_id = NEW.tenant_id
              AND legacy_section.id::text = referenced_section_id
          )
          INTO section_exists;
        END IF;
        IF NOT section_exists THEN
          RAISE EXCEPTION 'Class section % is not owned by tenant %', referenced_section_id, NEW.tenant_id
            USING ERRCODE = '23503';
        END IF;
        RETURN NEW;
      END;
      $_$;
SET default_tablespace = '';
SET default_table_access_method = heap;
CREATE TABLE public.academic_audit_logs (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    school_id text NOT NULL,
    entity_type text NOT NULL,
    entity_id text,
    action text NOT NULL,
    actor_user_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    actor_role text,
    previous_values jsonb,
    new_values jsonb,
    reason text,
    effective_at timestamp with time zone,
    correlation_id text
);
ALTER TABLE ONLY public.academic_audit_logs FORCE ROW LEVEL SECURITY;
CREATE TABLE public.academic_class_sections (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    tenant_id text NOT NULL,
    class_name text NOT NULL,
    stream_name text NOT NULL,
    academic_year text NOT NULL,
    capacity integer,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_academic_class_sections_capacity CHECK (((capacity IS NULL) OR (capacity > 0))),
    CONSTRAINT ck_academic_class_sections_class_not_blank CHECK ((btrim(class_name) <> ''::text)),
    CONSTRAINT ck_academic_class_sections_stream_not_blank CHECK ((btrim(stream_name) <> ''::text)),
    CONSTRAINT ck_academic_class_sections_year_not_blank CHECK ((btrim(academic_year) <> ''::text))
);
ALTER TABLE ONLY public.academic_class_sections FORCE ROW LEVEL SECURITY;
CREATE TABLE public.academic_intervention_updates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    intervention_id uuid NOT NULL,
    update_type text DEFAULT 'progress'::text NOT NULL,
    notes text NOT NULL,
    score numeric(8,2),
    score_status text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    recorded_by_user_id uuid NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_academic_intervention_updates_score CHECK (((score IS NULL) OR (score >= (0)::numeric))),
    CONSTRAINT ck_academic_intervention_updates_score_evidence CHECK ((((score_status IS NULL) AND (score IS NULL)) OR ((score_status = 'entered'::text) AND (score IS NOT NULL)) OR ((score_status <> 'entered'::text) AND (score IS NULL)))),
    CONSTRAINT ck_academic_intervention_updates_score_status CHECK (((score_status IS NULL) OR (score_status = ANY (ARRAY['entered'::text, 'absent'::text, 'exempt'::text, 'not_assessed'::text, 'incomplete'::text, 'withheld'::text, 'medical_exception'::text, 'transfer_student'::text])))),
    CONSTRAINT ck_academic_intervention_updates_type CHECK ((update_type = ANY (ARRAY['progress'::text, 'assessment'::text, 'reassessment'::text, 'note'::text, 'status_change'::text])))
);
ALTER TABLE ONLY public.academic_intervention_updates FORCE ROW LEVEL SECURITY;
CREATE TABLE public.academic_interventions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    student_id text,
    exam_series_id uuid,
    subject_id text,
    class_section_id text,
    scope_type text DEFAULT 'student'::text NOT NULL,
    source text DEFAULT 'manual'::text NOT NULL,
    trigger_reason text NOT NULL,
    baseline jsonb DEFAULT '{}'::jsonb NOT NULL,
    plan text NOT NULL,
    target jsonb DEFAULT '{}'::jsonb NOT NULL,
    owner_user_id uuid,
    hod_user_id uuid,
    priority text DEFAULT 'normal'::text NOT NULL,
    status text DEFAULT 'planned'::text NOT NULL,
    starts_on date,
    due_on date,
    completed_at timestamp with time zone,
    outcome jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by_user_id uuid NOT NULL,
    updated_by_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_academic_interventions_dates CHECK (((due_on IS NULL) OR (starts_on IS NULL) OR (due_on >= starts_on))),
    CONSTRAINT ck_academic_interventions_priority CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text]))),
    CONSTRAINT ck_academic_interventions_scope CHECK (((student_id IS NOT NULL) OR (class_section_id IS NOT NULL) OR (subject_id IS NOT NULL))),
    CONSTRAINT ck_academic_interventions_scope_type CHECK ((scope_type = ANY (ARRAY['student'::text, 'class'::text, 'subject'::text, 'class_subject'::text]))),
    CONSTRAINT ck_academic_interventions_source CHECK ((source = ANY (ARRAY['manual'::text, 'analytics'::text, 'moderation'::text, 'attendance'::text, 'reassessment'::text]))),
    CONSTRAINT ck_academic_interventions_status CHECK ((status = ANY (ARRAY['planned'::text, 'active'::text, 'monitoring'::text, 'completed'::text, 'cancelled'::text])))
);
ALTER TABLE ONLY public.academic_interventions FORCE ROW LEVEL SECURITY;
CREATE TABLE public.academic_levels (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    school_id text,
    system_type text NOT NULL,
    name text NOT NULL,
    order_index integer NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    audit_log_reference uuid,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    CONSTRAINT ck_academic_levels_system CHECK ((system_type = ANY (ARRAY['CBC'::text, 'CBE'::text, '8-4-4'::text, 'International'::text, 'Hybrid'::text, 'Custom'::text])))
);
ALTER TABLE ONLY public.academic_levels FORCE ROW LEVEL SECURITY;
CREATE TABLE public.academic_subject_offerings (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    tenant_id text NOT NULL,
    class_section_id text NOT NULL,
    subject_code text NOT NULL,
    subject_name text NOT NULL,
    teacher_user_id uuid,
    is_compulsory boolean DEFAULT true NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_academic_subject_offerings_code_not_blank CHECK ((btrim(subject_code) <> ''::text)),
    CONSTRAINT ck_academic_subject_offerings_name_not_blank CHECK ((btrim(subject_name) <> ''::text))
);
ALTER TABLE ONLY public.academic_subject_offerings FORCE ROW LEVEL SECURITY;
CREATE TABLE public.academic_terms (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    tenant_id text NOT NULL,
    academic_year_id text NOT NULL,
    name text NOT NULL,
    starts_on date NOT NULL,
    ends_on date NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    created_by_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    is_current boolean DEFAULT false NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    archived_at timestamp with time zone,
    archived_by_user_id uuid,
    CONSTRAINT ck_academic_terms_range CHECK ((ends_on >= starts_on)),
    CONSTRAINT ck_academic_terms_status CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'closed'::text, 'inactive'::text, 'archived'::text])))
);
ALTER TABLE ONLY public.academic_terms FORCE ROW LEVEL SECURITY;
CREATE TABLE public.academic_timetable_slots (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    tenant_id text NOT NULL,
    class_section_id text NOT NULL,
    subject_offering_id text,
    day_of_week text NOT NULL,
    starts_at text NOT NULL,
    ends_at text NOT NULL,
    subject_name text NOT NULL,
    room_name text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_academic_timetable_slots_day CHECK ((day_of_week = ANY (ARRAY['Monday'::text, 'Tuesday'::text, 'Wednesday'::text, 'Thursday'::text, 'Friday'::text, 'Saturday'::text, 'Sunday'::text]))),
    CONSTRAINT ck_academic_timetable_slots_end CHECK ((ends_at ~ '^[0-2][0-9]:[0-5][0-9]$'::text)),
    CONSTRAINT ck_academic_timetable_slots_start CHECK ((starts_at ~ '^[0-2][0-9]:[0-5][0-9]$'::text)),
    CONSTRAINT ck_academic_timetable_slots_subject_not_blank CHECK ((btrim(subject_name) <> ''::text))
);
ALTER TABLE ONLY public.academic_timetable_slots FORCE ROW LEVEL SECURITY;
CREATE TABLE public.academic_years (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    school_id text,
    name text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp(3) without time zone,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    starts_on date NOT NULL,
    ends_on date NOT NULL,
    created_by_user_id uuid,
    version integer DEFAULT 1 NOT NULL,
    is_current boolean DEFAULT false NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    archived_at timestamp with time zone,
    archived_by_user_id uuid,
    CONSTRAINT ck_academic_years_status CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'closed'::text, 'inactive'::text, 'archived'::text])))
);
ALTER TABLE ONLY public.academic_years FORCE ROW LEVEL SECURITY;
CREATE TABLE public.academics_assignment_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    assignment_id uuid NOT NULL,
    student_id text NOT NULL,
    status text DEFAULT 'submitted'::text NOT NULL,
    submitted_by_user_id uuid,
    submitted_at timestamp with time zone,
    completed_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_academics_assignment_submission_status CHECK ((status = ANY (ARRAY['draft'::text, 'submitted'::text, 'completed'::text, 'returned'::text, 'graded'::text]))),
    CONSTRAINT ck_academics_assignment_submission_tenant CHECK ((tenant_id <> 'global'::text))
);
ALTER TABLE ONLY public.academics_assignment_submissions FORCE ROW LEVEL SECURITY;
CREATE TABLE public.academics_assignments (
    id text NOT NULL,
    school_id text NOT NULL,
    title text NOT NULL,
    description text,
    due_date timestamp(3) without time zone,
    class_section_id text,
    subject_id text NOT NULL,
    teacher_user_id uuid NOT NULL,
    status text DEFAULT 'Draft'::text NOT NULL,
    created_by_user_id uuid,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.academics_attendance (
    attendance_date text NOT NULL,
    class_id uuid NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    status text NOT NULL,
    student_id uuid NOT NULL,
    submitted_by text NOT NULL,
    tenant_id uuid NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.academics_attendance_settings (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    school_id text NOT NULL,
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    configuration jsonb DEFAULT '{}'::jsonb NOT NULL,
    archived_at timestamp with time zone,
    archived_by_user_id uuid
);
ALTER TABLE ONLY public.academics_attendance_settings FORCE ROW LEVEL SECURITY;
CREATE TABLE public.academics_calendar_periods (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    academic_year_id text NOT NULL,
    academic_term_id text,
    name text NOT NULL,
    period_type text NOT NULL,
    starts_on date NOT NULL,
    ends_on date NOT NULL,
    description text,
    status text DEFAULT 'active'::text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_by_user_id uuid,
    updated_by_user_id uuid,
    archived_at timestamp with time zone,
    archived_by_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    school_id text,
    CONSTRAINT ck_academics_calendar_periods_range CHECK ((ends_on >= starts_on)),
    CONSTRAINT ck_academics_calendar_periods_status CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'closed'::text, 'archived'::text]))),
    CONSTRAINT ck_academics_calendar_periods_type CHECK ((period_type = ANY (ARRAY['reporting'::text, 'exam'::text, 'holiday'::text, 'activity'::text, 'boarding'::text, 'transport'::text, 'other'::text])))
);
ALTER TABLE ONLY public.academics_calendar_periods FORCE ROW LEVEL SECURITY;
CREATE TABLE public.academics_class_teachers (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    school_id text,
    academic_year_id text NOT NULL,
    class_section_id text NOT NULL,
    teacher_user_id uuid NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    tenant_id text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    assignment_type text DEFAULT 'permanent'::text NOT NULL,
    effective_from date DEFAULT CURRENT_DATE NOT NULL,
    effective_to date,
    reason text,
    created_by_user_id uuid,
    ended_by_user_id uuid,
    version integer DEFAULT 1 NOT NULL
);
ALTER TABLE ONLY public.academics_class_teachers FORCE ROW LEVEL SECURITY;
CREATE TABLE public.academics_curriculum_configurations (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    school_id text NOT NULL,
    name text NOT NULL,
    curriculum_model text NOT NULL,
    configuration jsonb DEFAULT '{}'::jsonb NOT NULL,
    effective_from date NOT NULL,
    effective_to date,
    status text DEFAULT 'draft'::text NOT NULL,
    based_on_id text,
    version integer DEFAULT 1 NOT NULL,
    archived_at timestamp with time zone,
    archived_by_user_id uuid,
    created_by_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE ONLY public.academics_curriculum_configurations FORCE ROW LEVEL SECURITY;
CREATE TABLE public.academics_department_hod_appointments (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    tenant_id text NOT NULL,
    school_id text NOT NULL,
    department_id uuid NOT NULL,
    teacher_user_id uuid NOT NULL,
    appointment_type text DEFAULT 'permanent'::text NOT NULL,
    effective_from date DEFAULT CURRENT_DATE NOT NULL,
    effective_to date,
    status text DEFAULT 'active'::text NOT NULL,
    reason text,
    appointed_by_user_id uuid,
    ended_by_user_id uuid,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE ONLY public.academics_department_hod_appointments FORCE ROW LEVEL SECURITY;
CREATE TABLE public.academics_departments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    name text NOT NULL,
    head_of_department_user_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    code text,
    description text,
    archived_at timestamp with time zone,
    archived_by_user_id uuid
);
ALTER TABLE ONLY public.academics_departments FORCE ROW LEVEL SECURITY;
CREATE TABLE public.academics_grading_systems (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    school_id text NOT NULL,
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    rules jsonb DEFAULT '[]'::jsonb NOT NULL,
    effective_from date,
    effective_to date,
    status text DEFAULT 'draft'::text NOT NULL,
    based_on_id text,
    archived_at timestamp with time zone,
    archived_by_user_id uuid
);
ALTER TABLE ONLY public.academics_grading_systems FORCE ROW LEVEL SECURITY;
CREATE TABLE public.academics_lesson_logs (
    id text NOT NULL,
    school_id text NOT NULL,
    topic text NOT NULL,
    notes text,
    date date NOT NULL,
    class_section_id text,
    subject_id text NOT NULL,
    teacher_user_id uuid NOT NULL,
    created_by_user_id uuid,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.academics_report_card_settings (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    school_id text NOT NULL,
    name text NOT NULL,
    grading_system_id uuid,
    show_rank boolean DEFAULT false NOT NULL,
    show_attendance boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    configuration jsonb DEFAULT '{}'::jsonb NOT NULL,
    archived_at timestamp with time zone,
    archived_by_user_id uuid
);
ALTER TABLE ONLY public.academics_report_card_settings FORCE ROW LEVEL SECURITY;
CREATE TABLE public.academics_resources (
    id text NOT NULL,
    school_id text NOT NULL,
    title text NOT NULL,
    url text,
    class_section_id text,
    subject_id text NOT NULL,
    teacher_user_id uuid NOT NULL,
    type text NOT NULL,
    status text DEFAULT 'Draft'::text NOT NULL,
    created_by_user_id uuid,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.academics_role_appointments (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    school_id text NOT NULL,
    role_type text NOT NULL,
    teacher_user_id uuid NOT NULL,
    department_id uuid,
    academic_year_id text,
    class_section_id text,
    stream_id text,
    appointment_type text DEFAULT 'permanent'::text NOT NULL,
    effective_from date DEFAULT CURRENT_DATE NOT NULL,
    effective_to date,
    status text DEFAULT 'active'::text NOT NULL,
    reason text,
    appointed_by_user_id uuid,
    approved_by_user_id uuid,
    ended_by_user_id uuid,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE ONLY public.academics_role_appointments FORCE ROW LEVEL SECURITY;
CREATE TABLE public.accounts (
    id text DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    normal_balance text NOT NULL,
    currency_code text NOT NULL,
    allow_manual_entries boolean DEFAULT true NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_by_user_id text,
    updated_by_user_id text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone,
    CONSTRAINT ck_accounts_category CHECK ((lower(category) = ANY (ARRAY['asset'::text, 'liability'::text, 'equity'::text, 'revenue'::text, 'expense'::text]))),
    CONSTRAINT ck_accounts_normal_balance CHECK ((lower(normal_balance) = ANY (ARRAY['debit'::text, 'credit'::text])))
);
ALTER TABLE ONLY public.accounts FORCE ROW LEVEL SECURITY;
CREATE TABLE public.admin_incidents (
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by text NOT NULL,
    description text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    involved_parties text NOT NULL,
    severity text NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    title text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    school_id text,
    status text DEFAULT 'reported'::text NOT NULL
);
ALTER TABLE ONLY public.admin_incidents FORCE ROW LEVEL SECURITY;
CREATE TABLE public.admission_applications (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    school_id text NOT NULL,
    application_number text NOT NULL,
    first_name text NOT NULL,
    middle_name text,
    last_name text NOT NULL,
    gender text NOT NULL,
    date_of_birth date,
    applying_for_class_id text NOT NULL,
    guardian_name text NOT NULL,
    guardian_phone text NOT NULL,
    guardian_email text,
    guardian_occupation text,
    guardian_relationship text,
    previous_school text,
    application_status public."ApplicationStatus" NOT NULL,
    submitted_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    reviewed_by_user_id text,
    kcpe_results text,
    cbc_level text,
    nemis_upi text,
    allergies text,
    conditions text,
    emergency_contact text,
    birth_certificate_number text,
    nationality text DEFAULT 'Kenyan'::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp(3) without time zone,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    full_name text,
    parent_name text,
    parent_phone text,
    parent_email text,
    parent_occupation text,
    relationship text DEFAULT 'Guardian'::text NOT NULL,
    class_applying text DEFAULT 'Unassigned'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    interview_date date,
    review_notes text,
    approved_at timestamp with time zone,
    admitted_student_id text
);
ALTER TABLE ONLY public.admission_applications FORCE ROW LEVEL SECURITY;
CREATE TABLE public.admission_appointments (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    application_id text,
    visitor_name text NOT NULL,
    purpose text NOT NULL,
    appointment_date date NOT NULL,
    start_time text NOT NULL,
    assigned_user_id uuid,
    status text DEFAULT 'scheduled'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE ONLY public.admission_appointments FORCE ROW LEVEL SECURITY;
CREATE TABLE public.admission_documents (
    id text NOT NULL,
    school_id text NOT NULL,
    application_id text NOT NULL,
    document_type text NOT NULL,
    file_url text NOT NULL,
    status public."DocumentStatus" NOT NULL,
    verified_by_user_id text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    student_id text,
    original_file_name text DEFAULT 'document'::text NOT NULL,
    stored_path text NOT NULL,
    mime_type text DEFAULT 'application/octet-stream'::text NOT NULL,
    size_bytes bigint DEFAULT 0 NOT NULL,
    verification_status text DEFAULT 'pending'::text NOT NULL,
    uploaded_by_user_id uuid,
    verified_at timestamp with time zone
);
ALTER TABLE ONLY public.admission_documents FORCE ROW LEVEL SECURITY;
CREATE TABLE public.admission_drafts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    created_by_user_id uuid NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_admission_drafts_status CHECK ((status = ANY (ARRAY['draft'::text, 'completed'::text, 'discarded'::text])))
);
ALTER TABLE ONLY public.admission_drafts FORCE ROW LEVEL SECURITY;
CREATE TABLE public.admission_enquiries (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    enquiry_code text NOT NULL,
    student_first_name text NOT NULL,
    student_last_name text NOT NULL,
    parent_name text NOT NULL,
    parent_phone text NOT NULL,
    parent_email text,
    class_applying text,
    enquiry_source text,
    boarding_day_preference text,
    current_school text,
    location text,
    notes text,
    follow_up_date date,
    status text DEFAULT 'open'::text NOT NULL,
    created_by_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE ONLY public.admission_enquiries FORCE ROW LEVEL SECURITY;
CREATE TABLE public.admission_interviews (
    id text NOT NULL,
    school_id text NOT NULL,
    application_id text NOT NULL,
    scheduled_at timestamp(3) without time zone NOT NULL,
    interviewer_user_id text NOT NULL,
    score double precision,
    remarks text,
    status text DEFAULT 'scheduled'::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone,
    tenant_id text DEFAULT 'global'::text NOT NULL
);
ALTER TABLE ONLY public.admission_interviews FORCE ROW LEVEL SECURITY;
CREATE TABLE public.admission_offers (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    application_id text NOT NULL,
    offer_status text DEFAULT 'pending'::text NOT NULL,
    required_deposit bigint,
    deposit_paid bigint DEFAULT 0,
    offer_date date DEFAULT CURRENT_DATE NOT NULL,
    deadline_date date,
    finance_cleared boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE ONLY public.admission_offers FORCE ROW LEVEL SECURITY;
CREATE TABLE public.admission_settings (
    tenant_id text NOT NULL,
    admission_number_mode text DEFAULT 'suggested'::text NOT NULL,
    admission_number_prefix text DEFAULT 'ADM'::text NOT NULL,
    admission_number_separator text DEFAULT '-'::text NOT NULL,
    admission_number_padding integer DEFAULT 5 NOT NULL,
    include_academic_year boolean DEFAULT false NOT NULL,
    next_sequence bigint DEFAULT 1 NOT NULL,
    strict_capacity boolean DEFAULT false NOT NULL,
    strict_age_rules boolean DEFAULT false NOT NULL,
    minimum_age integer,
    maximum_age integer,
    minimum_subjects integer,
    maximum_subjects integer,
    updated_by_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_admission_settings_age CHECK ((((minimum_age IS NULL) OR ((minimum_age >= 2) AND (minimum_age <= 30))) AND ((maximum_age IS NULL) OR ((maximum_age >= 2) AND (maximum_age <= 30))) AND ((minimum_age IS NULL) OR (maximum_age IS NULL) OR (minimum_age <= maximum_age)))),
    CONSTRAINT ck_admission_settings_mode CHECK ((admission_number_mode = ANY (ARRAY['manual'::text, 'automatic'::text, 'suggested'::text]))),
    CONSTRAINT ck_admission_settings_padding CHECK (((admission_number_padding >= 3) AND (admission_number_padding <= 12))),
    CONSTRAINT ck_admission_settings_prefix CHECK ((admission_number_prefix ~ '^[A-Za-z0-9]*$'::text)),
    CONSTRAINT ck_admission_settings_separator CHECK ((admission_number_separator = ANY (ARRAY['-'::text, '/'::text, '.'::text, '_'::text]))),
    CONSTRAINT ck_admission_settings_sequence CHECK ((next_sequence > 0)),
    CONSTRAINT ck_admission_settings_subjects CHECK ((((minimum_subjects IS NULL) OR ((minimum_subjects >= 1) AND (minimum_subjects <= 40))) AND ((maximum_subjects IS NULL) OR ((maximum_subjects >= 1) AND (maximum_subjects <= 40))) AND ((minimum_subjects IS NULL) OR (maximum_subjects IS NULL) OR (minimum_subjects <= maximum_subjects))))
);
ALTER TABLE ONLY public.admission_settings FORCE ROW LEVEL SECURITY;
CREATE TABLE public.admission_tasks (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    application_id text,
    task_title text NOT NULL,
    task_description text,
    due_date date,
    priority text DEFAULT 'medium'::text NOT NULL,
    assigned_user_id uuid,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE ONLY public.admission_tasks FORCE ROW LEVEL SECURITY;
CREATE TABLE public.admission_templates (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    template_name text NOT NULL,
    template_type text NOT NULL,
    content text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE ONLY public.admission_templates FORCE ROW LEVEL SECURITY;
CREATE TABLE public.admissions_applications (
    applicant_first_name text NOT NULL,
    applicant_last_name text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reference_number text NOT NULL,
    school_id uuid NOT NULL,
    status text NOT NULL,
    tenant_id uuid NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.ai_anomalies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    run_id uuid,
    anomaly_type text NOT NULL,
    score numeric(8,4) DEFAULT 0 NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    evidence jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    audit_log_reference uuid,
    school_id text,
    priority text DEFAULT 'normal'::text NOT NULL,
    due_date date
);
ALTER TABLE ONLY public.ai_anomalies FORCE ROW LEVEL SECURITY;
CREATE TABLE public.ai_forecasts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    run_id uuid,
    forecast_type text NOT NULL,
    horizon_days integer DEFAULT 30 NOT NULL,
    output jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    audit_log_reference uuid,
    school_id text,
    status text DEFAULT 'open'::text NOT NULL,
    priority text DEFAULT 'normal'::text NOT NULL,
    due_date date
);
ALTER TABLE ONLY public.ai_forecasts FORCE ROW LEVEL SECURITY;
CREATE TABLE public.ai_insight_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    run_id uuid,
    title text NOT NULL,
    severity text DEFAULT 'warning'::text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    evidence jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    audit_log_reference uuid,
    school_id text,
    priority text DEFAULT 'normal'::text NOT NULL,
    due_date date
);
ALTER TABLE ONLY public.ai_insight_alerts FORCE ROW LEVEL SECURITY;
CREATE TABLE public.ai_insight_audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    actor_user_id uuid,
    action text NOT NULL,
    resource_type text NOT NULL,
    resource_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    audit_log_reference uuid,
    school_id text,
    status text DEFAULT 'open'::text NOT NULL,
    priority text DEFAULT 'normal'::text NOT NULL,
    due_date date
);
ALTER TABLE ONLY public.ai_insight_audit_logs FORCE ROW LEVEL SECURITY;
CREATE TABLE public.ai_insight_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    title text NOT NULL,
    category text,
    owner_name text,
    status text DEFAULT 'open'::text NOT NULL,
    priority text DEFAULT 'normal'::text NOT NULL,
    due_date date,
    metric_count integer DEFAULT 0 NOT NULL,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    audit_log_reference uuid,
    school_id text,
    CONSTRAINT ck_ai_insight_runs_priority CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'critical'::text])))
);
ALTER TABLE ONLY public.ai_insight_runs FORCE ROW LEVEL SECURITY;
CREATE TABLE public.ai_recommendations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    run_id uuid,
    title text NOT NULL,
    recommendation_status text DEFAULT 'open'::text NOT NULL,
    rationale jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    audit_log_reference uuid,
    school_id text,
    status text DEFAULT 'open'::text NOT NULL,
    priority text DEFAULT 'normal'::text NOT NULL,
    due_date date
);
ALTER TABLE ONLY public.ai_recommendations FORCE ROW LEVEL SECURITY;
CREATE TABLE public.announcements (
    audience text NOT NULL,
    body text NOT NULL,
    channels text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    title text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    school_id text,
    status text DEFAULT 'draft'::text NOT NULL
);
ALTER TABLE ONLY public.announcements FORCE ROW LEVEL SECURITY;
CREATE TABLE public.appointments (
    id text NOT NULL,
    school_id text NOT NULL,
    title text NOT NULL,
    guardian_id text,
    student_id text,
    staff_user_id text,
    scheduled_at timestamp(3) without time zone NOT NULL,
    status public."AppointmentStatus" NOT NULL,
    created_by_user_id text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.approval_audit_logs (
    id text NOT NULL,
    school_id text NOT NULL,
    request_id text NOT NULL,
    user_id text NOT NULL,
    action text NOT NULL,
    comment text,
    previous_status public."ApprovalStatus",
    new_status public."ApprovalStatus",
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE public.approval_requests (
    id text NOT NULL,
    school_id text NOT NULL,
    rule_id text NOT NULL,
    module text NOT NULL,
    action text NOT NULL,
    target_entity_type text NOT NULL,
    target_entity_id text NOT NULL,
    requested_by_user_id text NOT NULL,
    assigned_approver_id text,
    assigned_approver_role text,
    status public."ApprovalStatus" DEFAULT 'DRAFT'::public."ApprovalStatus" NOT NULL,
    reason text,
    requester_comment text,
    approver_comment text,
    old_value jsonb,
    new_value jsonb,
    attachments text[],
    submitted_at timestamp(3) without time zone,
    approved_at timestamp(3) without time zone,
    rejected_at timestamp(3) without time zone,
    escalated_at timestamp(3) without time zone,
    cancelled_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.approval_rules (
    id text NOT NULL,
    school_id text NOT NULL,
    module text NOT NULL,
    action text NOT NULL,
    description text,
    requester_roles text[],
    approver_roles text[],
    approval_level public."ApprovalLevel" DEFAULT 'SINGLE'::public."ApprovalLevel" NOT NULL,
    risk_level public."RiskLevel" DEFAULT 'MEDIUM'::public."RiskLevel" NOT NULL,
    amount_min double precision,
    amount_max double precision,
    requires_reason boolean DEFAULT false NOT NULL,
    requires_attachment boolean DEFAULT false NOT NULL,
    allow_self_approval boolean DEFAULT false NOT NULL,
    escalation_roles text[],
    escalation_after_hours integer,
    is_active boolean DEFAULT true NOT NULL,
    created_by text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.asset_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    asset_id uuid,
    assigned_to_type text NOT NULL,
    assigned_to_id uuid,
    status text DEFAULT 'active'::text NOT NULL,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    returned_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    audit_log_reference uuid,
    school_id text,
    priority text DEFAULT 'normal'::text NOT NULL,
    due_date date,
    due_at timestamp with time zone,
    assigned_to_name text,
    department text,
    notes text
);
ALTER TABLE ONLY public.asset_assignments FORCE ROW LEVEL SECURITY;
CREATE TABLE public.asset_audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    actor_user_id uuid,
    action text NOT NULL,
    resource_type text NOT NULL,
    resource_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    audit_log_reference uuid,
    school_id text,
    status text DEFAULT 'open'::text NOT NULL,
    priority text DEFAULT 'normal'::text NOT NULL,
    due_date date
);
ALTER TABLE ONLY public.asset_audit_logs FORCE ROW LEVEL SECURITY;
CREATE TABLE public.asset_depreciation_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    asset_id uuid,
    depreciation_date date DEFAULT CURRENT_DATE NOT NULL,
    book_value_minor bigint DEFAULT 0 NOT NULL,
    depreciation_amount_minor bigint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    audit_log_reference uuid,
    school_id text,
    status text DEFAULT 'open'::text NOT NULL,
    priority text DEFAULT 'normal'::text NOT NULL,
    due_date date
);
ALTER TABLE ONLY public.asset_depreciation_entries FORCE ROW LEVEL SECURITY;
CREATE TABLE public.asset_movements (
    id text NOT NULL,
    school_id text NOT NULL,
    asset_id text NOT NULL,
    movement_type public."AssetMovementType" NOT NULL,
    from_user_id text,
    to_user_id text,
    from_location text,
    to_location text,
    recorded_by_user_id text NOT NULL,
    remarks text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.asset_repairs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    asset_id uuid,
    issue_title text NOT NULL,
    repair_status text DEFAULT 'open'::text NOT NULL,
    cost_minor bigint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    audit_log_reference uuid,
    school_id text,
    status text DEFAULT 'open'::text NOT NULL,
    priority text DEFAULT 'normal'::text NOT NULL,
    due_date date,
    technician text,
    scheduled_for date,
    completed_at timestamp with time zone,
    notes text
);
ALTER TABLE ONLY public.asset_repairs FORCE ROW LEVEL SECURITY;
CREATE TABLE public.assets (
    id text NOT NULL,
    school_id text NOT NULL,
    asset_tag text NOT NULL,
    name text NOT NULL,
    category public."AssetCategory" NOT NULL,
    serial_number text,
    model text,
    manufacturer text,
    purchase_date date,
    warranty_expiry date,
    current_location text NOT NULL,
    custodian_user_id text,
    state public."AssetState" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone,
    tenant_id text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    priority text DEFAULT 'normal'::text NOT NULL,
    due_date date
);
ALTER TABLE ONLY public.assets FORCE ROW LEVEL SECURITY;
CREATE TABLE public.attendance_records (
    id text NOT NULL,
    school_id text NOT NULL,
    attendance_session_id text NOT NULL,
    student_id text NOT NULL,
    status public."AttendanceStatus" NOT NULL,
    remarks text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone,
    tenant_id text NOT NULL,
    attendance_date date DEFAULT CURRENT_DATE NOT NULL,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    source_device_id text,
    last_modified_at timestamp with time zone DEFAULT now() NOT NULL,
    last_operation_id uuid,
    sync_version bigint
);
ALTER TABLE ONLY public.attendance_records FORCE ROW LEVEL SECURITY;
CREATE TABLE public.attendance_rules (
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT '00000000-0000-0000-0000-000000000000'::text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    audit_log_reference uuid,
    default_start_time time without time zone DEFAULT '07:30:00'::time without time zone NOT NULL,
    grace_period_minutes integer DEFAULT 10 NOT NULL,
    absence_cutoff_time time without time zone DEFAULT '09:00:00'::time without time zone NOT NULL,
    half_day_checkout_cutoff time without time zone DEFAULT '12:30:00'::time without time zone NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);
ALTER TABLE ONLY public.attendance_rules FORCE ROW LEVEL SECURITY;
CREATE TABLE public.attendance_sessions (
    id text NOT NULL,
    school_id text NOT NULL,
    academic_year_id text NOT NULL,
    term_id text NOT NULL,
    class_id text NOT NULL,
    stream_id text NOT NULL,
    date date NOT NULL,
    session_type public."SessionType" NOT NULL,
    taken_by_user_id text NOT NULL,
    status public."AttendanceSessionStatus" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id text,
    actor_user_id uuid,
    action text NOT NULL,
    module text DEFAULT 'system'::text NOT NULL,
    entity_type text DEFAULT 'unknown'::text NOT NULL,
    entity_id text DEFAULT ''::text NOT NULL,
    old_values_json jsonb,
    new_values_json jsonb,
    ip_address inet,
    user_agent text,
    reason text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id text NOT NULL,
    request_id text,
    resource_type text NOT NULL,
    resource_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    aggregate_id uuid
);
ALTER TABLE ONLY public.audit_logs FORCE ROW LEVEL SECURITY;
CREATE TABLE public.auth_action_tokens (
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    email text NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    purpose text NOT NULL,
    tenant_id text,
    token_hash text NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    user_id uuid,
    consumed_at timestamp with time zone
);
ALTER TABLE ONLY public.auth_action_tokens FORCE ROW LEVEL SECURITY;
CREATE TABLE public.auth_email_outbox (
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    recipient_email text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    subject text NOT NULL,
    template text NOT NULL,
    tenant_id text,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    user_id uuid,
    attempts integer DEFAULT 0 NOT NULL,
    next_attempt_at timestamp with time zone DEFAULT now() NOT NULL,
    sent_at timestamp with time zone,
    last_error_code text,
    last_error_summary text,
    provider_status_code integer,
    last_attempt_at timestamp with time zone,
    CONSTRAINT ck_auth_email_outbox_attempts CHECK ((attempts >= 0)),
    CONSTRAINT ck_auth_email_outbox_provider_status_code CHECK (((provider_status_code IS NULL) OR ((provider_status_code >= 100) AND (provider_status_code <= 599))))
);
ALTER TABLE ONLY public.auth_email_outbox FORCE ROW LEVEL SECURITY;
CREATE TABLE public.auth_mfa_challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    code_hash text NOT NULL,
    purpose text DEFAULT 'login'::text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    consumed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT auth_mfa_challenges_purpose_check CHECK ((purpose = ANY (ARRAY['login'::text, 'step_up'::text])))
);
ALTER TABLE ONLY public.auth_mfa_challenges FORCE ROW LEVEL SECURITY;
CREATE TABLE public.auth_trusted_devices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    device_token_hash text NOT NULL,
    user_agent text,
    ip_address text,
    expires_at timestamp with time zone NOT NULL,
    trusted_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE ONLY public.auth_trusted_devices FORCE ROW LEVEL SECURITY;
CREATE TABLE public.beds (
    id text NOT NULL,
    school_id text NOT NULL,
    dormitory_id text NOT NULL,
    bed_number text NOT NULL,
    status public."BedStatus" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.behavior_improvement_plan_steps (
    id uuid NOT NULL,
    tenant_id text NOT NULL,
    school_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    title text NOT NULL,
    due_at timestamp(3) without time zone,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
ALTER TABLE ONLY public.behavior_improvement_plan_steps FORCE ROW LEVEL SECURITY;
CREATE TABLE public.behavior_improvement_plans (
    id uuid NOT NULL,
    tenant_id text NOT NULL,
    school_id uuid NOT NULL,
    student_id uuid NOT NULL,
    referral_id uuid,
    session_id uuid,
    counsellor_user_id uuid NOT NULL,
    title text NOT NULL,
    goal text NOT NULL,
    parent_involvement_plan text,
    review_date timestamp(3) without time zone,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
ALTER TABLE ONLY public.behavior_improvement_plans FORCE ROW LEVEL SECURITY;
CREATE TABLE public.behavior_points (
    id uuid NOT NULL,
    tenant_id text NOT NULL,
    school_id uuid NOT NULL,
    student_id uuid NOT NULL,
    class_id uuid NOT NULL,
    academic_term_id uuid NOT NULL,
    academic_year_id uuid NOT NULL,
    source_type text NOT NULL,
    source_id uuid NOT NULL,
    points_delta integer NOT NULL,
    reason text NOT NULL,
    awarded_by_user_id uuid NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone,
    awarded_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_behavior_points_source CHECK ((source_type = ANY (ARRAY['incident'::text, 'commendation'::text, 'correction'::text, 'lab_attendance'::text])))
);
ALTER TABLE ONLY public.behavior_points FORCE ROW LEVEL SECURITY;
CREATE TABLE public.billing_notifications (
    audience text NOT NULL,
    body text NOT NULL,
    channel text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    delivered_at timestamp(3) without time zone NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lifecycle_state text NOT NULL,
    metadata jsonb NOT NULL,
    notification_key text NOT NULL,
    scheduled_for text NOT NULL,
    status text NOT NULL,
    subscription_id uuid NOT NULL,
    tenant_id text NOT NULL,
    title text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
ALTER TABLE ONLY public.billing_notifications FORCE ROW LEVEL SECURITY;
CREATE TABLE public.biometric_devices (
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    location text NOT NULL,
    name text NOT NULL,
    registered_by text NOT NULL,
    tenant_id text DEFAULT '00000000-0000-0000-0000-000000000000'::text NOT NULL,
    type text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    audit_log_reference uuid,
    status text DEFAULT 'active'::text NOT NULL,
    last_sync_time timestamp with time zone
);
ALTER TABLE ONLY public.biometric_devices FORCE ROW LEVEL SECURITY;
CREATE TABLE public.biometric_events (
    biometric_hash text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    device_id uuid NOT NULL,
    event_hash text NOT NULL,
    event_type text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    occurred_at timestamp(3) without time zone NOT NULL,
    offline_mode_flag boolean DEFAULT false NOT NULL,
    raw_payload jsonb NOT NULL,
    tenant_id text DEFAULT '00000000-0000-0000-0000-000000000000'::text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    audit_log_reference uuid,
    processing_status text DEFAULT 'pending'::text NOT NULL
);
ALTER TABLE ONLY public.biometric_events FORCE ROW LEVEL SECURITY;
CREATE TABLE public.biometric_identities (
    biometric_hash text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    enrolled_by text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    teacher_user_id uuid NOT NULL,
    tenant_id text DEFAULT '00000000-0000-0000-0000-000000000000'::text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    audit_log_reference uuid,
    status text DEFAULT 'active'::text NOT NULL
);
ALTER TABLE ONLY public.biometric_identities FORCE ROW LEVEL SECURITY;
CREATE TABLE public.boarding_allocations (
    id text NOT NULL,
    school_id text NOT NULL,
    student_id text NOT NULL,
    boarding_house_id text NOT NULL,
    dormitory_id text NOT NULL,
    bed_id text NOT NULL,
    academic_year_id text NOT NULL,
    status text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone,
    tenant_id text DEFAULT 'global'::text NOT NULL
);
ALTER TABLE ONLY public.boarding_allocations FORCE ROW LEVEL SECURITY;
CREATE TABLE public.boarding_attendance (
    id text NOT NULL,
    school_id text NOT NULL,
    student_id text NOT NULL,
    date date NOT NULL,
    session_type public."SessionType" NOT NULL,
    status public."AttendanceStatus" NOT NULL,
    recorded_by_user_id text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.boarding_audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    actor_user_id uuid,
    action text NOT NULL,
    resource_type text NOT NULL,
    resource_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    audit_log_reference uuid,
    school_id text,
    status text DEFAULT 'open'::text NOT NULL,
    priority text DEFAULT 'normal'::text NOT NULL,
    due_date date
);
ALTER TABLE ONLY public.boarding_audit_logs FORCE ROW LEVEL SECURITY;
CREATE TABLE public.boarding_dormitory_checks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    house_id uuid,
    checked_by_user_id uuid,
    check_status text DEFAULT 'clear'::text NOT NULL,
    notes text,
    checked_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    audit_log_reference uuid,
    school_id text,
    status text DEFAULT 'open'::text NOT NULL,
    priority text DEFAULT 'normal'::text NOT NULL,
    due_date date,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);
ALTER TABLE ONLY public.boarding_dormitory_checks FORCE ROW LEVEL SECURITY;
CREATE TABLE public.boarding_exeats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    student_id uuid,
    student_name text NOT NULL,
    hostel text,
    leave_type text NOT NULL,
    from_date date NOT NULL,
    to_date date NOT NULL,
    guardian_name text,
    guardian_phone text,
    reason text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    requested_by uuid,
    approved_by uuid,
    rejected_by uuid,
    decision_reason text,
    checked_out_by uuid,
    checked_out_at timestamp with time zone,
    returned_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    school_id text,
    guardian_id uuid,
    CONSTRAINT ck_boarding_exeats_status CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'checked_out'::text, 'returned'::text, 'cancelled'::text])))
);
ALTER TABLE ONLY public.boarding_exeats FORCE ROW LEVEL SECURITY;
CREATE TABLE public.boarding_houses (
    id text NOT NULL,
    school_id text NOT NULL,
    name text NOT NULL,
    gender text NOT NULL,
    capacity integer NOT NULL,
    boarding_master_user_id text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone,
    tenant_id text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    priority text DEFAULT 'normal'::text NOT NULL,
    due_date date
);
ALTER TABLE ONLY public.boarding_houses FORCE ROW LEVEL SECURITY;
CREATE TABLE public.boarding_incidents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    house_id uuid,
    student_id uuid,
    title text NOT NULL,
    severity text DEFAULT 'warning'::text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    audit_log_reference uuid,
    school_id text,
    priority text DEFAULT 'normal'::text NOT NULL,
    due_date date
);
ALTER TABLE ONLY public.boarding_incidents FORCE ROW LEVEL SECURITY;
CREATE TABLE public.boarding_meals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    house_id uuid,
    meal_date date DEFAULT CURRENT_DATE NOT NULL,
    meal_type text NOT NULL,
    planned_count integer DEFAULT 0 NOT NULL,
    consumed_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    audit_log_reference uuid,
    school_id text,
    status text DEFAULT 'open'::text NOT NULL,
    priority text DEFAULT 'normal'::text NOT NULL,
    due_date date
);
ALTER TABLE ONLY public.boarding_meals FORCE ROW LEVEL SECURITY;
CREATE TABLE public.boarding_referrals (
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reason text NOT NULL,
    school_id uuid,
    status text NOT NULL,
    student_id uuid NOT NULL,
    tenant_id text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    priority text DEFAULT 'normal'::text NOT NULL,
    due_date date,
    referred_to text NOT NULL,
    created_by uuid
);
ALTER TABLE ONLY public.boarding_referrals FORCE ROW LEVEL SECURITY;
CREATE TABLE public.boarding_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    report_type text NOT NULL,
    status text DEFAULT 'queued'::text NOT NULL,
    generated_by_user_id text,
    generated_from text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    audit_log_reference uuid,
    school_id text,
    priority text DEFAULT 'normal'::text NOT NULL,
    due_date date
);
ALTER TABLE ONLY public.boarding_reports FORCE ROW LEVEL SECURITY;
CREATE TABLE public.boarding_students (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    house_id uuid,
    student_id uuid NOT NULL,
    bed_label text,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    audit_log_reference uuid,
    school_id text,
    priority text DEFAULT 'normal'::text NOT NULL,
    due_date date
);
ALTER TABLE ONLY public.boarding_students FORCE ROW LEVEL SECURITY;
CREATE TABLE public.breach_response_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT '00000000-0000-0000-0000-000000000000'::text NOT NULL,
    incident_number text NOT NULL,
    severity text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    detected_at timestamp with time zone NOT NULL,
    contained_at timestamp with time zone,
    reported_to_odpc_at timestamp with time zone,
    affected_categories text[] DEFAULT ARRAY[]::text[] NOT NULL,
    evidence_export jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_breach_response_reports_severity CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))),
    CONSTRAINT ck_breach_response_reports_status CHECK ((status = ANY (ARRAY['open'::text, 'contained'::text, 'notified'::text, 'closed'::text])))
);
ALTER TABLE ONLY public.breach_response_reports FORCE ROW LEVEL SECURITY;
CREATE TABLE public.callback_logs (
    callback_trust_status text NOT NULL,
    checkout_request_id uuid NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    delivery_id uuid NOT NULL,
    event_timestamp text NOT NULL,
    headers text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    merchant_request_id uuid NOT NULL,
    mpesa_short_code text NOT NULL,
    payload_sha256 jsonb NOT NULL,
    processing_status text NOT NULL,
    raw_body text NOT NULL,
    raw_payload jsonb NOT NULL,
    raw_payload_encrypted_ref jsonb NOT NULL,
    request_fingerprint text NOT NULL,
    signature text NOT NULL,
    signature_verified text NOT NULL,
    source_ip text NOT NULL,
    tenant_id text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    provider_verified_at timestamp with time zone,
    provider_result_code text,
    provider_result_desc text
);
ALTER TABLE ONLY public.callback_logs FORCE ROW LEVEL SECURITY;
CREATE TABLE public.cbc_assessment_entries (
    id text NOT NULL,
    school_id text NOT NULL,
    exam_cycle_id text NOT NULL,
    student_id text NOT NULL,
    class_id text NOT NULL,
    stream_id text,
    strand_id text NOT NULL,
    sub_strand_id text,
    teacher_user_id text NOT NULL,
    level public."CBCAssessmentLevel" NOT NULL,
    descriptor text,
    comment text,
    status public."MarksEntryStatus" DEFAULT 'DRAFT'::public."MarksEntryStatus" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.cbt_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    session_id uuid,
    student_id uuid NOT NULL,
    status text DEFAULT 'started'::text NOT NULL,
    score numeric(8,2) DEFAULT 0 NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    submitted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    audit_log_reference uuid,
    school_id text,
    priority text DEFAULT 'normal'::text NOT NULL,
    due_date date
);
ALTER TABLE ONLY public.cbt_attempts FORCE ROW LEVEL SECURITY;
CREATE TABLE public.cbt_audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    actor_user_id uuid,
    action text NOT NULL,
    resource_type text NOT NULL,
    resource_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    audit_log_reference uuid,
    school_id text,
    status text DEFAULT 'open'::text NOT NULL,
    priority text DEFAULT 'normal'::text NOT NULL,
    due_date date
);
ALTER TABLE ONLY public.cbt_audit_logs FORCE ROW LEVEL SECURITY;
CREATE TABLE public.cbt_exam_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    title text NOT NULL,
    category text,
    owner_name text,
    status text DEFAULT 'open'::text NOT NULL,
    priority text DEFAULT 'normal'::text NOT NULL,
    due_date date,
    metric_count integer DEFAULT 0 NOT NULL,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    audit_log_reference uuid,
    school_id text,
    CONSTRAINT ck_cbt_exam_sessions_priority CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'critical'::text])))
);
ALTER TABLE ONLY public.cbt_exam_sessions FORCE ROW LEVEL SECURITY;
CREATE TABLE public.cbt_invigilation_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    session_id uuid,
    attempt_id uuid,
    event_type text NOT NULL,
    severity text DEFAULT 'info'::text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    audit_log_reference uuid,
    school_id text,
    status text DEFAULT 'open'::text NOT NULL,
    priority text DEFAULT 'normal'::text NOT NULL,
    due_date date
);
ALTER TABLE ONLY public.cbt_invigilation_events FORCE ROW LEVEL SECURITY;
CREATE TABLE public.cbt_questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    session_id uuid,
    question_text text NOT NULL,
    question_type text DEFAULT 'multiple_choice'::text NOT NULL,
    max_score numeric(8,2) DEFAULT 1 NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    audit_log_reference uuid,
    school_id text,
    status text DEFAULT 'open'::text NOT NULL,
    priority text DEFAULT 'normal'::text NOT NULL,
    due_date date
);
ALTER TABLE ONLY public.cbt_questions FORCE ROW LEVEL SECURITY;
CREATE TABLE public.cbt_responses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    attempt_id uuid,
    question_id uuid,
    response jsonb DEFAULT '{}'::jsonb NOT NULL,
    score numeric(8,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    audit_log_reference uuid,
    school_id text,
    status text DEFAULT 'open'::text NOT NULL,
    priority text DEFAULT 'normal'::text NOT NULL,
    due_date date
);
ALTER TABLE ONLY public.cbt_responses FORCE ROW LEVEL SECURITY;
CREATE TABLE public.chemical_disposal_requests (
    chemical_id uuid NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reason text NOT NULL,
    requested_by text NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    school_id text
);
ALTER TABLE ONLY public.chemical_disposal_requests FORCE ROW LEVEL SECURITY;
CREATE TABLE public.chemical_items (
    batch_number text,
    chemical_formula text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expiry_date text,
    hazard_class text,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lab_id uuid,
    manufacture_date text NOT NULL,
    name text NOT NULL,
    quantity_available integer NOT NULL,
    quantity_total integer NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    unit text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    school_id text,
    status text DEFAULT 'active'::text NOT NULL,
    category text DEFAULT 'Chemical or Reagent'::text NOT NULL,
    minimum_stock_level numeric(12,3) DEFAULT 0 NOT NULL,
    storage_location_id uuid,
    storage_location text,
    concentration text,
    safety_classification text,
    notes text,
    submission_id text
);
ALTER TABLE ONLY public.chemical_items FORCE ROW LEVEL SECURITY;
CREATE TABLE public.child_data_dpia_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT '00000000-0000-0000-0000-000000000000'::text NOT NULL,
    module_code text NOT NULL,
    risk_level text NOT NULL,
    requires_dpia boolean DEFAULT true NOT NULL,
    assessment_version text NOT NULL,
    safeguards jsonb DEFAULT '{}'::jsonb NOT NULL,
    approved_by_user_id uuid,
    approved_at timestamp with time zone,
    review_due_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_child_data_dpia_records_module CHECK ((module_code = ANY (ARRAY['students'::text, 'clinic'::text, 'biometrics'::text, 'discipline'::text, 'exams_report_cards'::text, 'payments'::text, 'sync_offline'::text]))),
    CONSTRAINT ck_child_data_dpia_records_risk CHECK ((risk_level = ANY (ARRAY['medium'::text, 'high'::text, 'critical'::text])))
);
ALTER TABLE ONLY public.child_data_dpia_records FORCE ROW LEVEL SECURITY;
CREATE TABLE public.class_requests (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    school_id text NOT NULL,
    student_id text,
    request_type text NOT NULL,
    description text NOT NULL,
    priority text DEFAULT 'medium'::text NOT NULL,
    target_role text NOT NULL,
    status text DEFAULT 'submitted'::text NOT NULL,
    created_by_user_id uuid,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL
);
ALTER TABLE ONLY public.class_requests FORCE ROW LEVEL SECURITY;
CREATE TABLE public.class_sections (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    academic_year_id text NOT NULL,
    academic_level_id text,
    name text NOT NULL,
    grade_level text NOT NULL,
    stream text,
    custom_label text,
    capacity integer,
    is_active boolean DEFAULT true NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_by_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    school_id text,
    version integer DEFAULT 1 NOT NULL,
    code text,
    curriculum_model text DEFAULT 'Custom'::text NOT NULL,
    enrolment_open boolean DEFAULT true NOT NULL,
    archived_at timestamp with time zone,
    archived_by_user_id uuid
);
ALTER TABLE ONLY public.class_sections FORCE ROW LEVEL SECURITY;
CREATE TABLE public.class_streams (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    tenant_id text NOT NULL,
    class_section_id text NOT NULL,
    name text NOT NULL,
    capacity integer,
    class_teacher_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    audit_log_reference uuid,
    version integer DEFAULT 1 NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    code text,
    stream_teacher_user_id uuid,
    archived_at timestamp with time zone,
    archived_by_user_id uuid
);
ALTER TABLE ONLY public.class_streams FORCE ROW LEVEL SECURITY;
CREATE TABLE public.class_subject_assignments (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    academic_term_id text NOT NULL,
    class_section_id text NOT NULL,
    subject_id text NOT NULL,
    created_by_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    school_id text,
    is_compulsory boolean DEFAULT true NOT NULL,
    is_examinable boolean DEFAULT true NOT NULL,
    effective_from date,
    effective_to date,
    status text DEFAULT 'active'::text NOT NULL,
    reason text,
    version integer DEFAULT 1 NOT NULL,
    updated_by_user_id uuid,
    archived_at timestamp with time zone,
    archived_by_user_id uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE ONLY public.class_subject_assignments FORCE ROW LEVEL SECURITY;
CREATE TABLE public.class_subjects (
    id text NOT NULL,
    school_id text NOT NULL,
    class_id text NOT NULL,
    subject_id text NOT NULL,
    is_compulsory boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.class_timetable_entries (
    id text NOT NULL,
    school_id text NOT NULL,
    academic_year_id text NOT NULL,
    term_id text NOT NULL,
    class_id text NOT NULL,
    stream_id text NOT NULL,
    subject_id text,
    teacher_user_id text,
    room text,
    day_of_week integer NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.classes (
    id text NOT NULL,
    school_id text NOT NULL,
    name text NOT NULL,
    level_number integer NOT NULL,
    education_stage public."EducationStage" NOT NULL,
    curriculum_type public."CurriculumType" NOT NULL,
    status public."ClassStatus" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone,
    academic_level_id text
);
CREATE TABLE public.clinic_alerts (
    alert_type text NOT NULL,
    batch_id uuid NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    medicine_id uuid NOT NULL,
    message text NOT NULL,
    metadata jsonb NOT NULL,
    notify_principal text NOT NULL,
    severity text NOT NULL,
    tenant_id text DEFAULT '00000000-0000-0000-0000-000000000000'::text NOT NULL,
    title text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    audit_log_reference uuid,
    status text DEFAULT 'open'::text NOT NULL
);
ALTER TABLE ONLY public.clinic_alerts FORCE ROW LEVEL SECURITY;
CREATE TABLE public.clinic_audit_logs (
    action text NOT NULL,
    actor_user_id uuid NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metadata jsonb NOT NULL,
    resource_id uuid NOT NULL,
    resource_type text NOT NULL,
    tenant_id text DEFAULT '00000000-0000-0000-0000-000000000000'::text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    audit_log_reference uuid
);
ALTER TABLE ONLY public.clinic_audit_logs FORCE ROW LEVEL SECURITY;
CREATE TABLE public.clinic_disposal_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT '00000000-0000-0000-0000-000000000000'::text NOT NULL,
    batch_id uuid NOT NULL,
    requested_by_user_id uuid NOT NULL,
    approved_by_user_id uuid,
    reason text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    approved_at timestamp with time zone,
    disposed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    audit_log_reference uuid,
    CONSTRAINT ck_clinic_disposal_requests_status CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'disposed'::text])))
);
ALTER TABLE ONLY public.clinic_disposal_requests FORCE ROW LEVEL SECURITY;
CREATE TABLE public.clinic_locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT '00000000-0000-0000-0000-000000000000'::text NOT NULL,
    name text NOT NULL,
    branch_type text DEFAULT 'main'::text NOT NULL,
    location text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    audit_log_reference uuid,
    CONSTRAINT ck_clinic_locations_branch_type CHECK ((branch_type = ANY (ARRAY['main'::text, 'boarding'::text, 'campus'::text, 'temporary'::text])))
);
ALTER TABLE ONLY public.clinic_locations FORCE ROW LEVEL SECURITY;
CREATE TABLE public.clinic_medicine_batches (
    batch_number text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by_user_id uuid NOT NULL,
    date_received text NOT NULL,
    expiry_date text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    is_emergency_supply boolean NOT NULL,
    manufacturing_date text NOT NULL,
    medicine_id uuid NOT NULL,
    minimum_stock_threshold text NOT NULL,
    procurement_metadata jsonb NOT NULL,
    procurement_reference text NOT NULL,
    quantity_available integer NOT NULL,
    quantity_received integer NOT NULL,
    storage_location text NOT NULL,
    supplier_invoice_reference text NOT NULL,
    tenant_id text DEFAULT '00000000-0000-0000-0000-000000000000'::text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    audit_log_reference uuid
);
ALTER TABLE ONLY public.clinic_medicine_batches FORCE ROW LEVEL SECURITY;
CREATE TABLE public.clinic_medicine_dispenses (
    batch_id uuid NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    dispensed_by_user_id uuid NOT NULL,
    dosage text NOT NULL,
    duration text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    instructions text NOT NULL,
    medicine_id uuid NOT NULL,
    quantity_dispensed integer NOT NULL,
    tenant_id text DEFAULT '00000000-0000-0000-0000-000000000000'::text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    visit_id uuid NOT NULL,
    audit_log_reference uuid,
    dispensed_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE ONLY public.clinic_medicine_dispenses FORCE ROW LEVEL SECURITY;
CREATE TABLE public.clinic_medicines (
    barcode text NOT NULL,
    brand_name text NOT NULL,
    category text NOT NULL,
    clinic_location_id uuid NOT NULL,
    cost_price_minor numeric(10,2) NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by_user_id uuid NOT NULL,
    generic_name text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    internal_value_minor text NOT NULL,
    is_emergency_supply boolean NOT NULL,
    manufacturer text NOT NULL,
    medicine_name text NOT NULL,
    prescription_required text NOT NULL,
    qr_code text NOT NULL,
    side_effect_notes text NOT NULL,
    storage_instructions text NOT NULL,
    storage_location text NOT NULL,
    supplier text NOT NULL,
    tenant_id text DEFAULT '00000000-0000-0000-0000-000000000000'::text NOT NULL,
    unit_type text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    audit_log_reference uuid
);
ALTER TABLE ONLY public.clinic_medicines FORCE ROW LEVEL SECURITY;
CREATE TABLE public.clinic_procurement_recommendations (
    batch_id uuid NOT NULL,
    batch_number text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    item_name text NOT NULL,
    medicine_id uuid NOT NULL,
    metadata jsonb NOT NULL,
    minimum_stock_threshold text CONSTRAINT clinic_procurement_recommendat_minimum_stock_threshold_not_null NOT NULL,
    module_code text NOT NULL,
    quantity_available integer NOT NULL,
    recommended_order_quantity integer CONSTRAINT clinic_procurement_recommen_recommended_order_quantity_not_null NOT NULL,
    shortage_quantity integer NOT NULL,
    tenant_id text DEFAULT '00000000-0000-0000-0000-000000000000'::text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    audit_log_reference uuid,
    recommendation_status text DEFAULT 'open'::text CONSTRAINT clinic_procurement_recommendatio_recommendation_status_not_null NOT NULL
);
ALTER TABLE ONLY public.clinic_procurement_recommendations FORCE ROW LEVEL SECURITY;
CREATE TABLE public.clinic_stock_movements (
    actor_user_id uuid NOT NULL,
    after_quantity integer NOT NULL,
    batch_id uuid NOT NULL,
    before_quantity integer NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    medicine_id uuid NOT NULL,
    metadata jsonb NOT NULL,
    movement_type text NOT NULL,
    quantity integer NOT NULL,
    reason text NOT NULL,
    reference text NOT NULL,
    tenant_id text DEFAULT '00000000-0000-0000-0000-000000000000'::text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    visit_id uuid NOT NULL,
    audit_log_reference uuid,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE ONLY public.clinic_stock_movements FORCE ROW LEVEL SECURITY;
CREATE TABLE public.clinic_visits (
    clinic_location_id uuid NOT NULL,
    confidential_notes text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    diagnosis_summary text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recorded_by_user_id uuid NOT NULL,
    status text NOT NULL,
    student_id uuid NOT NULL,
    symptoms_summary text NOT NULL,
    tenant_id text DEFAULT '00000000-0000-0000-0000-000000000000'::text NOT NULL,
    treatment_summary text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    visit_date text NOT NULL,
    audit_log_reference uuid,
    visit_time time without time zone DEFAULT CURRENT_TIME NOT NULL
);
ALTER TABLE ONLY public.clinic_visits FORCE ROW LEVEL SECURITY;
CREATE TABLE public.commendations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    school_id uuid NOT NULL,
    student_id uuid NOT NULL,
    class_id uuid NOT NULL,
    academic_term_id uuid NOT NULL,
    academic_year_id uuid NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    points_delta integer NOT NULL,
    awarded_by_user_id uuid,
    awarded_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_commendations_points_positive CHECK ((points_delta > 0)),
    CONSTRAINT ck_commendations_title CHECK ((btrim(title) <> ''::text))
);
ALTER TABLE ONLY public.commendations FORCE ROW LEVEL SECURITY;
CREATE TABLE public.communication_broadcasts (
    id text NOT NULL,
    school_id text NOT NULL,
    user_id uuid NOT NULL,
    audience text NOT NULL,
    message text NOT NULL,
    channels text[],
    status text DEFAULT 'PENDING'::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.communication_sms_outbox (
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message text NOT NULL,
    recipient_phone text NOT NULL,
    sent_by uuid,
    status text NOT NULL,
    tenant_id text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    available_at timestamp with time zone DEFAULT now() NOT NULL,
    last_attempt_at timestamp with time zone,
    dispatch_started_at timestamp with time zone,
    lease_expires_at timestamp with time zone,
    lease_token uuid,
    last_error text,
    provider_id uuid,
    provider_code text,
    provider_reference text,
    provider_accepted_at timestamp with time zone,
    sent_at timestamp with time zone,
    failed_at timestamp with time zone,
    delivery_unknown_at timestamp with time zone,
    dispatch_key text DEFAULT ('communication-sms:'::text || (gen_random_uuid())::text) NOT NULL
);
ALTER TABLE ONLY public.communication_sms_outbox FORCE ROW LEVEL SECURITY;
CREATE TABLE public.communication_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    subject text,
    body text NOT NULL,
    variables jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    school_id text,
    CONSTRAINT ck_communication_templates_type CHECK ((type = ANY (ARRAY['email'::text, 'sms'::text, 'push'::text, 'letter'::text])))
);
ALTER TABLE ONLY public.communication_templates FORCE ROW LEVEL SECURITY;
CREATE TABLE public.computer_lab_pcs (
    id text NOT NULL,
    school_id text NOT NULL,
    asset_id text,
    pc_label text NOT NULL,
    serial_number text,
    processor text,
    ram_gb double precision,
    storage_details text,
    operating_system text,
    state public."AssetState" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.computer_lab_sessions (
    id text NOT NULL,
    school_id text NOT NULL,
    teacher_user_id text NOT NULL,
    class_id text NOT NULL,
    stream_id text,
    subject_id text,
    session_date date NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    purpose text NOT NULL,
    status public."LabSessionStatus" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.computer_lab_usage_logs (
    id text NOT NULL,
    school_id text NOT NULL,
    computer_lab_session_id text NOT NULL,
    pc_id text NOT NULL,
    student_id text,
    issue_reported text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.consent_records (
    captured_at timestamp(3) without time zone NOT NULL,
    consent_type text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metadata jsonb NOT NULL,
    policy_version text NOT NULL,
    status text NOT NULL,
    tenant_id text DEFAULT '00000000-0000-0000-0000-000000000000'::text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    user_id uuid NOT NULL
);
ALTER TABLE ONLY public.consent_records FORCE ROW LEVEL SECURITY;
CREATE TABLE public.counselling_cases (
    id text NOT NULL,
    school_id text NOT NULL,
    student_id text NOT NULL,
    referred_by_user_id text,
    counsellor_user_id text NOT NULL,
    reason text NOT NULL,
    priority public."TaskPriority" NOT NULL,
    confidentiality_level public."ConfidentialityLevel" NOT NULL,
    status public."CounsellingStatus" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.counselling_escalations (
    id text NOT NULL,
    school_id text NOT NULL,
    counselling_case_id text NOT NULL,
    escalated_to_user_id text NOT NULL,
    reason text NOT NULL,
    action_taken text,
    status text DEFAULT 'PENDING'::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.counselling_notes (
    id uuid NOT NULL,
    tenant_id text NOT NULL,
    school_id uuid NOT NULL,
    student_id uuid NOT NULL,
    counselling_session_id uuid NOT NULL,
    counsellor_user_id uuid NOT NULL,
    visibility text NOT NULL,
    encrypted_note text NOT NULL,
    note_nonce text NOT NULL,
    note_auth_tag text NOT NULL,
    safe_summary text,
    risk_indicators jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
ALTER TABLE ONLY public.counselling_notes FORCE ROW LEVEL SECURITY;
CREATE TABLE public.counselling_referrals (
    id uuid NOT NULL,
    tenant_id text NOT NULL,
    school_id uuid NOT NULL,
    student_id uuid NOT NULL,
    class_id uuid NOT NULL,
    academic_term_id uuid NOT NULL,
    academic_year_id uuid NOT NULL,
    incident_id uuid,
    referred_by_user_id uuid NOT NULL,
    reason text NOT NULL,
    risk_level text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    counsellor_user_id uuid,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
ALTER TABLE ONLY public.counselling_referrals FORCE ROW LEVEL SECURITY;
CREATE TABLE public.counselling_sessions (
    id uuid NOT NULL,
    tenant_id text NOT NULL,
    school_id uuid NOT NULL,
    student_id uuid NOT NULL,
    referral_id uuid,
    counsellor_user_id uuid NOT NULL,
    scheduled_for timestamp(3) without time zone NOT NULL,
    location text,
    agenda text,
    status text DEFAULT 'scheduled'::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
ALTER TABLE ONLY public.counselling_sessions FORCE ROW LEVEL SECURITY;
CREATE TABLE public.dashboard_approval_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    approval_key text NOT NULL,
    requested_by_user_id uuid,
    approver_role text,
    approver_user_id uuid,
    module text,
    record_id text,
    approval_type text,
    reason text,
    status text DEFAULT 'PENDING'::text NOT NULL,
    decision_note text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    decided_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE ONLY public.dashboard_approval_requests FORCE ROW LEVEL SECURITY;
CREATE TABLE public.dashboard_summary_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    module text NOT NULL,
    summary_id text NOT NULL,
    role text NOT NULL,
    metrics jsonb NOT NULL,
    source_snapshot_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
    generated_at timestamp with time zone DEFAULT now() NOT NULL,
    stale_after timestamp with time zone,
    checksum_sha256 text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_dashboard_summary_checksum CHECK ((checksum_sha256 ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT ck_dashboard_summary_id_not_attendance CHECK ((POSITION(('attendance'::text) IN (lower(summary_id))) = 0)),
    CONSTRAINT ck_dashboard_summary_metrics_object CHECK ((jsonb_typeof(metrics) = 'object'::text)),
    CONSTRAINT ck_dashboard_summary_module_not_attendance CHECK ((POSITION(('attendance'::text) IN (lower(module))) = 0)),
    CONSTRAINT ck_dashboard_summary_source_snapshots_array CHECK ((jsonb_typeof(source_snapshot_ids) = 'array'::text))
);
ALTER TABLE ONLY public.dashboard_summary_snapshots FORCE ROW LEVEL SECURITY;
CREATE TABLE public.dashboard_tasks (
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    description text NOT NULL,
    due_date text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    target_role text NOT NULL,
    tenant_id uuid NOT NULL,
    title text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.data_retention_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT '00000000-0000-0000-0000-000000000000'::text NOT NULL,
    data_category text NOT NULL,
    module_code text NOT NULL,
    retention_policy text NOT NULL,
    retention_days integer,
    legal_basis text NOT NULL,
    purge_action text DEFAULT 'review_then_delete'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_data_retention_schedules_days CHECK (((retention_days IS NULL) OR (retention_days > 0))),
    CONSTRAINT ck_data_retention_schedules_status CHECK ((status = ANY (ARRAY['active'::text, 'paused'::text, 'retired'::text])))
);
ALTER TABLE ONLY public.data_retention_schedules FORCE ROW LEVEL SECURITY;
CREATE TABLE public.data_subject_requests (
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    due_at timestamp(3) without time zone NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    legal_basis text NOT NULL,
    request_type text NOT NULL,
    requested_payload jsonb NOT NULL,
    requester_user_id uuid NOT NULL,
    status text NOT NULL,
    subject_user_id uuid NOT NULL,
    tenant_id text DEFAULT '00000000-0000-0000-0000-000000000000'::text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    response_payload jsonb DEFAULT '{}'::jsonb NOT NULL
);
ALTER TABLE ONLY public.data_subject_requests FORCE ROW LEVEL SECURITY;
CREATE TABLE public.departments (
    id text NOT NULL,
    school_id text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    hod_user_id text,
    curriculum_scope public."DepartmentScope" DEFAULT 'BOTH'::public."DepartmentScope" NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.discipline_actions (
    id uuid NOT NULL,
    tenant_id text NOT NULL,
    school_id uuid NOT NULL,
    incident_id uuid NOT NULL,
    student_id uuid NOT NULL,
    action_type text NOT NULL,
    status text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    assigned_staff_id uuid,
    due_at timestamp(3) without time zone,
    remarks text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by_user_id uuid NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
ALTER TABLE ONLY public.discipline_actions FORCE ROW LEVEL SECURITY;
CREATE TABLE public.discipline_attachments (
    id uuid NOT NULL,
    tenant_id text NOT NULL,
    school_id uuid NOT NULL,
    incident_id uuid,
    action_id uuid,
    uploaded_by_user_id uuid NOT NULL,
    file_object_id text NOT NULL,
    file_name text NOT NULL,
    mime_type text NOT NULL,
    file_size integer NOT NULL,
    storage_path text NOT NULL,
    visibility text NOT NULL,
    scan_status text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
ALTER TABLE ONLY public.discipline_attachments FORCE ROW LEVEL SECURITY;
CREATE TABLE public.discipline_audit_logs (
    id uuid NOT NULL,
    tenant_id text NOT NULL,
    school_id uuid NOT NULL,
    actor_user_id uuid NOT NULL,
    actor_role text NOT NULL,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    ip_address text,
    user_agent text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
ALTER TABLE ONLY public.discipline_audit_logs FORCE ROW LEVEL SECURITY;
CREATE TABLE public.discipline_cases (
    id text NOT NULL,
    school_id text NOT NULL,
    student_id text NOT NULL,
    reported_by_user_id text NOT NULL,
    case_number text NOT NULL,
    incident_date date NOT NULL,
    incident_type text NOT NULL,
    severity public."IncidentSeverity" NOT NULL,
    description text NOT NULL,
    status public."DisciplineStatus" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.discipline_comments (
    id uuid NOT NULL,
    tenant_id text NOT NULL,
    school_id uuid NOT NULL,
    incident_id uuid NOT NULL,
    author_user_id uuid NOT NULL,
    visibility text NOT NULL,
    body text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
ALTER TABLE ONLY public.discipline_comments FORCE ROW LEVEL SECURITY;
CREATE TABLE public.discipline_document_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    school_id uuid NOT NULL,
    document_type text NOT NULL,
    title text NOT NULL,
    body_template text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE ONLY public.discipline_document_templates FORCE ROW LEVEL SECURITY;
CREATE TABLE public.discipline_generated_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    school_id uuid NOT NULL,
    incident_id uuid,
    action_id uuid,
    student_id uuid NOT NULL,
    document_type text NOT NULL,
    document_number text NOT NULL,
    file_object_id uuid,
    verification_token_hash text NOT NULL,
    generated_by_user_id uuid,
    generated_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE ONLY public.discipline_generated_documents FORCE ROW LEVEL SECURITY;
CREATE SEQUENCE public.discipline_incident_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
CREATE TABLE public.discipline_incidents (
    id uuid NOT NULL,
    tenant_id text NOT NULL,
    school_id uuid NOT NULL,
    student_id uuid NOT NULL,
    class_id uuid NOT NULL,
    academic_term_id uuid NOT NULL,
    academic_year_id uuid NOT NULL,
    offense_category_id uuid NOT NULL,
    reporting_staff_id uuid NOT NULL,
    assigned_staff_id uuid,
    incident_number text NOT NULL,
    title text NOT NULL,
    severity text NOT NULL,
    status text NOT NULL,
    occurred_at timestamp(3) without time zone NOT NULL,
    location text,
    witnesses jsonb DEFAULT '[]'::jsonb NOT NULL,
    description text NOT NULL,
    action_taken text,
    recommendations text,
    behavior_points_delta integer DEFAULT 0 NOT NULL,
    parent_notification_status text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone,
    linked_counselling_referral_id uuid
);
ALTER TABLE ONLY public.discipline_incidents FORCE ROW LEVEL SECURITY;
CREATE TABLE public.discipline_notifications (
    id uuid NOT NULL,
    tenant_id text NOT NULL,
    school_id uuid NOT NULL,
    incident_id uuid NOT NULL,
    student_id uuid NOT NULL,
    recipient_user_id uuid NOT NULL,
    notification_type text NOT NULL,
    channel text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
ALTER TABLE ONLY public.discipline_notifications FORCE ROW LEVEL SECURITY;
CREATE TABLE public.documents_generated (
    id text NOT NULL,
    school_id text NOT NULL,
    student_id text,
    guardian_id text,
    document_type public."DocumentType" NOT NULL,
    file_url text NOT NULL,
    generated_by_user_id text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.dormitories (
    id text NOT NULL,
    school_id text NOT NULL,
    boarding_house_id text NOT NULL,
    name text NOT NULL,
    capacity integer NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.duty_rosters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    duty_type text NOT NULL,
    duty_date date NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    assigned_user_id uuid NOT NULL,
    status text DEFAULT 'scheduled'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    audit_log_reference uuid,
    school_id text,
    CONSTRAINT ck_duty_rosters_status CHECK ((status = ANY (ARRAY['scheduled'::text, 'checked_in'::text, 'missed'::text, 'excused'::text]))),
    CONSTRAINT ck_duty_rosters_type CHECK ((duty_type = ANY (ARRAY['morning'::text, 'lunch'::text, 'gate'::text, 'evening'::text, 'custom'::text])))
);
ALTER TABLE ONLY public.duty_rosters FORCE ROW LEVEL SECURITY;
CREATE TABLE public.event_consumer_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    school_id text NOT NULL,
    outbox_event_id uuid NOT NULL,
    event_key text NOT NULL,
    consumer_name text NOT NULL,
    status text DEFAULT 'processing'::text NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    last_error text,
    processed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_event_consumer_runs_attempt_count_non_negative CHECK ((attempt_count >= 0)),
    CONSTRAINT ck_event_consumer_runs_consumer_name_not_blank CHECK ((btrim(consumer_name) <> ''::text)),
    CONSTRAINT ck_event_consumer_runs_event_key_not_blank CHECK ((btrim(event_key) <> ''::text)),
    CONSTRAINT ck_event_consumer_runs_school_matches_tenant CHECK ((school_id = tenant_id)),
    CONSTRAINT ck_event_consumer_runs_status CHECK ((status = ANY (ARRAY['processing'::text, 'completed'::text, 'failed'::text])))
);
ALTER TABLE ONLY public.event_consumer_runs FORCE ROW LEVEL SECURITY;
CREATE TABLE public.exam_assessment_components (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    assessment_id uuid NOT NULL,
    name text,
    max_score numeric(65,30) NOT NULL,
    weight numeric(65,30) NOT NULL,
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    component_code text NOT NULL,
    component_name text NOT NULL
);
ALTER TABLE ONLY public.exam_assessment_components FORCE ROW LEVEL SECURITY;
CREATE TABLE public.exam_assessments (
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    created_by_user_id uuid NOT NULL,
    exam_series_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    max_score numeric(65,30) NOT NULL,
    name text NOT NULL,
    subject_id uuid NOT NULL,
    tenant_id text NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    weight numeric(65,30) NOT NULL
);
ALTER TABLE ONLY public.exam_assessments FORCE ROW LEVEL SECURITY;
CREATE TABLE public.exam_attendance_records (
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recorded_by_user_id uuid,
    remarks text,
    status text NOT NULL,
    student_id uuid NOT NULL,
    tenant_id text NOT NULL,
    timetable_slot_id uuid NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    locked_at timestamp with time zone,
    locked_by_user_id uuid
);
ALTER TABLE ONLY public.exam_attendance_records FORCE ROW LEVEL SECURITY;
CREATE TABLE public.exam_competency_outcomes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    grading_policy_id uuid NOT NULL,
    code text NOT NULL,
    label text NOT NULL,
    descriptor text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE ONLY public.exam_competency_outcomes FORCE ROW LEVEL SECURITY;
CREATE TABLE public.exam_cycles (
    id text NOT NULL,
    school_id text NOT NULL,
    academic_year_id text NOT NULL,
    term_id text NOT NULL,
    name text NOT NULL,
    exam_type public."ExamType" NOT NULL,
    status public."ExamCycleStatus" NOT NULL,
    created_by_user_id text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.exam_grade_boundaries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    grading_policy_id uuid NOT NULL,
    grade text NOT NULL,
    min_score numeric(65,30) NOT NULL,
    max_score numeric(65,30) NOT NULL,
    points integer NOT NULL,
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    exam_series_id uuid,
    label text NOT NULL,
    remarks text,
    created_by_user_id uuid
);
ALTER TABLE ONLY public.exam_grade_boundaries FORCE ROW LEVEL SECURITY;
CREATE TABLE public.exam_grading_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    name text NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    exam_series_id uuid,
    reporting_mode text DEFAULT 'traditional'::text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    created_by_user_id uuid,
    version integer DEFAULT 1 NOT NULL,
    effective_from timestamp with time zone,
    effective_to timestamp with time zone,
    supersedes_policy_id uuid,
    validated_at timestamp with time zone,
    activated_at timestamp with time zone,
    scope jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT ck_exam_grading_policies_effective_range CHECK (((effective_to IS NULL) OR (effective_from IS NULL) OR (effective_to > effective_from))),
    CONSTRAINT ck_exam_grading_policies_mode CHECK ((reporting_mode = ANY (ARRAY['traditional'::text, 'cbc_competency'::text, 'hybrid'::text]))),
    CONSTRAINT ck_exam_grading_policies_status CHECK ((status = ANY (ARRAY['draft'::text, 'validated'::text, 'scheduled'::text, 'active'::text, 'replaced'::text, 'archived'::text]))),
    CONSTRAINT ck_exam_grading_policies_version CHECK ((version > 0))
);
ALTER TABLE ONLY public.exam_grading_policies FORCE ROW LEVEL SECURITY;
CREATE TABLE public.exam_grading_policy_boundaries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    grading_policy_id uuid NOT NULL,
    label text NOT NULL,
    min_score numeric(8,2) NOT NULL,
    max_score numeric(8,2) NOT NULL,
    points numeric(8,2),
    descriptor text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    remark text,
    is_pass boolean DEFAULT false NOT NULL,
    CONSTRAINT ck_exam_grading_policy_boundaries_range CHECK ((max_score >= min_score))
);
ALTER TABLE ONLY public.exam_grading_policy_boundaries FORCE ROW LEVEL SECURITY;
CREATE TABLE public.exam_invigilators (
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role text NOT NULL,
    staff_user_id uuid NOT NULL,
    tenant_id text NOT NULL,
    timetable_slot_id uuid NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'assigned'::text NOT NULL
);
ALTER TABLE ONLY public.exam_invigilators FORCE ROW LEVEL SECURITY;
CREATE TABLE public.exam_mark_audit_logs (
    action text NOT NULL,
    actor_user_id uuid,
    assessment_id uuid,
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    exam_series_id uuid,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mark_id uuid,
    metadata jsonb NOT NULL,
    new_score numeric(65,30),
    previous_score numeric(65,30),
    reason text,
    student_id uuid,
    tenant_id text NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL
);
ALTER TABLE ONLY public.exam_mark_audit_logs FORCE ROW LEVEL SECURITY;
CREATE TABLE public.exam_mark_entry_windows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    exam_series_id uuid NOT NULL,
    subject_id uuid NOT NULL,
    class_section_id uuid NOT NULL,
    opens_at timestamp(3) without time zone NOT NULL,
    closes_at timestamp(3) without time zone NOT NULL,
    status text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    last_action text,
    last_action_at timestamp with time zone,
    last_action_by_user_id uuid,
    return_reason text,
    created_by_user_id uuid
);
ALTER TABLE ONLY public.exam_mark_entry_windows FORCE ROW LEVEL SECURITY;
CREATE TABLE public.exam_mark_import_batch_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    batch_id uuid NOT NULL,
    mark_id uuid NOT NULL,
    row_number integer NOT NULL,
    previous_exists boolean NOT NULL,
    previous_score numeric(8,2),
    previous_remarks text,
    previous_status text,
    imported_score numeric(8,2),
    imported_remarks text,
    imported_status text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    previous_score_status text,
    imported_score_status text DEFAULT 'entered'::text NOT NULL,
    CONSTRAINT ck_exam_mark_import_batch_items_row CHECK ((row_number > 0)),
    CONSTRAINT ck_exam_mark_import_batch_items_score_evidence CHECK ((((NOT previous_exists) OR ((previous_score_status = 'entered'::text) AND (previous_score IS NOT NULL)) OR ((previous_score_status <> 'entered'::text) AND (previous_score IS NULL))) AND (((imported_score_status = 'entered'::text) AND (imported_score IS NOT NULL)) OR ((imported_score_status <> 'entered'::text) AND (imported_score IS NULL))))),
    CONSTRAINT ck_exam_mark_import_batch_items_score_status CHECK ((((previous_score_status IS NULL) OR (previous_score_status = ANY (ARRAY['entered'::text, 'absent'::text, 'exempt'::text, 'not_assessed'::text, 'incomplete'::text, 'withheld'::text, 'medical_exception'::text, 'transfer_student'::text]))) AND (imported_score_status = ANY (ARRAY['entered'::text, 'absent'::text, 'exempt'::text, 'not_assessed'::text, 'incomplete'::text, 'withheld'::text, 'medical_exception'::text, 'transfer_student'::text]))))
);
ALTER TABLE ONLY public.exam_mark_import_batch_items FORCE ROW LEVEL SECURITY;
CREATE TABLE public.exam_mark_import_batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    file_name text NOT NULL,
    status text DEFAULT 'imported'::text NOT NULL,
    total_rows integer NOT NULL,
    valid_rows integer NOT NULL,
    invalid_rows integer DEFAULT 0 NOT NULL,
    duplicate_rows integer DEFAULT 0 NOT NULL,
    committed_rows integer NOT NULL,
    preview_hash character(64) NOT NULL,
    imported_by_user_id uuid NOT NULL,
    imported_at timestamp with time zone DEFAULT now() NOT NULL,
    rolled_back_by_user_id uuid,
    rolled_back_at timestamp with time zone,
    rollback_reason text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT ck_exam_mark_import_batches_counts CHECK (((total_rows >= 0) AND (valid_rows >= 0) AND (invalid_rows >= 0) AND (duplicate_rows >= 0) AND (committed_rows >= 0))),
    CONSTRAINT ck_exam_mark_import_batches_status CHECK ((status = ANY (ARRAY['imported'::text, 'rolled_back'::text, 'failed'::text])))
);
ALTER TABLE ONLY public.exam_mark_import_batches FORCE ROW LEVEL SECURITY;
CREATE TABLE public.exam_mark_versions (
    approval_state text NOT NULL,
    corrected_by_user_id uuid NOT NULL,
    correction_score numeric(65,30),
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    first_approver_user_id uuid,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mark_id uuid NOT NULL,
    metadata jsonb NOT NULL,
    original_score numeric(65,30),
    reason text NOT NULL,
    second_approver_user_id uuid,
    tenant_id text NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    original_score_status text DEFAULT 'entered'::text NOT NULL,
    correction_score_status text DEFAULT 'entered'::text NOT NULL,
    CONSTRAINT ck_exam_mark_versions_correction_score_status CHECK ((correction_score_status = ANY (ARRAY['entered'::text, 'absent'::text, 'exempt'::text, 'not_assessed'::text, 'incomplete'::text, 'withheld'::text, 'medical_exception'::text, 'transfer_student'::text]))),
    CONSTRAINT ck_exam_mark_versions_original_score_status CHECK ((original_score_status = ANY (ARRAY['entered'::text, 'absent'::text, 'exempt'::text, 'not_assessed'::text, 'incomplete'::text, 'withheld'::text, 'medical_exception'::text, 'transfer_student'::text]))),
    CONSTRAINT ck_exam_mark_versions_score_evidence CHECK (((((original_score_status = 'entered'::text) AND (original_score IS NOT NULL)) OR ((original_score_status <> 'entered'::text) AND (original_score IS NULL))) AND (((correction_score_status = 'entered'::text) AND (correction_score IS NOT NULL)) OR ((correction_score_status <> 'entered'::text) AND (correction_score IS NULL)))))
);
ALTER TABLE ONLY public.exam_mark_versions FORCE ROW LEVEL SECURITY;
CREATE TABLE public.exam_marks (
    academic_term_id uuid NOT NULL,
    assessment_id uuid NOT NULL,
    class_section_id uuid NOT NULL,
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    entered_by_user_id uuid NOT NULL,
    exam_series_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    remarks text,
    score numeric(65,30),
    student_id uuid NOT NULL,
    subject_id uuid NOT NULL,
    tenant_id text NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    updated_by_user_id uuid,
    status text DEFAULT 'draft'::text NOT NULL,
    reviewed_at timestamp(3) without time zone,
    locked_at timestamp(3) without time zone,
    submitted_at timestamp with time zone,
    published_at timestamp with time zone,
    score_status text DEFAULT 'entered'::text NOT NULL,
    CONSTRAINT ck_exam_marks_score_evidence CHECK ((((score_status = 'entered'::text) AND (score IS NOT NULL)) OR ((score_status <> 'entered'::text) AND (score IS NULL)))),
    CONSTRAINT ck_exam_marks_score_status CHECK ((score_status = ANY (ARRAY['entered'::text, 'absent'::text, 'exempt'::text, 'not_assessed'::text, 'incomplete'::text, 'withheld'::text, 'medical_exception'::text, 'transfer_student'::text])))
);
ALTER TABLE ONLY public.exam_marks FORCE ROW LEVEL SECURITY;
CREATE TABLE public.exam_readiness_checks (
    id text NOT NULL,
    school_id text NOT NULL,
    exam_cycle_id text NOT NULL,
    is_ready boolean DEFAULT false NOT NULL,
    details text,
    checked_by_user_id text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.exam_report_card_signatures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    signer_user_id uuid NOT NULL,
    signer_role text NOT NULL,
    storage_path text NOT NULL,
    original_file_name text NOT NULL,
    mime_type text NOT NULL,
    size_bytes integer NOT NULL,
    checksum_sha256 text NOT NULL,
    uploaded_by_user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_exam_report_card_signatures_checksum CHECK ((checksum_sha256 ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT ck_exam_report_card_signatures_mime CHECK ((mime_type = ANY (ARRAY['image/png'::text, 'image/jpeg'::text]))),
    CONSTRAINT ck_exam_report_card_signatures_role CHECK ((signer_role = ANY (ARRAY['class_teacher'::text, 'principal'::text]))),
    CONSTRAINT ck_exam_report_card_signatures_size CHECK (((size_bytes > 0) AND (size_bytes <= 2097152)))
);
ALTER TABLE ONLY public.exam_report_card_signatures FORCE ROW LEVEL SECURITY;
CREATE TABLE public.exam_result_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    batch_id uuid NOT NULL,
    exam_series_id uuid NOT NULL,
    class_section_id uuid,
    student_id uuid NOT NULL,
    raw_total numeric(12,2) NOT NULL,
    assessment_count integer NOT NULL,
    average_percentage numeric(8,2) NOT NULL,
    grade_label text,
    class_rank integer,
    processed_by_user_id uuid NOT NULL,
    processed_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_exam_result_snapshots_average CHECK ((average_percentage >= (0)::numeric)),
    CONSTRAINT ck_exam_result_snapshots_counts CHECK ((assessment_count > 0)),
    CONSTRAINT ck_exam_result_snapshots_rank CHECK (((class_rank IS NULL) OR (class_rank > 0)))
);
ALTER TABLE ONLY public.exam_result_snapshots FORCE ROW LEVEL SECURITY;
CREATE TABLE public.exam_series (
    academic_term_id uuid NOT NULL,
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    created_by_user_id uuid NOT NULL,
    ends_on timestamp(3) without time zone NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    starts_on timestamp(3) without time zone NOT NULL,
    tenant_id text NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    locked_at timestamp with time zone,
    published_at timestamp with time zone,
    grading_system_id uuid,
    CONSTRAINT ck_exam_series_status CHECK ((status = ANY (ARRAY['draft'::text, 'submitted'::text, 'reviewed'::text, 'locked'::text, 'published'::text, 'archived'::text])))
);
ALTER TABLE ONLY public.exam_series FORCE ROW LEVEL SECURITY;
CREATE TABLE public.exam_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    lock_after_deadline boolean DEFAULT true NOT NULL,
    grace_period_hours integer DEFAULT 24 NOT NULL,
    include_school_logo boolean DEFAULT true NOT NULL,
    include_principal_signature boolean DEFAULT true NOT NULL,
    include_official_stamp boolean DEFAULT true NOT NULL,
    block_results_for_fee_balances boolean DEFAULT true NOT NULL,
    fee_balance_block_threshold numeric(12,2) DEFAULT 1000 NOT NULL,
    show_student_rank_to_parents boolean DEFAULT true NOT NULL,
    updated_by_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_exam_settings_fee_threshold CHECK ((fee_balance_block_threshold >= (0)::numeric)),
    CONSTRAINT ck_exam_settings_grace_period CHECK (((grace_period_hours >= 0) AND (grace_period_hours <= 168)))
);
ALTER TABLE ONLY public.exam_settings FORCE ROW LEVEL SECURITY;
CREATE TABLE public.exam_settings_audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    action text NOT NULL,
    actor_user_id uuid,
    previous_settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    new_settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE ONLY public.exam_settings_audit_logs FORCE ROW LEVEL SECURITY;
CREATE TABLE public.exam_student_cases (
    case_type text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    description text NOT NULL,
    exam_series_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reported_by_user_id uuid,
    student_id uuid NOT NULL,
    tenant_id text NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    resolution text
);
ALTER TABLE ONLY public.exam_student_cases FORCE ROW LEVEL SECURITY;
CREATE TABLE public.exam_subject_weightings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    exam_series_id uuid,
    subject_id uuid NOT NULL,
    weight numeric(65,30) NOT NULL,
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    grading_policy_id uuid,
    is_compulsory boolean DEFAULT true NOT NULL
);
ALTER TABLE ONLY public.exam_subject_weightings FORCE ROW LEVEL SECURITY;
CREATE TABLE public.exam_subjects (
    id text NOT NULL,
    school_id text NOT NULL,
    exam_cycle_id text NOT NULL,
    class_id text NOT NULL,
    subject_id text NOT NULL,
    max_marks double precision NOT NULL,
    grading_scale_id text,
    status public."ExamSubjectStatus" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.exam_timetable_slots (
    assessment_id uuid,
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    date date NOT NULL,
    end_time time without time zone NOT NULL,
    exam_series_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    room_name text,
    start_time time without time zone NOT NULL,
    tenant_id text NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'scheduled'::text NOT NULL
);
ALTER TABLE ONLY public.exam_timetable_slots FORCE ROW LEVEL SECURITY;
CREATE TABLE public.facility_issues (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    title text NOT NULL,
    description text,
    location text NOT NULL,
    reported_by_user_id uuid,
    reported_by_name text,
    priority text DEFAULT 'normal'::text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    resolved_at timestamp with time zone,
    resolution_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    audit_log_reference uuid,
    school_id text,
    due_date date
);
ALTER TABLE ONLY public.facility_issues FORCE ROW LEVEL SECURITY;
CREATE TABLE public.fee_items (
    id text NOT NULL,
    school_id text NOT NULL,
    fee_structure_id text NOT NULL,
    name text NOT NULL,
    amount double precision NOT NULL,
    is_optional boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.fee_structures (
    id text DEFAULT gen_random_uuid() NOT NULL,
    school_id text,
    academic_year_id text,
    term_id text,
    class_id text,
    boarding_status public."BoardingStatus",
    name text NOT NULL,
    description text,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp(3) without time zone,
    tenant_id text NOT NULL,
    academic_year text NOT NULL,
    term text NOT NULL,
    grade_level text NOT NULL,
    class_name text,
    currency_code character(3) DEFAULT 'KES'::bpchar NOT NULL,
    due_days integer DEFAULT 14 NOT NULL,
    total_amount_minor bigint DEFAULT 0 NOT NULL,
    line_items jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_by_user_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);
ALTER TABLE ONLY public.fee_structures FORCE ROW LEVEL SECURITY;
CREATE TABLE public.fee_waivers (
    id text NOT NULL,
    school_id text NOT NULL,
    student_id text NOT NULL,
    amount double precision NOT NULL,
    reason text NOT NULL,
    requested_by_user_id text NOT NULL,
    approved_by_user_id text,
    status public."ApprovalStatus" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.file_objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    storage_path text NOT NULL,
    original_file_name text NOT NULL,
    mime_type text NOT NULL,
    size_bytes bigint NOT NULL,
    sha256 text NOT NULL,
    content bytea,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    storage_backend text DEFAULT 'database'::text NOT NULL,
    object_storage_provider text,
    object_storage_bucket text,
    object_storage_key text,
    object_storage_etag text,
    retention_policy text DEFAULT 'operational'::text NOT NULL,
    retention_expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_file_objects_database_content CHECK ((((storage_backend = 'database'::text) AND (content IS NOT NULL)) OR (storage_backend = 'object_storage'::text))),
    CONSTRAINT ck_file_objects_object_storage_metadata CHECK (((storage_backend = 'database'::text) OR ((object_storage_provider IS NOT NULL) AND (object_storage_bucket IS NOT NULL) AND (object_storage_key IS NOT NULL)))),
    CONSTRAINT ck_file_objects_sha256 CHECK ((sha256 ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT ck_file_objects_size CHECK ((size_bytes >= 0)),
    CONSTRAINT ck_file_objects_storage_backend CHECK ((storage_backend = ANY (ARRAY['database'::text, 'object_storage'::text])))
);
ALTER TABLE ONLY public.file_objects FORCE ROW LEVEL SECURITY;
CREATE TABLE public.file_uploads (
    id text NOT NULL,
    school_id text NOT NULL,
    uploaded_by_user_id text NOT NULL,
    file_name text NOT NULL,
    file_url text NOT NULL,
    mime_type text NOT NULL,
    size_bytes integer NOT NULL,
    related_entity_type text,
    related_entity_id text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.finance_approval_requests (
    action text NOT NULL,
    amount_minor numeric(10,2) NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    currency_code text NOT NULL,
    evidence text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reason text NOT NULL,
    reconciliation_batch_id uuid NOT NULL,
    reconciliation_discrepancy_id uuid CONSTRAINT finance_approval_requests_reconciliation_discrepancy_i_not_null NOT NULL,
    requested_by_user_id uuid NOT NULL,
    subject_id uuid NOT NULL,
    subject_type text NOT NULL,
    tenant_id text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    status text DEFAULT 'pending_first_approval'::text NOT NULL,
    close_period_id uuid,
    first_approver_user_id uuid,
    first_approved_at timestamp with time zone,
    second_approver_user_id uuid,
    second_approved_at timestamp with time zone,
    rejected_by_user_id uuid,
    rejected_at timestamp with time zone
);
ALTER TABLE ONLY public.finance_approval_requests FORCE ROW LEVEL SECURITY;
CREATE TABLE public.finance_close_periods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    period_name text NOT NULL,
    period_started_at timestamp with time zone NOT NULL,
    period_ended_at timestamp with time zone NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    closed_by_user_id uuid,
    closed_at timestamp with time zone,
    reopened_by_user_id uuid,
    reopened_at timestamp with time zone,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_finance_close_periods_status CHECK ((status = ANY (ARRAY['open'::text, 'closed'::text, 'reopened'::text]))),
    CONSTRAINT ck_finance_close_periods_window CHECK ((period_ended_at > period_started_at))
);
ALTER TABLE ONLY public.finance_close_periods FORCE ROW LEVEL SECURITY;
CREATE TABLE public.finance_fee_categories (
    amount_minor numeric(10,2) NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    currency_code text NOT NULL,
    description text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    tenant_id text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
ALTER TABLE ONLY public.finance_fee_categories FORCE ROW LEVEL SECURITY;
CREATE TABLE public.finance_tasks (
    assigned_to text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by text NOT NULL,
    description text NOT NULL,
    due_date text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    title text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.front_office_tickets (
    id text NOT NULL,
    school_id text NOT NULL,
    ticket_number text NOT NULL,
    visitor_name text,
    guardian_id text,
    student_id text,
    issue_type public."TicketIssueType" NOT NULL,
    description text NOT NULL,
    assigned_to_user_id text,
    priority public."TaskPriority" NOT NULL,
    status public."TicketStatus" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.gate_incidents (
    id text NOT NULL,
    school_id text NOT NULL,
    reported_by_user_id text NOT NULL,
    incident_time timestamp(3) without time zone NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    severity public."IncidentSeverity" NOT NULL,
    status public."GateIncidentStatus" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.grading_scale_ranges (
    id text NOT NULL,
    school_id text NOT NULL,
    grading_scale_id text NOT NULL,
    min_score double precision NOT NULL,
    max_score double precision NOT NULL,
    grade text NOT NULL,
    points double precision,
    descriptor text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.grading_scales (
    id text NOT NULL,
    school_id text NOT NULL,
    name text NOT NULL,
    curriculum_type public."CurriculumType" NOT NULL,
    description text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.group_guidance_sessions (
    id text NOT NULL,
    school_id text NOT NULL,
    topic text NOT NULL,
    facilitator_user_id text NOT NULL,
    session_date timestamp(3) without time zone NOT NULL,
    attendance_count integer DEFAULT 0 NOT NULL,
    notes text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.guardian_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    display_name text NOT NULL,
    normalized_phone text NOT NULL,
    email text,
    user_id uuid,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_guardian_profiles_name_not_blank CHECK ((btrim(display_name) <> ''::text)),
    CONSTRAINT ck_guardian_profiles_phone_not_blank CHECK ((btrim(normalized_phone) <> ''::text)),
    CONSTRAINT guardian_profiles_status_check CHECK ((status = ANY (ARRAY['active'::text, 'revoked'::text])))
);
ALTER TABLE ONLY public.guardian_profiles FORCE ROW LEVEL SECURITY;
CREATE TABLE public.hod_assignments (
    id text NOT NULL,
    school_id text NOT NULL,
    department_id text NOT NULL,
    teacher_user_id text NOT NULL,
    academic_year_id text NOT NULL,
    start_date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    end_date timestamp(3) without time zone,
    scope public."DepartmentScope" DEFAULT 'BOTH'::public."DepartmentScope" NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.hod_reviews (
    id text NOT NULL,
    school_id text NOT NULL,
    mark_submission_id text NOT NULL,
    hod_user_id text NOT NULL,
    status public."MarksEntryStatus" NOT NULL,
    reason text,
    reviewed_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.hostel_allocations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    hostel_id uuid,
    room_id uuid,
    student_id uuid NOT NULL,
    allocated_from date DEFAULT CURRENT_DATE NOT NULL,
    allocated_to date,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    audit_log_reference uuid,
    school_id text,
    priority text DEFAULT 'normal'::text NOT NULL,
    due_date date
);
ALTER TABLE ONLY public.hostel_allocations FORCE ROW LEVEL SECURITY;
CREATE TABLE public.hostel_audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    actor_user_id uuid,
    action text NOT NULL,
    resource_type text NOT NULL,
    resource_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    audit_log_reference uuid,
    school_id text,
    status text DEFAULT 'open'::text NOT NULL,
    priority text DEFAULT 'normal'::text NOT NULL,
    due_date date
);
ALTER TABLE ONLY public.hostel_audit_logs FORCE ROW LEVEL SECURITY;
CREATE TABLE public.hostel_issues (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    hostel_id uuid,
    student_id uuid,
    title text NOT NULL,
    severity text DEFAULT 'warning'::text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    audit_log_reference uuid,
    school_id text,
    priority text DEFAULT 'normal'::text NOT NULL,
    due_date date
);
ALTER TABLE ONLY public.hostel_issues FORCE ROW LEVEL SECURITY;
CREATE TABLE public.hostel_meal_consumption (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    hostel_id uuid,
    meal_date date DEFAULT CURRENT_DATE NOT NULL,
    meal_type text NOT NULL,
    expected_count integer DEFAULT 0 NOT NULL,
    served_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    audit_log_reference uuid,
    school_id text,
    status text DEFAULT 'open'::text NOT NULL,
    priority text DEFAULT 'normal'::text NOT NULL,
    due_date date
);
ALTER TABLE ONLY public.hostel_meal_consumption FORCE ROW LEVEL SECURITY;
CREATE TABLE public.hostel_rooms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    hostel_id uuid,
    room_name text NOT NULL,
    capacity integer DEFAULT 0 NOT NULL,
    occupied_count integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'available'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    audit_log_reference uuid,
    school_id text,
    priority text DEFAULT 'normal'::text NOT NULL,
    due_date date
);
ALTER TABLE ONLY public.hostel_rooms FORCE ROW LEVEL SECURITY;
CREATE TABLE public.hostels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    title text NOT NULL,
    category text,
    owner_name text,
    status text DEFAULT 'open'::text NOT NULL,
    priority text DEFAULT 'normal'::text NOT NULL,
    due_date date,
    metric_count integer DEFAULT 0 NOT NULL,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    audit_log_reference uuid,
    school_id text,
    CONSTRAINT ck_hostels_priority CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'critical'::text])))
);
ALTER TABLE ONLY public.hostels FORCE ROW LEVEL SECURITY;
CREATE TABLE public.idempotency_keys (
    id text DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    user_id text,
    scope text NOT NULL,
    idempotency_key text NOT NULL,
    request_method text NOT NULL,
    request_path text NOT NULL,
    request_hash text NOT NULL,
    status text DEFAULT 'IN_PROGRESS'::public."IdempotencyStatus" NOT NULL,
    response_status_code integer,
    response_body jsonb,
    locked_at timestamp(3) without time zone,
    completed_at timestamp(3) without time zone,
    expires_at timestamp(3) without time zone NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    CONSTRAINT ck_idempotency_keys_status CHECK ((lower(status) = ANY (ARRAY['in_progress'::text, 'completed'::text, 'failed'::text, 'expired'::text])))
);
ALTER TABLE ONLY public.idempotency_keys FORCE ROW LEVEL SECURITY;
CREATE TABLE public.import_batches (
    id text NOT NULL,
    school_id text NOT NULL,
    import_type public."ImportType" NOT NULL,
    file_upload_id text NOT NULL,
    uploaded_by_user_id text NOT NULL,
    status public."ImportStatus" NOT NULL,
    total_rows integer NOT NULL,
    valid_rows integer NOT NULL,
    invalid_rows integer NOT NULL,
    error_summary_json jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.import_rows (
    id text NOT NULL,
    school_id text NOT NULL,
    import_batch_id text NOT NULL,
    row_number integer NOT NULL,
    raw_data_json jsonb NOT NULL,
    validation_status public."RowValidationStatus" NOT NULL,
    error_messages_json jsonb,
    created_entity_type text,
    created_entity_id text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.integration_logs (
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by_user_id uuid,
    error_message text,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    integration_type text NOT NULL,
    operation text NOT NULL,
    provider_reference text,
    request_id text,
    status text NOT NULL,
    tenant_id text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
ALTER TABLE ONLY public.integration_logs FORCE ROW LEVEL SECURITY;
CREATE TABLE public.inventory_categories (
    id text NOT NULL,
    school_id text NOT NULL,
    name text NOT NULL,
    type public."InventoryCategoryType" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp(3) without time zone,
    tenant_id text NOT NULL,
    manager text,
    storage_zones text
);
ALTER TABLE ONLY public.inventory_categories FORCE ROW LEVEL SECURITY;
CREATE TABLE public.inventory_incidents (
    cost_impact numeric(10,2) NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    incident_number text NOT NULL,
    incident_type text NOT NULL,
    item_id uuid NOT NULL,
    notes text NOT NULL,
    quantity integer NOT NULL,
    reason text NOT NULL,
    responsible_department text NOT NULL,
    status text NOT NULL,
    tenant_id text NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    reported_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE ONLY public.inventory_incidents FORCE ROW LEVEL SECURITY;
CREATE TABLE public.inventory_item_balances (
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    item_id uuid NOT NULL,
    location_code text NOT NULL,
    quantity_on_hand integer NOT NULL,
    tenant_id text NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL
);
ALTER TABLE ONLY public.inventory_item_balances FORCE ROW LEVEL SECURITY;
CREATE TABLE public.inventory_items (
    id text NOT NULL,
    school_id text NOT NULL,
    category_id text NOT NULL,
    name text NOT NULL,
    sku text,
    unit text NOT NULL,
    state public."InventoryState" NOT NULL,
    quantity_available double precision NOT NULL,
    reorder_level double precision NOT NULL,
    is_perishable boolean DEFAULT false NOT NULL,
    expiry_date date,
    storage_location text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp(3) without time zone,
    tenant_id text NOT NULL,
    status text,
    item_name text,
    quantity_on_hand integer,
    unit_price numeric(12,2) DEFAULT 0 NOT NULL,
    notes text,
    is_archived boolean DEFAULT false NOT NULL,
    CONSTRAINT ck_inventory_items_quantity_non_negative CHECK ((quantity_on_hand >= 0))
);
ALTER TABLE ONLY public.inventory_items FORCE ROW LEVEL SECURITY;
CREATE TABLE public.inventory_locations (
    code text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    status text NOT NULL,
    tenant_id text NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL
);
ALTER TABLE ONLY public.inventory_locations FORCE ROW LEVEL SECURITY;
CREATE TABLE public.inventory_purchase_orders (
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by_user_id uuid NOT NULL,
    expected_delivery_date text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lines text NOT NULL,
    notes text NOT NULL,
    ordered_at timestamp(3) without time zone NOT NULL,
    po_number text NOT NULL,
    status text NOT NULL,
    supplier_id uuid NOT NULL,
    tenant_id text NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL
);
ALTER TABLE ONLY public.inventory_purchase_orders FORCE ROW LEVEL SECURITY;
CREATE TABLE public.inventory_request_backorders (
    backordered_quantity integer NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    item_id uuid NOT NULL,
    request_id uuid NOT NULL,
    requested_quantity integer NOT NULL,
    reserved_quantity integer NOT NULL,
    status text NOT NULL,
    tenant_id text NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL
);
ALTER TABLE ONLY public.inventory_request_backorders FORCE ROW LEVEL SECURITY;
CREATE TABLE public.inventory_request_items (
    id text NOT NULL,
    school_id text NOT NULL,
    inventory_request_id text NOT NULL,
    inventory_item_id text NOT NULL,
    quantity_requested double precision NOT NULL,
    quantity_approved double precision,
    quantity_issued double precision,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.inventory_requests (
    id text NOT NULL,
    school_id text NOT NULL,
    requested_by_user_id text NOT NULL,
    department_id text,
    title text NOT NULL,
    reason text NOT NULL,
    status text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp(3) without time zone,
    tenant_id text NOT NULL
);
ALTER TABLE ONLY public.inventory_requests FORCE ROW LEVEL SECURITY;
CREATE TABLE public.inventory_requisitions (
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    department text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lines text NOT NULL,
    needed_by text NOT NULL,
    notes text NOT NULL,
    priority text NOT NULL,
    requested_by text NOT NULL,
    requisition_number text NOT NULL,
    status text NOT NULL,
    tenant_id uuid NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.inventory_reservations (
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    item_id uuid NOT NULL,
    quantity integer NOT NULL,
    request_id uuid NOT NULL,
    reserved_by_user_id uuid NOT NULL,
    status text NOT NULL,
    tenant_id text NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL
);
ALTER TABLE ONLY public.inventory_reservations FORCE ROW LEVEL SECURITY;
CREATE TABLE public.inventory_stock_count_snapshots (
    counted_at timestamp(3) without time zone NOT NULL,
    counted_by_user_id uuid NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lines text NOT NULL,
    location_code text NOT NULL,
    notes text NOT NULL,
    snapshot_number text NOT NULL,
    status text NOT NULL,
    tenant_id text NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    variance_count integer NOT NULL
);
ALTER TABLE ONLY public.inventory_stock_count_snapshots FORCE ROW LEVEL SECURITY;
CREATE TABLE public.inventory_stock_movements (
    id text NOT NULL,
    school_id text NOT NULL,
    inventory_item_id text NOT NULL,
    movement_type public."StockMovementType" NOT NULL,
    quantity double precision NOT NULL,
    from_location text,
    to_location text,
    issued_to_department_id text,
    issued_to_user_id text,
    reason text,
    recorded_by_user_id text NOT NULL,
    requires_approval boolean NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp(3) without time zone,
    tenant_id text NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    submission_id text,
    before_quantity integer,
    after_quantity integer,
    department text,
    counterparty text,
    batch_number text,
    expiry_date date
);
ALTER TABLE ONLY public.inventory_stock_movements FORCE ROW LEVEL SECURITY;
CREATE TABLE public.inventory_suppliers (
    contact_person text NOT NULL,
    county text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    email text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metadata jsonb NOT NULL,
    phone text NOT NULL,
    status text NOT NULL,
    supplier_name text NOT NULL,
    tenant_id text NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL
);
ALTER TABLE ONLY public.inventory_suppliers FORCE ROW LEVEL SECURITY;
CREATE TABLE public.inventory_transfers (
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    from_location text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lines text NOT NULL,
    notes text NOT NULL,
    requested_by text NOT NULL,
    status text NOT NULL,
    tenant_id text NOT NULL,
    to_location text NOT NULL,
    transfer_number text NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL
);
ALTER TABLE ONLY public.inventory_transfers FORCE ROW LEVEL SECURITY;
CREATE TABLE public.invoice_items (
    id text NOT NULL,
    school_id text NOT NULL,
    invoice_id text NOT NULL,
    fee_item_name text NOT NULL,
    amount double precision NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.invoices (
    id text NOT NULL,
    school_id text NOT NULL,
    student_id text NOT NULL,
    academic_year_id text NOT NULL,
    term_id text NOT NULL,
    invoice_number text NOT NULL,
    amount_due double precision NOT NULL,
    amount_paid double precision DEFAULT 0 NOT NULL,
    balance double precision NOT NULL,
    status text NOT NULL,
    due_date date NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone,
    tenant_id text,
    subscription_id uuid,
    payment_intent_id uuid,
    description text DEFAULT 'School fee invoice'::text,
    subtotal_amount_minor bigint,
    tax_amount_minor bigint DEFAULT 0,
    total_amount_minor bigint,
    amount_paid_minor bigint DEFAULT 0,
    billing_phone_number text,
    issued_at timestamp with time zone DEFAULT now(),
    due_at timestamp with time zone,
    paid_at timestamp with time zone,
    voided_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    currency_code character(3) DEFAULT 'KES'::bpchar NOT NULL
);
ALTER TABLE ONLY public.invoices FORCE ROW LEVEL SECURITY;
CREATE TABLE public.iot_alerts (
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by_user_id uuid NOT NULL,
    device_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message text NOT NULL,
    metadata jsonb NOT NULL,
    severity text NOT NULL,
    tenant_id text DEFAULT '00000000-0000-0000-0000-000000000000'::text NOT NULL,
    title text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    audit_log_reference uuid,
    status text DEFAULT 'open'::text NOT NULL,
    resolved_by_user_id uuid,
    resolved_at timestamp with time zone
);
ALTER TABLE ONLY public.iot_alerts FORCE ROW LEVEL SECURITY;
CREATE TABLE public.iot_audit_logs (
    action text NOT NULL,
    actor_user_id uuid NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metadata jsonb NOT NULL,
    resource_id uuid NOT NULL,
    resource_type text NOT NULL,
    tenant_id text DEFAULT '00000000-0000-0000-0000-000000000000'::text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    audit_log_reference uuid
);
ALTER TABLE ONLY public.iot_audit_logs FORCE ROW LEVEL SECURITY;
CREATE TABLE public.iot_device_commands (
    command_type text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    device_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payload jsonb NOT NULL,
    priority text NOT NULL,
    requested_by_user_id uuid NOT NULL,
    status text NOT NULL,
    tenant_id text DEFAULT '00000000-0000-0000-0000-000000000000'::text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    audit_log_reference uuid,
    sent_at timestamp with time zone,
    acknowledged_at timestamp with time zone,
    result_metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);
ALTER TABLE ONLY public.iot_device_commands FORCE ROW LEVEL SECURITY;
CREATE TABLE public.iot_device_credentials (
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by_user_id uuid NOT NULL,
    credential_hash text NOT NULL,
    device_id uuid NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key_id text NOT NULL,
    label text NOT NULL,
    tenant_id text DEFAULT '00000000-0000-0000-0000-000000000000'::text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    audit_log_reference uuid,
    status text DEFAULT 'active'::text NOT NULL,
    last_used_at timestamp with time zone
);
ALTER TABLE ONLY public.iot_device_credentials FORCE ROW LEVEL SECURITY;
CREATE TABLE public.iot_devices (
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by_user_id uuid NOT NULL,
    device_type text NOT NULL,
    external_device_id text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    installation_date date NOT NULL,
    location_name text NOT NULL,
    metadata jsonb NOT NULL,
    name text NOT NULL,
    tenant_id text DEFAULT '00000000-0000-0000-0000-000000000000'::text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    audit_log_reference uuid,
    status text DEFAULT 'offline'::text NOT NULL,
    health_status text DEFAULT 'unknown'::text NOT NULL,
    last_seen_at timestamp with time zone
);
ALTER TABLE ONLY public.iot_devices FORCE ROW LEVEL SECURITY;
CREATE TABLE public.iot_gateway_ingestions (
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    credential_id uuid NOT NULL,
    device_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    idempotency_key text NOT NULL,
    metadata jsonb NOT NULL,
    payload_sha256 text NOT NULL,
    reading_count integer NOT NULL,
    tenant_id text DEFAULT '00000000-0000-0000-0000-000000000000'::text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    audit_log_reference uuid,
    status text DEFAULT 'accepted'::text NOT NULL,
    accepted_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE ONLY public.iot_gateway_ingestions FORCE ROW LEVEL SECURITY;
CREATE TABLE public.iot_telemetry_readings (
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    device_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metadata jsonb NOT NULL,
    metric_name text NOT NULL,
    metric_value numeric NOT NULL,
    recorded_at timestamp(3) without time zone NOT NULL,
    recorded_by_user_id uuid NOT NULL,
    severity text NOT NULL,
    tenant_id text DEFAULT '00000000-0000-0000-0000-000000000000'::text NOT NULL,
    unit text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    audit_log_reference uuid
);
ALTER TABLE ONLY public.iot_telemetry_readings FORCE ROW LEVEL SECURITY;
CREATE TABLE public.lab_attendance (
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recorded_by text NOT NULL,
    session_id uuid NOT NULL,
    status text NOT NULL,
    student_id uuid NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    school_id text
);
ALTER TABLE ONLY public.lab_attendance FORCE ROW LEVEL SECURITY;
CREATE TABLE public.lab_breakage_loss_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    item_id uuid,
    item_source text,
    item_name text NOT NULL,
    quantity numeric(12,3) NOT NULL,
    incident_date date NOT NULL,
    practical_request_id uuid,
    practical_or_activity text,
    class_name text,
    teacher_name text,
    classification text NOT NULL,
    explanation text NOT NULL,
    status text DEFAULT 'unresolved'::text NOT NULL,
    referral_required boolean DEFAULT false NOT NULL,
    referral_status text,
    submission_id text,
    recorded_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    school_id text,
    CONSTRAINT ck_lab_breakage_loss_classification CHECK ((classification = ANY (ARRAY['accidental_breakage'::text, 'wear_and_tear'::text, 'equipment_failure'::text, 'missing'::text, 'chemical_spill'::text, 'improper_use'::text, 'unknown'::text]))),
    CONSTRAINT ck_lab_breakage_loss_quantity CHECK ((quantity > (0)::numeric))
);
ALTER TABLE ONLY public.lab_breakage_loss_records FORCE ROW LEVEL SECURITY;
CREATE TABLE public.lab_departments (
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    hod_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    type text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    school_id text
);
ALTER TABLE ONLY public.lab_departments FORCE ROW LEVEL SECURITY;
CREATE TABLE public.lab_equipment (
    asset_tag text,
    condition_status text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    department_id uuid,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    is_consumable boolean NOT NULL,
    lab_id uuid,
    name text NOT NULL,
    quantity_available numeric(12,3) NOT NULL,
    quantity_total numeric(12,3) NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    school_id text,
    quantity_in_use numeric(12,3) DEFAULT 0 NOT NULL,
    quantity_damaged numeric(12,3) DEFAULT 0 NOT NULL,
    item_type text DEFAULT 'apparatus'::text NOT NULL,
    category text DEFAULT 'Apparatus or Equipment'::text NOT NULL,
    unit text DEFAULT 'Pieces'::text NOT NULL,
    minimum_stock_level numeric(12,3) DEFAULT 0 NOT NULL,
    storage_location_id uuid,
    storage_location text,
    tracking_method text DEFAULT 'quantity'::text NOT NULL,
    serial_number text,
    model text,
    notes text,
    quantity_missing numeric(12,3) DEFAULT 0 NOT NULL,
    quantity_under_maintenance numeric(12,3) DEFAULT 0 NOT NULL,
    submission_id text,
    CONSTRAINT ck_lab_equipment_quantities CHECK (((quantity_total >= (0)::numeric) AND (quantity_available >= (0)::numeric) AND (quantity_in_use >= (0)::numeric) AND (quantity_damaged >= (0)::numeric) AND (quantity_missing >= (0)::numeric) AND (quantity_under_maintenance >= (0)::numeric) AND (((((quantity_available + quantity_in_use) + quantity_damaged) + quantity_missing) + quantity_under_maintenance) <= quantity_total)))
);
ALTER TABLE ONLY public.lab_equipment FORCE ROW LEVEL SECURITY;
CREATE TABLE public.lab_issue_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    issue_id uuid NOT NULL,
    request_item_id uuid NOT NULL,
    item_id uuid NOT NULL,
    item_source text NOT NULL,
    item_name text NOT NULL,
    unit text NOT NULL,
    quantity_issued numeric(12,3) NOT NULL,
    is_returnable boolean NOT NULL,
    returned_good numeric(12,3) DEFAULT 0 NOT NULL,
    used_or_consumed numeric(12,3) DEFAULT 0 NOT NULL,
    broken numeric(12,3) DEFAULT 0 NOT NULL,
    missing numeric(12,3) DEFAULT 0 NOT NULL,
    still_with_teacher numeric(12,3) DEFAULT 0 NOT NULL,
    sent_for_maintenance numeric(12,3) DEFAULT 0 NOT NULL,
    spilled_or_wasted numeric(12,3) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    school_id text,
    CONSTRAINT ck_lab_issue_lines_quantities CHECK (((quantity_issued > (0)::numeric) AND (returned_good >= (0)::numeric) AND (used_or_consumed >= (0)::numeric) AND (broken >= (0)::numeric) AND (missing >= (0)::numeric) AND (still_with_teacher >= (0)::numeric) AND (sent_for_maintenance >= (0)::numeric) AND (spilled_or_wasted >= (0)::numeric))),
    CONSTRAINT ck_lab_issue_lines_source CHECK ((item_source = ANY (ARRAY['equipment'::text, 'chemical'::text])))
);
ALTER TABLE ONLY public.lab_issue_lines FORCE ROW LEVEL SECURITY;
CREATE TABLE public.lab_issue_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    practical_request_id uuid NOT NULL,
    received_by text NOT NULL,
    expected_return_at timestamp with time zone,
    status text DEFAULT 'issued'::text NOT NULL,
    notes text,
    submission_id text,
    issued_by uuid,
    issued_at timestamp with time zone DEFAULT now() NOT NULL,
    last_return_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    school_id text,
    CONSTRAINT ck_lab_issue_records_status CHECK ((status = ANY (ARRAY['issued'::text, 'partially_returned'::text, 'returned'::text, 'unresolved'::text])))
);
ALTER TABLE ONLY public.lab_issue_records FORCE ROW LEVEL SECURITY;
CREATE TABLE public.lab_issue_returns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    issue_id uuid NOT NULL,
    submission_id text NOT NULL,
    notes text,
    recorded_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    school_id text
);
ALTER TABLE ONLY public.lab_issue_returns FORCE ROW LEVEL SECURITY;
CREATE TABLE public.lab_practical_request_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    request_id uuid NOT NULL,
    item_id uuid,
    item_source text,
    item_name text NOT NULL,
    unit text NOT NULL,
    requested_quantity numeric(12,3) NOT NULL,
    approved_quantity numeric(12,3),
    prepared_quantity numeric(12,3) DEFAULT 0 NOT NULL,
    available_quantity_snapshot numeric(12,3),
    is_returnable boolean DEFAULT true NOT NULL,
    substitute_item_id uuid,
    substitute_item_name text,
    status text DEFAULT 'requested'::text NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    school_id text,
    CONSTRAINT ck_lab_practical_request_items_quantities CHECK (((requested_quantity > (0)::numeric) AND ((approved_quantity IS NULL) OR (approved_quantity >= (0)::numeric)) AND (prepared_quantity >= (0)::numeric))),
    CONSTRAINT ck_lab_practical_request_items_source CHECK (((item_source IS NULL) OR (item_source = ANY (ARRAY['equipment'::text, 'chemical'::text]))))
);
ALTER TABLE ONLY public.lab_practical_request_items FORCE ROW LEVEL SECURITY;
CREATE TABLE public.lab_practical_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    subject text NOT NULL,
    class_name text NOT NULL,
    practical_date date NOT NULL,
    lesson_time time without time zone NOT NULL,
    practical_title text NOT NULL,
    teacher_id uuid,
    teacher_name text NOT NULL,
    learner_groups integer,
    teacher_notes text,
    preparation_note text,
    status text DEFAULT 'requested'::text NOT NULL,
    is_assessment boolean DEFAULT false NOT NULL,
    confidential_notes text,
    authorized_roles text[] DEFAULT ARRAY['LAB_TECHNICIAN'::text, 'PRINCIPAL'::text, 'DEPUTY_PRINCIPAL'::text, 'DEAN_ACADEMICS'::text, 'EXAMS_MANAGER'::text] NOT NULL,
    rejection_reason text,
    submission_id text,
    last_review_submission_id text,
    last_preparation_submission_id text,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    school_id text,
    CONSTRAINT ck_lab_practical_requests_groups CHECK (((learner_groups IS NULL) OR (learner_groups > 0))),
    CONSTRAINT ck_lab_practical_requests_status CHECK ((status = ANY (ARRAY['requested'::text, 'under_review'::text, 'partially_available'::text, 'preparing'::text, 'ready'::text, 'issued'::text, 'partially_returned'::text, 'completed'::text, 'rejected'::text])))
);
ALTER TABLE ONLY public.lab_practical_requests FORCE ROW LEVEL SECURITY;
CREATE TABLE public.lab_safety_checks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    location_name text NOT NULL,
    checked_on date NOT NULL,
    next_due_date date NOT NULL,
    checklist jsonb DEFAULT '[]'::jsonb NOT NULL,
    notes text,
    status text DEFAULT 'completed'::text NOT NULL,
    submission_id text,
    checked_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    school_id text,
    CONSTRAINT ck_lab_safety_checks_status CHECK ((status = ANY (ARRAY['completed'::text, 'follow_up_required'::text])))
);
ALTER TABLE ONLY public.lab_safety_checks FORCE ROW LEVEL SECURITY;
CREATE TABLE public.lab_session_chemical_usage (
    chemical_id uuid NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    issued_by text NOT NULL,
    quantity_used integer NOT NULL,
    session_id uuid NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    school_id text
);
ALTER TABLE ONLY public.lab_session_chemical_usage FORCE ROW LEVEL SECURITY;
CREATE TABLE public.lab_session_equipment_usage (
    condition_after_use text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    equipment_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quantity_used integer NOT NULL,
    session_id uuid NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    school_id text
);
ALTER TABLE ONLY public.lab_session_equipment_usage FORCE ROW LEVEL SECURITY;
CREATE TABLE public.lab_sessions (
    class_section_id uuid NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    end_time text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    is_mandatory boolean NOT NULL,
    lab_id uuid NOT NULL,
    session_date text NOT NULL,
    start_time text NOT NULL,
    subject_id uuid NOT NULL,
    subject_name text NOT NULL,
    teacher_id uuid NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    school_id text
);
ALTER TABLE ONLY public.lab_sessions FORCE ROW LEVEL SECURITY;
CREATE TABLE public.lab_stock_movements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    item_id uuid NOT NULL,
    item_source text NOT NULL,
    item_name text NOT NULL,
    movement_type text NOT NULL,
    quantity numeric(12,3) NOT NULL,
    quantity_before numeric(12,3) NOT NULL,
    quantity_after numeric(12,3) NOT NULL,
    unit text NOT NULL,
    practical_request_id uuid,
    issue_id uuid,
    stocktake_id uuid,
    reason text,
    submission_id text,
    recorded_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    school_id text,
    CONSTRAINT ck_lab_stock_movements_quantity CHECK ((quantity >= (0)::numeric)),
    CONSTRAINT ck_lab_stock_movements_source CHECK ((item_source = ANY (ARRAY['equipment'::text, 'chemical'::text]))),
    CONSTRAINT ck_lab_stock_movements_type CHECK ((movement_type = ANY (ARRAY['item_created'::text, 'stock_added'::text, 'issued'::text, 'returned'::text, 'consumed'::text, 'broken'::text, 'missing'::text, 'maintenance'::text, 'wasted'::text, 'stocktake_adjustment'::text])))
);
ALTER TABLE ONLY public.lab_stock_movements FORCE ROW LEVEL SECURITY;
CREATE TABLE public.lab_stocktake_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    stocktake_id uuid NOT NULL,
    item_id uuid NOT NULL,
    item_source text NOT NULL,
    item_name text NOT NULL,
    unit text NOT NULL,
    expected_quantity numeric(12,3) NOT NULL,
    counted_quantity numeric(12,3),
    condition text,
    difference numeric(12,3),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    school_id text,
    CONSTRAINT ck_lab_stocktake_lines_quantities CHECK (((expected_quantity >= (0)::numeric) AND ((counted_quantity IS NULL) OR (counted_quantity >= (0)::numeric)))),
    CONSTRAINT ck_lab_stocktake_lines_source CHECK ((item_source = ANY (ARRAY['equipment'::text, 'chemical'::text])))
);
ALTER TABLE ONLY public.lab_stocktake_lines FORCE ROW LEVEL SECURITY;
CREATE TABLE public.lab_stocktakes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    location_id uuid,
    location_name text NOT NULL,
    category text,
    item_type text,
    status text DEFAULT 'in_progress'::text NOT NULL,
    current_position integer DEFAULT 0 NOT NULL,
    notes text,
    submission_id text,
    started_by uuid,
    submitted_by uuid,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    submitted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    school_id text,
    CONSTRAINT ck_lab_stocktakes_status CHECK ((status = ANY (ARRAY['in_progress'::text, 'ready_for_review'::text, 'submitted'::text])))
);
ALTER TABLE ONLY public.lab_stocktakes FORCE ROW LEVEL SECURITY;
CREATE TABLE public.lab_storage_locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    laboratory_or_store text NOT NULL,
    room_or_section text,
    cupboard_or_cabinet text,
    shelf text,
    full_path text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    school_id text
);
ALTER TABLE ONLY public.lab_storage_locations FORCE ROW LEVEL SECURITY;
CREATE TABLE public.labs (
    capacity text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    department_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    location text NOT NULL,
    name text NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    school_id text
);
ALTER TABLE ONLY public.labs FORCE ROW LEVEL SECURITY;
CREATE TABLE public.learning_areas (
    id text NOT NULL,
    school_id text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    department_id text,
    is_compulsory boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.ledger_entries (
    id text DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    transaction_id text NOT NULL,
    account_id text NOT NULL,
    line_number integer NOT NULL,
    direction text NOT NULL,
    amount_minor text NOT NULL,
    currency_code text NOT NULL,
    description text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_by_user_id text,
    updated_by_user_id text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone,
    CONSTRAINT ck_ledger_entries_direction CHECK ((lower(direction) = ANY (ARRAY['debit'::text, 'credit'::text])))
);
ALTER TABLE ONLY public.ledger_entries FORCE ROW LEVEL SECURITY;
CREATE TABLE public.library_audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    actor_user_id uuid,
    action text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    school_id text
);
ALTER TABLE ONLY public.library_audit_logs FORCE ROW LEVEL SECURITY;
CREATE TABLE public.library_book_copies (
    id text NOT NULL,
    school_id text NOT NULL,
    book_id text NOT NULL,
    copy_number text NOT NULL,
    barcode text,
    state public."LibraryBookCopyState" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.library_books (
    id text NOT NULL,
    school_id text NOT NULL,
    title text NOT NULL,
    author text NOT NULL,
    isbn text,
    barcode text,
    category text NOT NULL,
    publisher text,
    publication_year integer,
    copies_total integer NOT NULL,
    copies_available integer NOT NULL,
    shelf_location text,
    status public."LibraryBookStatus" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.library_borrower_limits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    borrower_type text NOT NULL,
    max_active_loans integer NOT NULL,
    max_renewals integer DEFAULT 1 NOT NULL,
    school_id text
);
ALTER TABLE ONLY public.library_borrower_limits FORCE ROW LEVEL SECURITY;
CREATE TABLE public.library_borrowers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    borrower_type text NOT NULL,
    subject_id uuid NOT NULL,
    scan_code text,
    restrictions jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    school_id text,
    CONSTRAINT library_borrowers_borrower_type_check CHECK ((borrower_type = ANY (ARRAY['student'::text, 'staff'::text])))
);
ALTER TABLE ONLY public.library_borrowers FORCE ROW LEVEL SECURITY;
CREATE TABLE public.library_catalog_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    isbn text,
    title text NOT NULL,
    author text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    category text,
    school_id text
);
ALTER TABLE ONLY public.library_catalog_items FORCE ROW LEVEL SECURITY;
CREATE TABLE public.library_circulation_ledger (
    action text NOT NULL,
    borrower_id uuid NOT NULL,
    copy_id uuid NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metadata jsonb NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    school_id text
);
ALTER TABLE ONLY public.library_circulation_ledger FORCE ROW LEVEL SECURITY;
CREATE TABLE public.library_copies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    catalog_item_id uuid NOT NULL,
    accession_number text NOT NULL,
    status text DEFAULT 'available'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    barcode text,
    qr_code text,
    shelf_location text,
    school_id text,
    CONSTRAINT library_copies_status_check CHECK ((status = ANY (ARRAY['available'::text, 'issued'::text, 'reserved'::text, 'lost'::text, 'damaged'::text])))
);
ALTER TABLE ONLY public.library_copies FORCE ROW LEVEL SECURITY;
CREATE TABLE public.library_fine_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    rule_type text NOT NULL,
    amount_minor integer NOT NULL,
    school_id text
);
ALTER TABLE ONLY public.library_fine_rules FORCE ROW LEVEL SECURITY;
CREATE TABLE public.library_fines (
    id text NOT NULL,
    school_id text NOT NULL,
    library_loan_id text NOT NULL,
    student_id text NOT NULL,
    amount double precision NOT NULL,
    reason text NOT NULL,
    status public."LibraryFineStatus" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone,
    tenant_id text DEFAULT 'global'::text NOT NULL
);
ALTER TABLE ONLY public.library_fines FORCE ROW LEVEL SECURITY;
CREATE TABLE public.library_loans (
    id text NOT NULL,
    school_id text NOT NULL,
    book_copy_id text NOT NULL,
    student_id text,
    staff_user_id text,
    issued_by_user_id text NOT NULL,
    issued_at timestamp(3) without time zone NOT NULL,
    due_at timestamp(3) without time zone NOT NULL,
    returned_at timestamp(3) without time zone,
    return_condition text,
    status public."LibraryLoanStatus" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.library_renewals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    loan_id uuid NOT NULL,
    renewed_by_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    school_id text
);
ALTER TABLE ONLY public.library_renewals FORCE ROW LEVEL SECURITY;
CREATE TABLE public.library_reservations (
    borrower_id uuid NOT NULL,
    catalog_item_id uuid NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    queue_position text NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    school_id text
);
ALTER TABLE ONLY public.library_reservations FORCE ROW LEVEL SECURITY;
CREATE TABLE public.lms_activity_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    course_id uuid,
    actor_user_id uuid,
    event_type text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    audit_log_reference uuid,
    school_id text,
    status text DEFAULT 'open'::text NOT NULL,
    priority text DEFAULT 'normal'::text NOT NULL,
    due_date date
);
ALTER TABLE ONLY public.lms_activity_events FORCE ROW LEVEL SECURITY;
CREATE TABLE public.lms_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    course_id uuid,
    title text NOT NULL,
    due_at timestamp with time zone,
    status text DEFAULT 'open'::text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    audit_log_reference uuid,
    school_id text,
    priority text DEFAULT 'normal'::text NOT NULL,
    due_date date
);
ALTER TABLE ONLY public.lms_assignments FORCE ROW LEVEL SECURITY;
CREATE TABLE public.lms_audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    actor_user_id uuid,
    action text NOT NULL,
    resource_type text NOT NULL,
    resource_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    audit_log_reference uuid,
    school_id text,
    status text DEFAULT 'open'::text NOT NULL,
    priority text DEFAULT 'normal'::text NOT NULL,
    due_date date
);
ALTER TABLE ONLY public.lms_audit_logs FORCE ROW LEVEL SECURITY;
CREATE TABLE public.lms_content_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    course_id uuid,
    title text NOT NULL,
    content_type text NOT NULL,
    publish_status text DEFAULT 'draft'::text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    audit_log_reference uuid,
    school_id text,
    status text DEFAULT 'open'::text NOT NULL,
    priority text DEFAULT 'normal'::text NOT NULL,
    due_date date
);
ALTER TABLE ONLY public.lms_content_items FORCE ROW LEVEL SECURITY;
CREATE TABLE public.lms_courses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    title text NOT NULL,
    category text,
    owner_name text,
    status text DEFAULT 'open'::text NOT NULL,
    priority text DEFAULT 'normal'::text NOT NULL,
    due_date date,
    metric_count integer DEFAULT 0 NOT NULL,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    audit_log_reference uuid,
    school_id text,
    CONSTRAINT ck_lms_courses_priority CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'critical'::text])))
);
ALTER TABLE ONLY public.lms_courses FORCE ROW LEVEL SECURITY;
CREATE TABLE public.lms_submissions (
    assignment_id uuid NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metadata jsonb NOT NULL,
    status text NOT NULL,
    student_id uuid NOT NULL,
    submitted_by_user_id uuid NOT NULL,
    tenant_id text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    school_id text,
    priority text DEFAULT 'normal'::text NOT NULL,
    due_date date
);
ALTER TABLE ONLY public.lms_submissions FORCE ROW LEVEL SECURITY;
CREATE TABLE public.maintenance_tickets (
    id text NOT NULL,
    school_id text NOT NULL,
    asset_id text,
    reported_by_user_id text NOT NULL,
    assigned_to_user_id text,
    title text NOT NULL,
    description text NOT NULL,
    priority public."MaintenanceTicketPriority" NOT NULL,
    status public."MaintenanceTicketStatus" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.manual_fee_payment_allocations (
    allocation_type text NOT NULL,
    amount_minor numeric(10,2) NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid NOT NULL,
    manual_payment_id uuid NOT NULL,
    metadata jsonb NOT NULL,
    student_id uuid NOT NULL,
    tenant_id text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
ALTER TABLE ONLY public.manual_fee_payment_allocations FORCE ROW LEVEL SECURITY;
CREATE TABLE public.manual_fee_payments (
    amount_minor bigint NOT NULL,
    asset_account_code text DEFAULT '1120-BANK-CLEARING'::text NOT NULL,
    cheque_number text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by_user_id uuid,
    currency_code text DEFAULT 'KES'::text NOT NULL,
    deposit_reference text,
    drawer_bank text,
    external_reference text,
    fee_control_account_code text DEFAULT '1100-AR-FEES'::text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    idempotency_key text NOT NULL,
    invoice_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    notes text,
    payer_name text,
    payment_method text NOT NULL,
    receipt_number text NOT NULL,
    received_at timestamp(3) without time zone NOT NULL,
    status text NOT NULL,
    student_id uuid,
    tenant_id text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    ledger_transaction_id text,
    reversal_ledger_transaction_id text,
    deposited_at timestamp with time zone,
    cleared_at timestamp with time zone,
    bounced_at timestamp with time zone,
    reversed_at timestamp with time zone,
    CONSTRAINT ck_manual_fee_payments_method CHECK ((payment_method = ANY (ARRAY['cash'::text, 'cheque'::text, 'bank_deposit'::text, 'eft'::text, 'mpesa_c2b'::text])))
);
ALTER TABLE ONLY public.manual_fee_payments FORCE ROW LEVEL SECURITY;
CREATE TABLE public.mark_submissions (
    id text NOT NULL,
    school_id text NOT NULL,
    exam_cycle_id text NOT NULL,
    subject_id text,
    teacher_user_id text NOT NULL,
    status public."MarksEntryStatus" DEFAULT 'SUBMITTED'::public."MarksEntryStatus" NOT NULL,
    submitted_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.marks_entries (
    id text NOT NULL,
    school_id text NOT NULL,
    exam_cycle_id text NOT NULL,
    student_id text NOT NULL,
    class_id text NOT NULL,
    stream_id text NOT NULL,
    subject_id text NOT NULL,
    teacher_user_id text NOT NULL,
    marks_obtained double precision NOT NULL,
    grade text,
    points double precision,
    comment text,
    status public."MarksEntryStatus" DEFAULT 'DRAFT'::public."MarksEntryStatus" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.medical_visits (
    id text NOT NULL,
    school_id text NOT NULL,
    student_id text NOT NULL,
    nurse_user_id text NOT NULL,
    visit_time timestamp(3) without time zone NOT NULL,
    symptoms text NOT NULL,
    temperature double precision,
    diagnosis_notes text,
    severity public."MedicalSeverity" NOT NULL,
    action_taken text NOT NULL,
    parent_notified boolean NOT NULL,
    status public."MedicalVisitStatus" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.medicine_dispensing_logs (
    id text NOT NULL,
    school_id text NOT NULL,
    medical_visit_id text NOT NULL,
    medicine_inventory_id text NOT NULL,
    quantity_dispensed double precision NOT NULL,
    dosage_notes text NOT NULL,
    dispensed_by_user_id text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.medicine_inventory (
    id text NOT NULL,
    school_id text NOT NULL,
    medicine_name text NOT NULL,
    batch_number text,
    quantity_available double precision NOT NULL,
    unit public."InventoryUnit" NOT NULL,
    expiry_date date,
    reorder_level double precision NOT NULL,
    status public."InventoryState" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.meeting_minutes (
    action_items text NOT NULL,
    agenda text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    meeting_date text NOT NULL,
    minutes text NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    title text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    school_id text
);
ALTER TABLE ONLY public.meeting_minutes FORCE ROW LEVEL SECURITY;
CREATE TABLE public.module_package_items (
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    module_code text NOT NULL,
    package_id uuid NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    feature_flags jsonb DEFAULT '{}'::jsonb NOT NULL
);
CREATE TABLE public.module_packages (
    billing_metadata jsonb NOT NULL,
    code text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    description text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    pricing_model text NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.module_permissions (
    id text NOT NULL,
    module_code text NOT NULL,
    permission_id uuid NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.module_registry (
    base_price_cents numeric(10,2) NOT NULL,
    billing_metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    category text NOT NULL,
    code text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    description text NOT NULL,
    feature_flags jsonb DEFAULT '{}'::jsonb NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    per_student_price_cents numeric(10,2) NOT NULL,
    permission_scopes jsonb DEFAULT '[]'::jsonb NOT NULL,
    route_segment text,
    status text NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.module_usage_events (
    actor_user_id uuid,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    event_name text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    module_code text NOT NULL,
    tenant_id text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
ALTER TABLE ONLY public.module_usage_events FORCE ROW LEVEL SECURITY;
CREATE TABLE public.monitoring_service_account_audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    account_id uuid,
    action text NOT NULL,
    actor_user_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT monitoring_service_account_audit_logs_action_check CHECK ((action = ANY (ARRAY['created'::text, 'rotated'::text, 'revoked'::text, 'validation_failed'::text])))
);
ALTER TABLE ONLY public.monitoring_service_account_audit_logs FORCE ROW LEVEL SECURITY;
CREATE TABLE public.monitoring_service_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    name text NOT NULL,
    token_hash text NOT NULL,
    permissions text[] DEFAULT ARRAY['monitor:read'::text] NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    last_used_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT monitoring_service_accounts_status_check CHECK ((status = ANY (ARRAY['active'::text, 'revoked'::text])))
);
ALTER TABLE ONLY public.monitoring_service_accounts FORCE ROW LEVEL SECURITY;
CREATE TABLE public.mpesa_c2b_payments (
    amount_minor numeric(10,2) NOT NULL,
    bill_ref_number text NOT NULL,
    business_short_code text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    currency_code text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_number text NOT NULL,
    metadata jsonb NOT NULL,
    mpesa_config_id uuid NOT NULL,
    org_account_balance numeric(10,2) NOT NULL,
    payer_name text NOT NULL,
    payload_sha256 jsonb NOT NULL,
    payment_channel_id uuid NOT NULL,
    phone_number text NOT NULL,
    raw_payload jsonb NOT NULL,
    raw_payload_encrypted_ref jsonb NOT NULL,
    received_at timestamp(3) without time zone NOT NULL,
    tenant_id text NOT NULL,
    third_party_trans_id uuid NOT NULL,
    trans_id uuid NOT NULL,
    transaction_type text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    status text DEFAULT 'received_unverified'::text NOT NULL,
    matched_invoice_id uuid,
    matched_student_id text,
    manual_fee_payment_id uuid,
    ledger_transaction_id uuid,
    matched_at timestamp with time zone,
    CONSTRAINT ck_mpesa_c2b_payments_status CHECK ((status = ANY (ARRAY['received_unverified'::text, 'verification_requested'::text, 'verified_matched'::text, 'verified_unmatched'::text, 'amount_mismatch'::text, 'duplicate_provider_receipt'::text, 'missing_provider_record'::text, 'reversed'::text, 'manual_review_required'::text, 'pending_review'::text, 'matched'::text, 'rejected'::text])))
);
ALTER TABLE ONLY public.mpesa_c2b_payments FORCE ROW LEVEL SECURITY;
CREATE TABLE public.mpesa_callback_channels (
    callback_secret_hash text NOT NULL,
    channel_id uuid NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    environment text DEFAULT 'sandbox'::text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    is_current boolean DEFAULT true NOT NULL,
    requires_edge_signature boolean DEFAULT true NOT NULL,
    requires_transaction_status boolean DEFAULT true NOT NULL,
    secret_version integer DEFAULT 1 NOT NULL,
    shortcode text NOT NULL,
    tenant_id text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    accepts_until timestamp with time zone,
    rotated_from_id uuid,
    disabled_at timestamp with time zone
);
ALTER TABLE ONLY public.mpesa_callback_channels FORCE ROW LEVEL SECURITY;
CREATE TABLE public.mpesa_config_audit_logs (
    action text NOT NULL,
    changed_fields text[] DEFAULT ARRAY[]::text[] NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mpesa_config_id uuid NOT NULL,
    new_values jsonb DEFAULT '{}'::jsonb NOT NULL,
    old_values jsonb DEFAULT '{}'::jsonb NOT NULL,
    tenant_id text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
ALTER TABLE ONLY public.mpesa_config_audit_logs FORCE ROW LEVEL SECURITY;
CREATE TABLE public.mpesa_payload_support_access_logs (
    access_expires_at timestamp(3) without time zone NOT NULL,
    actor_user_id uuid NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payload_sha256 jsonb NOT NULL,
    raw_payload_encrypted_ref jsonb CONSTRAINT mpesa_payload_support_access_raw_payload_encrypted_ref_not_null NOT NULL,
    reason text NOT NULL,
    tenant_id text NOT NULL,
    ticket_id uuid NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    accessed_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE ONLY public.mpesa_payload_support_access_logs FORCE ROW LEVEL SECURITY;
CREATE TABLE public.mpesa_payload_vault (
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    encrypted_payload jsonb NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payload_sha256 jsonb NOT NULL,
    purpose text NOT NULL,
    raw_payload_encrypted_ref jsonb NOT NULL,
    redacted_payload jsonb NOT NULL,
    source text NOT NULL,
    source_id uuid NOT NULL,
    tenant_id text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
ALTER TABLE ONLY public.mpesa_payload_vault FORCE ROW LEVEL SECURITY;
CREATE TABLE public.mpesa_reconciliation_batches (
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    discrepancy_count integer NOT NULL,
    generated_at timestamp(3) without time zone NOT NULL,
    generated_by_user_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payment_channel_id uuid NOT NULL,
    reconciliation_state text NOT NULL,
    report_date text NOT NULL,
    summary text NOT NULL,
    tenant_id text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    window_ended_at timestamp(3) without time zone NOT NULL,
    window_started_at timestamp(3) without time zone NOT NULL,
    reviewed_by_user_id uuid,
    reviewed_at timestamp with time zone
);
ALTER TABLE ONLY public.mpesa_reconciliation_batches FORCE ROW LEVEL SECURITY;
CREATE TABLE public.mpesa_reconciliation_discrepancies (
    approving_user_id uuid NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    detail text NOT NULL,
    discrepancy_type text NOT NULL,
    evidence text NOT NULL,
    fee_invoice_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ledger_transaction_id uuid CONSTRAINT mpesa_reconciliation_discrepanci_ledger_transaction_id_not_null NOT NULL,
    mpesa_transaction_id uuid CONSTRAINT mpesa_reconciliation_discrepancie_mpesa_transaction_id_not_null NOT NULL,
    occurred_at timestamp(3) without time zone NOT NULL,
    payment_intent_id uuid NOT NULL,
    provider_transaction_id uuid CONSTRAINT mpesa_reconciliation_discrepan_provider_transaction_id_not_null NOT NULL,
    reconciliation_batch_id uuid CONSTRAINT mpesa_reconciliation_discrepan_reconciliation_batch_id_not_null NOT NULL,
    reconciliation_state text CONSTRAINT mpesa_reconciliation_discrepancie_reconciliation_state_not_null NOT NULL,
    severity text NOT NULL,
    tenant_id text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    resolution_status text DEFAULT 'open'::text NOT NULL,
    resolved_by_user_id uuid,
    resolved_at timestamp with time zone
);
ALTER TABLE ONLY public.mpesa_reconciliation_discrepancies FORCE ROW LEVEL SECURITY;
CREATE TABLE public.mpesa_transactions (
    id text NOT NULL,
    school_id text NOT NULL,
    checkout_request_id text,
    merchant_request_id text,
    mpesa_receipt_number text NOT NULL,
    phone_number text NOT NULL,
    amount double precision NOT NULL,
    transaction_date timestamp(3) without time zone NOT NULL,
    student_id text,
    matched_payment_id text,
    match_status public."MpesaMatchStatus" NOT NULL,
    raw_payload_json jsonb NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    tenant_id text,
    payment_intent_id uuid,
    callback_log_id uuid,
    result_code integer,
    result_desc text,
    status text DEFAULT 'succeeded'::text NOT NULL,
    raw_payload jsonb,
    transaction_id text,
    mpesa_short_code text,
    raw_payload_encrypted_ref text,
    payload_sha256 character(64)
);
ALTER TABLE ONLY public.mpesa_transactions FORCE ROW LEVEL SECURITY;
CREATE TABLE public.mpesa_verification_jobs (
    c2b_payment_id uuid NOT NULL,
    callback_log_id uuid NOT NULL,
    checkout_request_id uuid NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mpesa_receipt_number text NOT NULL,
    next_retry_at timestamp(3) without time zone NOT NULL,
    tenant_id text NOT NULL,
    transaction_status text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
ALTER TABLE ONLY public.mpesa_verification_jobs FORCE ROW LEVEL SECURITY;
CREATE TABLE public.notification_deliveries (
    id text NOT NULL,
    notification_id text NOT NULL,
    school_id text NOT NULL,
    channel public."NotificationChannel" NOT NULL,
    recipient text NOT NULL,
    status public."NotificationDeliveryStatus" DEFAULT 'QUEUED'::public."NotificationDeliveryStatus" NOT NULL,
    provider text,
    provider_message_id text,
    error_message text,
    retry_count integer DEFAULT 0 NOT NULL,
    sent_at timestamp(3) without time zone,
    delivered_at timestamp(3) without time zone,
    failed_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.notification_preferences (
    id text NOT NULL,
    school_id text NOT NULL,
    user_id text,
    role text,
    module text NOT NULL,
    event_type text NOT NULL,
    channel public."NotificationChannel" NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    quiet_hours_enabled boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.notification_rules (
    id text NOT NULL,
    school_id text NOT NULL,
    module text NOT NULL,
    event_type text NOT NULL,
    priority public."NotificationPriority" NOT NULL,
    target_roles_json jsonb NOT NULL,
    channels_json jsonb NOT NULL,
    escalation_json jsonb,
    dedupe_window_minutes integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.notification_templates (
    id text NOT NULL,
    school_id text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    module text DEFAULT 'SYSTEM'::text NOT NULL,
    event_type text DEFAULT 'GENERAL'::text NOT NULL,
    channel public."NotificationChannel" NOT NULL,
    subject text,
    body text NOT NULL,
    variables_json jsonb NOT NULL,
    status public."AssignmentStatus" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.notifications (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    school_id text,
    actor_user_id text,
    target_user_id text,
    target_role text,
    module text DEFAULT 'SYSTEM'::text NOT NULL,
    event_type text DEFAULT 'GENERAL'::text NOT NULL,
    entity_type text,
    entity_id text,
    channel public."NotificationChannel" DEFAULT 'IN_APP'::public."NotificationChannel" NOT NULL,
    title text NOT NULL,
    message text DEFAULT ''::text NOT NULL,
    priority text DEFAULT 'normal'::text NOT NULL,
    status text DEFAULT 'unread'::text NOT NULL,
    action_url text,
    action_label text,
    metadata_json jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    read_at timestamp(3) without time zone,
    dismissed_at timestamp(3) without time zone,
    expires_at timestamp(3) without time zone,
    tenant_id text NOT NULL,
    notification_key text NOT NULL,
    recipient_user_id uuid,
    recipient_guardian_id uuid,
    recipient_role text,
    type text DEFAULT 'school.operation.recorded'::text NOT NULL,
    body text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    source_module text,
    source_record_id text
);
ALTER TABLE ONLY public.notifications FORCE ROW LEVEL SECURITY;
CREATE TABLE public.offense_categories (
    id uuid NOT NULL,
    tenant_id text NOT NULL,
    school_id uuid NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    default_severity text NOT NULL,
    default_points integer NOT NULL,
    default_action_type text,
    notify_parent_by_default boolean DEFAULT false NOT NULL,
    is_positive boolean DEFAULT false NOT NULL,
    created_by_user_id uuid,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
ALTER TABLE ONLY public.offense_categories FORCE ROW LEVEL SECURITY;
CREATE TABLE public.offline_sync_events (
    id text NOT NULL,
    school_id text NOT NULL,
    academic_year_id text,
    term_id text,
    user_id text NOT NULL,
    role_id text,
    device_id text NOT NULL,
    operation_id text NOT NULL,
    module text NOT NULL,
    action text NOT NULL,
    payload_json jsonb NOT NULL,
    status public."SyncEventStatus" NOT NULL,
    retry_count integer DEFAULT 0 NOT NULL,
    error_message text,
    created_at_local timestamp(3) without time zone NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    synced_at timestamp(3) without time zone
);
CREATE TABLE public.operations_alerts (
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    description text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reported_by text NOT NULL,
    severity text NOT NULL,
    tenant_id uuid NOT NULL,
    title text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.operations_emergencies (
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    description text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reported_by text NOT NULL,
    severity text NOT NULL,
    tenant_id uuid NOT NULL,
    title text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.operations_reports (
    content text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    prepared_by text NOT NULL,
    tenant_id uuid NOT NULL,
    title text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.outbox_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    school_id text NOT NULL,
    event_key text NOT NULL,
    event_name text NOT NULL,
    aggregate_type text NOT NULL,
    aggregate_id uuid NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    headers jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    available_at timestamp with time zone DEFAULT now() NOT NULL,
    published_at timestamp with time zone,
    last_error text,
    actor_user_id uuid,
    actor_role text,
    source_dashboard text,
    correlation_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_outbox_events_aggregate_type_not_blank CHECK ((btrim(aggregate_type) <> ''::text)),
    CONSTRAINT ck_outbox_events_attempt_count_non_negative CHECK ((attempt_count >= 0)),
    CONSTRAINT ck_outbox_events_event_key_not_blank CHECK ((btrim(event_key) <> ''::text)),
    CONSTRAINT ck_outbox_events_event_name_not_blank CHECK ((btrim(event_name) <> ''::text)),
    CONSTRAINT ck_outbox_events_school_matches_tenant CHECK ((school_id = tenant_id)),
    CONSTRAINT ck_outbox_events_status CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'published'::text, 'failed'::text, 'discarded'::text])))
);
ALTER TABLE ONLY public.outbox_events FORCE ROW LEVEL SECURITY;
CREATE TABLE public.parent_acknowledgements (
    id uuid NOT NULL,
    tenant_id text NOT NULL,
    school_id uuid NOT NULL,
    incident_id uuid NOT NULL,
    student_id uuid NOT NULL,
    parent_user_id uuid NOT NULL,
    acknowledgement_note text,
    ip_address text,
    user_agent text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
ALTER TABLE ONLY public.parent_acknowledgements FORCE ROW LEVEL SECURITY;
CREATE TABLE public.parent_guardians (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    school_id text NOT NULL,
    full_name text NOT NULL,
    relationship_type public."GuardianRelationship" NOT NULL,
    phone text NOT NULL,
    email text,
    id_number text,
    occupation text,
    address text,
    status public."GuardianStatus" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp(3) without time zone
);
ALTER TABLE ONLY public.parent_guardians FORCE ROW LEVEL SECURITY;
CREATE TABLE public.parent_meetings (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    school_id text NOT NULL,
    student_id text NOT NULL,
    guardian_id text,
    reason text NOT NULL,
    meeting_type text NOT NULL,
    meeting_date date NOT NULL,
    start_time text NOT NULL,
    end_time text NOT NULL,
    location text,
    status text DEFAULT 'scheduled'::text NOT NULL,
    notes text,
    created_by_user_id uuid,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL
);
ALTER TABLE ONLY public.parent_meetings FORCE ROW LEVEL SECURITY;
CREATE TABLE public.parent_otp_challenges (
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    email text,
    expires_at timestamp(3) without time zone NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    otp_hash text NOT NULL,
    phone_hash text,
    phone_last4 text,
    tenant_id text NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    user_id uuid,
    purpose text DEFAULT 'parent_login'::text NOT NULL,
    consumed_at timestamp with time zone,
    attempts integer DEFAULT 0 NOT NULL
);
ALTER TABLE ONLY public.parent_otp_challenges FORCE ROW LEVEL SECURITY;
CREATE TABLE public.payment_intents (
    account_reference integer NOT NULL,
    amount_minor numeric(10,2) NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    currency_code text NOT NULL,
    external_reference text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    idempotency_key_id uuid NOT NULL,
    ledger_credit_account_code integer NOT NULL,
    ledger_debit_account_code integer NOT NULL,
    metadata jsonb NOT NULL,
    mpesa_config_id uuid NOT NULL,
    mpesa_short_code text NOT NULL,
    payment_channel_id uuid NOT NULL,
    payment_channel_type text NOT NULL,
    payment_owner text NOT NULL,
    phone_number text NOT NULL,
    request_id uuid NOT NULL,
    status text NOT NULL,
    student_id text NOT NULL,
    tenant_id text NOT NULL,
    transaction_desc text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    user_id uuid NOT NULL,
    merchant_request_id text,
    checkout_request_id text,
    response_code text,
    response_description text,
    customer_message text,
    ledger_transaction_id uuid,
    failure_reason text,
    stk_requested_at timestamp with time zone,
    callback_received_at timestamp with time zone,
    completed_at timestamp with time zone,
    expires_at timestamp with time zone,
    CONSTRAINT ck_payment_intents_owner CHECK ((payment_owner = ANY (ARRAY['tenant'::text, 'platform'::text])))
);
ALTER TABLE ONLY public.payment_intents FORCE ROW LEVEL SECURITY;
CREATE TABLE public.payments (
    id text NOT NULL,
    school_id text NOT NULL,
    student_id text NOT NULL,
    invoice_id text,
    payment_reference text NOT NULL,
    payment_method public."PaymentMethod" NOT NULL,
    amount double precision NOT NULL,
    payment_date timestamp(3) without time zone NOT NULL,
    received_by_user_id text,
    status public."PaymentStatus" NOT NULL,
    remarks text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    module text NOT NULL,
    resource text DEFAULT ''::text NOT NULL,
    action text DEFAULT ''::text NOT NULL,
    scope text DEFAULT ''::text NOT NULL,
    key text DEFAULT ''::text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    tenant_id text NOT NULL
);
ALTER TABLE ONLY public.permissions FORCE ROW LEVEL SECURITY;
CREATE TABLE public.platform_backups (
    id text NOT NULL,
    backup_name text NOT NULL,
    size text NOT NULL,
    status text DEFAULT 'Pending'::text NOT NULL,
    last_backup timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
ALTER TABLE ONLY public.platform_backups FORCE ROW LEVEL SECURITY;
CREATE TABLE public.platform_broadcasts (
    id text NOT NULL,
    subject text NOT NULL,
    target text NOT NULL,
    message text NOT NULL,
    status text DEFAULT 'Sent'::text NOT NULL,
    scheduled_for text DEFAULT 'Immediate'::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
ALTER TABLE ONLY public.platform_broadcasts FORCE ROW LEVEL SECURITY;
CREATE TABLE public.platform_payment_gateways (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    gateway_type text NOT NULL,
    environment text DEFAULT 'Sandbox'::text NOT NULL,
    status text DEFAULT 'Active'::text NOT NULL,
    shortcode text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_platform_payment_gateways_environment CHECK ((environment = ANY (ARRAY['Sandbox'::text, 'Production'::text]))),
    CONSTRAINT ck_platform_payment_gateways_name_not_blank CHECK ((btrim(name) <> ''::text)),
    CONSTRAINT ck_platform_payment_gateways_status CHECK ((status = ANY (ARRAY['Active'::text, 'Inactive'::text, 'Testing'::text]))),
    CONSTRAINT ck_platform_payment_gateways_type_not_blank CHECK ((btrim(gateway_type) <> ''::text))
);
ALTER TABLE ONLY public.platform_payment_gateways FORCE ROW LEVEL SECURITY;
CREATE TABLE public.platform_security_policies (
    id text NOT NULL,
    require_12_chars boolean NOT NULL,
    require_special_chars boolean NOT NULL,
    force_90_day_reset boolean NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
ALTER TABLE ONLY public.platform_security_policies FORCE ROW LEVEL SECURITY;
CREATE TABLE public.platform_settings (
    id text NOT NULL,
    maintenance_mode boolean NOT NULL,
    maintenance_message text,
    platform_name text,
    platform_tagline text,
    platform_logo_url text,
    support_email text,
    support_phone text,
    default_academic_year text,
    default_country text,
    default_timezone text,
    default_grading_system text,
    default_term_structure text,
    allow_self_registration boolean,
    require_email_verification boolean,
    auto_assign_core_modules boolean,
    default_trial_days integer,
    session_timeout_minutes integer,
    max_login_attempts integer,
    enforce_2fa boolean,
    password_min_length integer,
    password_require_special_char boolean,
    email_sender_name text,
    email_sender_address text,
    email_provider text,
    max_schools integer,
    max_students_per_school integer,
    max_storage_mb_per_school integer,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
ALTER TABLE ONLY public.platform_settings FORCE ROW LEVEL SECURITY;
CREATE TABLE public.platform_sms_providers (
    api_key_ciphertext text NOT NULL,
    base_url text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by_user_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    is_active boolean NOT NULL,
    is_default boolean NOT NULL,
    provider_code text NOT NULL,
    provider_name text NOT NULL,
    sender_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    updated_by_user_id uuid NOT NULL,
    username_ciphertext text NOT NULL
);
CREATE TABLE public.platform_templates (
    id text NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    status text DEFAULT 'Active'::text NOT NULL,
    html_content text,
    css_content text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
ALTER TABLE ONLY public.platform_templates FORCE ROW LEVEL SECURITY;
CREATE TABLE public.principal_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    module_code text NOT NULL,
    severity text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    action_path text,
    status text DEFAULT 'open'::text NOT NULL,
    source_entity_type text,
    source_entity_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    audit_log_reference uuid,
    school_id text,
    CONSTRAINT ck_principal_alerts_severity CHECK ((severity = ANY (ARRAY['info'::text, 'warning'::text, 'critical'::text]))),
    CONSTRAINT ck_principal_alerts_status CHECK ((status = ANY (ARRAY['open'::text, 'acknowledged'::text, 'resolved'::text, 'dismissed'::text])))
);
ALTER TABLE ONLY public.principal_alerts FORCE ROW LEVEL SECURITY;
CREATE TABLE public.principal_dashboard_snapshots (
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    enabled_module_hash text NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL,
    filter_hash text NOT NULL,
    generated_at timestamp(3) without time zone NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payload jsonb NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    school_id text
);
ALTER TABLE ONLY public.principal_dashboard_snapshots FORCE ROW LEVEL SECURITY;
CREATE TABLE public.procurement_approvals (
    approver_user_id uuid NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    decision text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reason text NOT NULL,
    request_id uuid NOT NULL,
    tenant_id text DEFAULT '00000000-0000-0000-0000-000000000000'::text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    audit_log_reference uuid,
    approved_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE ONLY public.procurement_approvals FORCE ROW LEVEL SECURITY;
CREATE TABLE public.procurement_audit_logs (
    action text NOT NULL,
    actor_user_id uuid NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metadata jsonb NOT NULL,
    resource_id uuid NOT NULL,
    resource_type text NOT NULL,
    tenant_id text DEFAULT '00000000-0000-0000-0000-000000000000'::text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    audit_log_reference uuid
);
ALTER TABLE ONLY public.procurement_audit_logs FORCE ROW LEVEL SECURITY;
CREATE TABLE public.procurement_budget_links (
    budget_code text NOT NULL,
    committed_amount_minor numeric(10,2) NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    purchase_order_id uuid NOT NULL,
    request_id uuid NOT NULL,
    tenant_id text DEFAULT '00000000-0000-0000-0000-000000000000'::text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    audit_log_reference uuid,
    spent_amount_minor bigint DEFAULT 0 NOT NULL
);
ALTER TABLE ONLY public.procurement_budget_links FORCE ROW LEVEL SECURITY;
CREATE TABLE public.procurement_request_items (
    budget_code text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    estimated_unit_cost_minor numeric(10,2) NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    item_name text NOT NULL,
    quantity integer NOT NULL,
    request_id uuid NOT NULL,
    tenant_id text DEFAULT '00000000-0000-0000-0000-000000000000'::text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    audit_log_reference uuid
);
ALTER TABLE ONLY public.procurement_request_items FORCE ROW LEVEL SECURITY;
CREATE TABLE public.procurement_requests (
    budget_code text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    department text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    justification text NOT NULL,
    needed_by text NOT NULL,
    requested_by_user_id uuid NOT NULL,
    status text NOT NULL,
    tenant_id text DEFAULT '00000000-0000-0000-0000-000000000000'::text NOT NULL,
    title text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    audit_log_reference uuid
);
ALTER TABLE ONLY public.procurement_requests FORCE ROW LEVEL SECURITY;
CREATE TABLE public.procurement_suppliers (
    category text NOT NULL,
    contact_name text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by_user_id uuid NOT NULL,
    email text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kra_pin text NOT NULL,
    name text NOT NULL,
    phone text NOT NULL,
    tenant_id text DEFAULT '00000000-0000-0000-0000-000000000000'::text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    audit_log_reference uuid,
    status text DEFAULT 'active'::text NOT NULL
);
ALTER TABLE ONLY public.procurement_suppliers FORCE ROW LEVEL SECURITY;
CREATE TABLE public.purchase_order_items (
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    item_name text NOT NULL,
    purchase_order_id uuid NOT NULL,
    quantity integer NOT NULL,
    tenant_id text DEFAULT '00000000-0000-0000-0000-000000000000'::text NOT NULL,
    unit_cost_minor numeric(10,2) NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    audit_log_reference uuid
);
ALTER TABLE ONLY public.purchase_order_items FORCE ROW LEVEL SECURITY;
CREATE TABLE public.purchase_orders (
    id text NOT NULL,
    school_id text NOT NULL,
    supplier_id text NOT NULL,
    purchase_request_id text,
    po_number text NOT NULL,
    total_amount double precision NOT NULL,
    status public."PurchaseOrderStatus" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone,
    tenant_id text DEFAULT '00000000-0000-0000-0000-000000000000'::text NOT NULL,
    audit_log_reference uuid,
    request_id uuid,
    expected_delivery_date date,
    total_amount_minor bigint DEFAULT 0 NOT NULL,
    created_by_user_id uuid
);
ALTER TABLE ONLY public.purchase_orders FORCE ROW LEVEL SECURITY;
CREATE TABLE public.purchase_requests (
    id text NOT NULL,
    school_id text NOT NULL,
    requested_by_user_id text NOT NULL,
    department_id text,
    title text NOT NULL,
    reason text NOT NULL,
    estimated_amount double precision NOT NULL,
    status public."PurchaseRequestStatus" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.receipts (
    id text NOT NULL,
    school_id text NOT NULL,
    payment_id text NOT NULL,
    receipt_number text NOT NULL,
    issued_to_name text NOT NULL,
    amount double precision NOT NULL,
    status public."ReceiptStatus" NOT NULL,
    printed_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.report_card_artifacts (
    artifact_type text NOT NULL,
    byte_size bigint NOT NULL,
    checksum_sha256 text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    generated_by_user_id uuid,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metadata jsonb NOT NULL,
    report_card_id uuid NOT NULL,
    storage_key text NOT NULL,
    tenant_id text NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    verification_code text NOT NULL,
    generated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE ONLY public.report_card_artifacts FORCE ROW LEVEL SECURITY;
CREATE TABLE public.report_card_comments (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    school_id text NOT NULL,
    student_id text NOT NULL,
    academic_term_id text NOT NULL,
    class_section_id text NOT NULL,
    academic_comment text,
    behaviour_comment text,
    attendance_comment text,
    improvement_advice text,
    final_comment text NOT NULL,
    comment_status text DEFAULT 'draft'::text NOT NULL,
    created_by_user_id uuid,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL
);
ALTER TABLE ONLY public.report_card_comments FORCE ROW LEVEL SECURITY;
CREATE TABLE public.report_card_generation_batches (
    class_section_id uuid,
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    exam_series_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metadata jsonb NOT NULL,
    requested_by_user_id uuid NOT NULL,
    started_at timestamp(3) without time zone,
    status text NOT NULL,
    stream_name text,
    tenant_id text NOT NULL,
    total_students integer DEFAULT 0 NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    completed_students integer DEFAULT 0 NOT NULL,
    failed_students integer DEFAULT 0 NOT NULL,
    completed_at timestamp with time zone
);
ALTER TABLE ONLY public.report_card_generation_batches FORCE ROW LEVEL SECURITY;
CREATE TABLE public.report_cards (
    id text NOT NULL,
    school_id text NOT NULL,
    student_id text NOT NULL,
    academic_year_id text NOT NULL,
    term_id text NOT NULL,
    class_id text NOT NULL,
    stream_id text NOT NULL,
    exam_cycle_id text,
    total_marks double precision,
    mean_score double precision,
    mean_grade text,
    rank_in_stream integer,
    rank_in_class integer,
    class_teacher_comment text,
    principal_comment text,
    status public."ReportCardStatus" NOT NULL,
    released_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.report_schedule_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    title text NOT NULL,
    schedule text NOT NULL,
    status text DEFAULT 'scheduled'::text NOT NULL,
    requested_by uuid,
    next_run_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    school_id text,
    CONSTRAINT ck_report_schedule_requests_status CHECK ((status = ANY (ARRAY['scheduled'::text, 'paused'::text, 'cancelled'::text, 'failed'::text])))
);
ALTER TABLE ONLY public.report_schedule_requests FORCE ROW LEVEL SECURITY;
CREATE TABLE public.report_snapshot_audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    snapshot_id text NOT NULL,
    action text NOT NULL,
    actor_user_id text,
    request_id text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_report_snapshot_audit_action CHECK ((length(TRIM(BOTH FROM action)) > 0))
);
ALTER TABLE ONLY public.report_snapshot_audit_logs FORCE ROW LEVEL SECURITY;
CREATE TABLE public.report_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    snapshot_id text NOT NULL,
    module text NOT NULL,
    report_id text NOT NULL,
    title text NOT NULL,
    format text NOT NULL,
    artifact jsonb NOT NULL,
    filters jsonb DEFAULT '{}'::jsonb NOT NULL,
    generated_by_user_id text,
    manifest jsonb NOT NULL,
    manifest_checksum_sha256 text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_report_snapshots_checksum CHECK ((manifest_checksum_sha256 ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT ck_report_snapshots_format CHECK ((format = ANY (ARRAY['csv'::text, 'xlsx'::text, 'pdf'::text]))),
    CONSTRAINT ck_report_snapshots_module_not_attendance CHECK ((POSITION(('attendance'::text) IN (lower(module))) = 0)),
    CONSTRAINT ck_report_snapshots_report_not_attendance CHECK ((POSITION(('attendance'::text) IN (lower(report_id))) = 0))
);
ALTER TABLE ONLY public.report_snapshots FORCE ROW LEVEL SECURITY;
CREATE TABLE public.role_permissions (
    id text NOT NULL,
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL,
    allowed boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    school_id text,
    tenant_id text NOT NULL
);
ALTER TABLE ONLY public.role_permissions FORCE ROW LEVEL SECURITY;
CREATE TABLE public.roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id text,
    name text NOT NULL,
    code text NOT NULL,
    type public."RoleType" DEFAULT 'SCHOOL'::public."RoleType" NOT NULL,
    description text,
    is_system_role boolean DEFAULT false NOT NULL,
    is_custom_role boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp(3) without time zone,
    tenant_id text NOT NULL,
    is_system boolean DEFAULT false NOT NULL
);
ALTER TABLE ONLY public.roles FORCE ROW LEVEL SECURITY;
CREATE TABLE public.school_integrations (
    callback_url text,
    consumer_key_ciphertext text,
    consumer_secret_ciphertext text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by_user_id uuid,
    environment text DEFAULT 'sandbox'::text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    integration_type text NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    passkey_ciphertext text,
    paybill_number text,
    shortcode text,
    tenant_id text NOT NULL,
    till_number text,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    updated_by_user_id uuid,
    callback_secret_hash text,
    last_test_status text,
    last_tested_at timestamp with time zone
);
ALTER TABLE ONLY public.school_integrations FORCE ROW LEVEL SECURITY;
CREATE TABLE public.school_memberships (
    id text NOT NULL,
    school_id text NOT NULL,
    user_id uuid NOT NULL,
    membership_type public."MembershipType" NOT NULL,
    status public."MembershipStatus" NOT NULL,
    joined_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    removed_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.school_module_access (
    access_level text NOT NULL,
    activation_reason text,
    billing_plan_code text,
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    disabled_at timestamp(3) without time zone,
    enabled boolean DEFAULT true NOT NULL,
    enabled_at timestamp(3) without time zone,
    expires_at timestamp(3) without time zone,
    feature_flags jsonb DEFAULT '{}'::jsonb NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    module_id uuid NOT NULL,
    tenant_id text NOT NULL,
    trial_ends_at timestamp(3) without time zone,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    updated_by text
);
ALTER TABLE ONLY public.school_module_access FORCE ROW LEVEL SECURITY;
CREATE TABLE public.school_modules (
    id text NOT NULL,
    school_id text NOT NULL,
    module_code text NOT NULL,
    module_name text NOT NULL,
    status public."ModuleStatus" NOT NULL,
    enabled_at timestamp(3) without time zone,
    expires_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.school_onboarding_status (
    tenant_id text NOT NULL,
    school_info_completed_at timestamp with time zone,
    admin_account_completed_at timestamp with time zone,
    daraja_setup_status text DEFAULT 'pending'::text NOT NULL,
    sms_plan_status text DEFAULT 'pending'::text NOT NULL,
    overall_status text DEFAULT 'pending_setup'::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT school_onboarding_status_daraja_setup_status_check CHECK ((daraja_setup_status = ANY (ARRAY['pending'::text, 'skipped'::text, 'complete'::text]))),
    CONSTRAINT school_onboarding_status_overall_status_check CHECK ((overall_status = ANY (ARRAY['pending_setup'::text, 'partially_configured'::text, 'fully_configured'::text]))),
    CONSTRAINT school_onboarding_status_sms_plan_status_check CHECK ((sms_plan_status = ANY (ARRAY['pending'::text, 'complete'::text])))
);
ALTER TABLE ONLY public.school_onboarding_status FORCE ROW LEVEL SECURITY;
CREATE TABLE public.school_settings (
    id text NOT NULL,
    school_id text NOT NULL,
    timezone text DEFAULT 'Africa/Nairobi'::text NOT NULL,
    default_language text DEFAULT 'en'::text NOT NULL,
    sms_enabled boolean DEFAULT true NOT NULL,
    email_enabled boolean DEFAULT true NOT NULL,
    mpesa_enabled boolean DEFAULT false NOT NULL,
    offline_sync_enabled boolean DEFAULT false NOT NULL,
    academic_year_required boolean DEFAULT true NOT NULL,
    parent_portal_enabled boolean DEFAULT false NOT NULL,
    student_portal_enabled boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.school_sms_wallets (
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    sms_balance integer DEFAULT 0 NOT NULL,
    monthly_used integer DEFAULT 0 NOT NULL,
    monthly_limit integer,
    sms_plan text DEFAULT 'starter'::text NOT NULL,
    low_balance_threshold integer DEFAULT 100 NOT NULL,
    allow_negative_balance boolean DEFAULT false NOT NULL,
    billing_status text DEFAULT 'active'::text NOT NULL,
    last_reset_at timestamp with time zone
);
ALTER TABLE ONLY public.school_sms_wallets FORCE ROW LEVEL SECURITY;
CREATE TABLE public.school_subscriptions (
    id text NOT NULL,
    school_id text NOT NULL,
    plan_id text NOT NULL,
    status public."SubscriptionStatus" NOT NULL,
    starts_at timestamp(3) without time zone NOT NULL,
    ends_at timestamp(3) without time zone NOT NULL,
    billing_cycle public."BillingCycle" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.schools (
    id text NOT NULL,
    school_code text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    registration_number text,
    kra_pin text,
    school_type public."SchoolType" NOT NULL,
    ownership_type public."OwnershipType" NOT NULL,
    curriculum_mode public."CurriculumMode" NOT NULL,
    county text,
    sub_county text,
    ward text,
    address text,
    phone text,
    email text,
    logo_url text,
    motto text,
    status public."SchoolStatus" NOT NULL,
    is_demo_school boolean DEFAULT false NOT NULL,
    created_by_user_id text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.secretary_queue_tickets (
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by_user_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    purpose text NOT NULL,
    tenant_id uuid NOT NULL,
    ticket_number text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    visitor_name text NOT NULL
);
CREATE TABLE public.security_incidents (
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    description text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    location text NOT NULL,
    reported_by text NOT NULL,
    severity text NOT NULL,
    tenant_id uuid NOT NULL,
    title text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.security_lost_found (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    item_name text NOT NULL,
    description text,
    found_location text NOT NULL,
    found_at timestamp with time zone DEFAULT now() NOT NULL,
    found_by uuid,
    status text DEFAULT 'found'::text NOT NULL,
    claimant_name text,
    verification_notes text,
    claimed_by uuid,
    claimed_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    school_id text,
    CONSTRAINT ck_security_lost_found_status CHECK ((status = ANY (ARRAY['found'::text, 'claimed'::text, 'archived'::text])))
);
ALTER TABLE ONLY public.security_lost_found FORCE ROW LEVEL SECURITY;
CREATE TABLE public.security_panic_alerts (
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    location text NOT NULL,
    tenant_id uuid NOT NULL,
    triggered_by text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.setup_checklist_items (
    id text NOT NULL,
    school_id text NOT NULL,
    key text NOT NULL,
    title text NOT NULL,
    description text,
    status public."ChecklistStatus" NOT NULL,
    completed_by_user_id text,
    completed_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.sms_credit_transactions (
    id text NOT NULL,
    school_id text NOT NULL,
    transaction_type public."CreditTransactionType" NOT NULL,
    amount double precision NOT NULL,
    description text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE public.sms_credit_wallets (
    id text NOT NULL,
    school_id text NOT NULL,
    balance double precision NOT NULL,
    last_topup_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.sms_logs (
    id uuid NOT NULL,
    school_id text NOT NULL,
    phone_number text NOT NULL,
    message text NOT NULL,
    provider text NOT NULL,
    provider_message_id text,
    cost double precision,
    status text DEFAULT 'queued'::text NOT NULL,
    error_message text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    broadcast_id text,
    tenant_id text NOT NULL,
    provider_id uuid,
    recipient_ciphertext text NOT NULL,
    recipient_last4 text,
    recipient_hash text NOT NULL,
    message_ciphertext text,
    message_preview text,
    message_type text,
    credit_cost integer DEFAULT 1 NOT NULL,
    failure_reason text,
    sent_by_user_id uuid,
    sent_at timestamp with time zone,
    delivered_at timestamp with time zone,
    provider_accepted_at timestamp with time zone,
    delivery_unknown_at timestamp with time zone,
    CONSTRAINT ck_sms_logs_status CHECK ((status = ANY (ARRAY['queued'::text, 'provider_accepted'::text, 'delivery_unknown'::text, 'sent'::text, 'delivered'::text, 'failed'::text, 'rejected'::text])))
);
ALTER TABLE ONLY public.sms_logs FORCE ROW LEVEL SECURITY;
CREATE TABLE public.sms_purchase_requests (
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    note text,
    quantity integer NOT NULL,
    requested_by_user_id uuid,
    tenant_id text NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    reviewed_by_user_id uuid
);
ALTER TABLE ONLY public.sms_purchase_requests FORCE ROW LEVEL SECURITY;
CREATE TABLE public.sms_wallet_transactions (
    balance_after integer NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by_user_id uuid,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quantity integer NOT NULL,
    reason text,
    reference text,
    tenant_id text NOT NULL,
    transaction_type text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
ALTER TABLE ONLY public.sms_wallet_transactions FORCE ROW LEVEL SECURITY;
CREATE TABLE public.staff_attendance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    staff_profile_id uuid NOT NULL,
    date date NOT NULL,
    status text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    school_id text,
    CONSTRAINT staff_attendance_status_check CHECK ((status = ANY (ARRAY['present'::text, 'absent'::text, 'late'::text, 'on_leave'::text, 'sick_leave'::text, 'off_duty'::text, 'field_duty'::text])))
);
ALTER TABLE ONLY public.staff_attendance FORCE ROW LEVEL SECURITY;
CREATE TABLE public.staff_audit_logs (
    action text NOT NULL,
    actor_user_id uuid NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metadata jsonb NOT NULL,
    staff_profile_id uuid NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    school_id text
);
ALTER TABLE ONLY public.staff_audit_logs FORCE ROW LEVEL SECURITY;
CREATE TABLE public.staff_contracts (
    approval_state text NOT NULL,
    approved_at timestamp(3) without time zone NOT NULL,
    approved_by_user_id uuid NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    employment_type text NOT NULL,
    ends_on timestamp(3) without time zone NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role_title text NOT NULL,
    staff_profile_id uuid NOT NULL,
    starts_on timestamp(3) without time zone NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    workload text NOT NULL,
    school_id text
);
ALTER TABLE ONLY public.staff_contracts FORCE ROW LEVEL SECURITY;
CREATE TABLE public.staff_departments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    school_id text
);
ALTER TABLE ONLY public.staff_departments FORCE ROW LEVEL SECURITY;
CREATE TABLE public.staff_disciplinary_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    staff_profile_id uuid NOT NULL,
    incident_date date NOT NULL,
    severity text NOT NULL,
    description text NOT NULL,
    action_taken text,
    status text DEFAULT 'open'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    school_id text,
    CONSTRAINT staff_disciplinary_records_severity_check CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))),
    CONSTRAINT staff_disciplinary_records_status_check CHECK ((status = ANY (ARRAY['open'::text, 'resolved'::text, 'appealed'::text])))
);
ALTER TABLE ONLY public.staff_disciplinary_records FORCE ROW LEVEL SECURITY;
CREATE TABLE public.staff_document_expiry_reminders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    staff_document_id uuid NOT NULL,
    reminder_at timestamp with time zone NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    school_id text
);
ALTER TABLE ONLY public.staff_document_expiry_reminders FORCE ROW LEVEL SECURITY;
CREATE TABLE public.staff_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    staff_profile_id uuid NOT NULL,
    document_type text NOT NULL,
    stored_path text NOT NULL,
    verification_status text DEFAULT 'pending'::text NOT NULL,
    expires_on date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    school_id text
);
ALTER TABLE ONLY public.staff_documents FORCE ROW LEVEL SECURITY;
CREATE TABLE public.staff_job_titles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    department_id uuid,
    title text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    school_id text
);
ALTER TABLE ONLY public.staff_job_titles FORCE ROW LEVEL SECURITY;
CREATE TABLE public.staff_leave_balances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    staff_profile_id uuid NOT NULL,
    leave_type text NOT NULL,
    available_days numeric(8,2) DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    school_id text
);
ALTER TABLE ONLY public.staff_leave_balances FORCE ROW LEVEL SECURITY;
CREATE TABLE public.staff_leave_requests (
    approved_at timestamp(3) without time zone NOT NULL,
    approved_by_user_id uuid NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    leave_type text NOT NULL,
    override_reason text NOT NULL,
    requested_days text NOT NULL,
    staff_profile_id uuid NOT NULL,
    status text NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    school_id text
);
ALTER TABLE ONLY public.staff_leave_requests FORCE ROW LEVEL SECURITY;
CREATE TABLE public.staff_payroll_bands (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    name text NOT NULL,
    base_salary numeric(10,2) NOT NULL,
    currency text DEFAULT 'KES'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    school_id text
);
ALTER TABLE ONLY public.staff_payroll_bands FORCE ROW LEVEL SECURITY;
CREATE TABLE public.staff_payslips (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    staff_profile_id uuid NOT NULL,
    month integer NOT NULL,
    year integer NOT NULL,
    base_amount numeric(10,2) NOT NULL,
    deductions numeric(10,2) DEFAULT 0 NOT NULL,
    bonuses numeric(10,2) DEFAULT 0 NOT NULL,
    net_pay numeric(10,2) NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    school_id text,
    CONSTRAINT staff_payslips_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'paid'::text, 'cancelled'::text])))
);
ALTER TABLE ONLY public.staff_payslips FORCE ROW LEVEL SECURITY;
CREATE TABLE public.staff_performance_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    staff_profile_id uuid NOT NULL,
    reviewer_id uuid NOT NULL,
    review_date date DEFAULT CURRENT_DATE NOT NULL,
    score integer NOT NULL,
    comments text NOT NULL,
    goals_for_next_period text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    school_id text,
    CONSTRAINT staff_performance_reviews_score_check CHECK (((score >= 1) AND (score <= 5)))
);
ALTER TABLE ONLY public.staff_performance_reviews FORCE ROW LEVEL SECURITY;
CREATE TABLE public.staff_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    user_id uuid,
    staff_number text,
    display_name text NOT NULL,
    department_id uuid,
    job_title_id uuid,
    status text DEFAULT 'invited'::text NOT NULL,
    statutory_identifiers jsonb DEFAULT '{}'::jsonb NOT NULL,
    emergency_contact jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    school_id text,
    CONSTRAINT staff_profiles_status_check CHECK ((status = ANY (ARRAY['invited'::text, 'pending_acceptance'::text, 'profile_incomplete'::text, 'pending_approval'::text, 'active'::text, 'on_leave'::text, 'suspended'::text, 'exiting'::text, 'exited'::text, 'archived'::text, 'reactivated'::text])))
);
ALTER TABLE ONLY public.staff_profiles FORCE ROW LEVEL SECURITY;
CREATE TABLE public.staff_salaries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    staff_profile_id uuid NOT NULL,
    payroll_band_id uuid,
    custom_base_salary numeric(10,2),
    currency text DEFAULT 'KES'::text NOT NULL,
    effective_date date DEFAULT CURRENT_DATE NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    school_id text
);
ALTER TABLE ONLY public.staff_salaries FORCE ROW LEVEL SECURITY;
CREATE TABLE public.strands (
    id text NOT NULL,
    school_id text NOT NULL,
    learning_area_id text NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.streams (
    id text NOT NULL,
    school_id text NOT NULL,
    class_id text NOT NULL,
    name text NOT NULL,
    capacity integer,
    class_teacher_user_id text,
    grade_master_user_id text,
    status public."StreamStatus" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.student_academic_enrollments (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    student_id text NOT NULL,
    application_id text NOT NULL,
    class_section_id text,
    class_name text NOT NULL,
    stream_name text NOT NULL,
    academic_year text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    enrolled_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_student_academic_enrollments_class_not_blank CHECK ((btrim(class_name) <> ''::text)),
    CONSTRAINT ck_student_academic_enrollments_status CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'transferred'::text, 'withdrawn'::text]))),
    CONSTRAINT ck_student_academic_enrollments_stream_not_blank CHECK ((btrim(stream_name) <> ''::text)),
    CONSTRAINT ck_student_academic_enrollments_year_not_blank CHECK ((btrim(academic_year) <> ''::text))
);
ALTER TABLE ONLY public.student_academic_enrollments FORCE ROW LEVEL SECURITY;
CREATE TABLE public.student_academic_lifecycle_events (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    student_id text NOT NULL,
    source_enrollment_id text NOT NULL,
    target_enrollment_id text,
    event_type text NOT NULL,
    from_class_name text NOT NULL,
    from_stream_name text NOT NULL,
    from_academic_year text NOT NULL,
    to_class_section_id text,
    to_class_name text,
    to_stream_name text,
    to_academic_year text,
    reason text NOT NULL,
    notes text,
    created_by_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_student_academic_lifecycle_events_from_class CHECK ((btrim(from_class_name) <> ''::text)),
    CONSTRAINT ck_student_academic_lifecycle_events_from_stream CHECK ((btrim(from_stream_name) <> ''::text)),
    CONSTRAINT ck_student_academic_lifecycle_events_from_year CHECK ((btrim(from_academic_year) <> ''::text)),
    CONSTRAINT ck_student_academic_lifecycle_events_reason CHECK ((btrim(reason) <> ''::text)),
    CONSTRAINT ck_student_academic_lifecycle_events_type CHECK ((event_type = ANY (ARRAY['promotion'::text, 'graduation'::text, 'archive'::text])))
);
ALTER TABLE ONLY public.student_academic_lifecycle_events FORCE ROW LEVEL SECURITY;
CREATE TABLE public.student_allocations (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    student_id text NOT NULL,
    class_name text NOT NULL,
    stream_name text NOT NULL,
    dormitory_name text,
    transport_route text,
    effective_from date NOT NULL,
    is_current boolean DEFAULT true NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE ONLY public.student_allocations FORCE ROW LEVEL SECURITY;
CREATE TABLE public.student_audit_logs (
    id text NOT NULL,
    school_id text NOT NULL,
    student_id text NOT NULL,
    action text NOT NULL,
    previous_status text,
    new_status text,
    performed_by_user_id text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE public.student_class_assignments (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    school_id text NOT NULL,
    student_id text NOT NULL,
    class_section_id text NOT NULL,
    stream_id text,
    academic_level_id text NOT NULL,
    academic_year_id text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    assigned_by_user_id uuid,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    audit_log_reference uuid,
    tenant_id text DEFAULT 'global'::text NOT NULL
);
ALTER TABLE ONLY public.student_class_assignments FORCE ROW LEVEL SECURITY;
CREATE TABLE public.student_clearance (
    id text NOT NULL,
    school_id text NOT NULL,
    student_id text NOT NULL,
    fee_balance_cleared boolean DEFAULT false NOT NULL,
    library_cleared boolean DEFAULT false NOT NULL,
    boarding_cleared boolean DEFAULT false NOT NULL,
    discipline_cleared boolean DEFAULT false NOT NULL,
    school_property_returned boolean DEFAULT false NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    cleared_by_user_id text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.student_communications (
    id text NOT NULL,
    school_id text NOT NULL,
    student_id text NOT NULL,
    guardian_id text,
    message_type text NOT NULL,
    delivery_channel text NOT NULL,
    delivery_status text NOT NULL,
    content text NOT NULL,
    sent_by_user_id text NOT NULL,
    sent_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE public.student_enrollments (
    id text NOT NULL,
    school_id text NOT NULL,
    student_id text NOT NULL,
    academic_year_id text NOT NULL,
    term_id text,
    class_id text NOT NULL,
    stream_id text NOT NULL,
    enrollment_status public."EnrollmentStatus" NOT NULL,
    start_date date NOT NULL,
    end_date date,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.student_exit_records (
    id text NOT NULL,
    school_id text NOT NULL,
    student_id text NOT NULL,
    exit_date timestamp(3) without time zone NOT NULL,
    reason text NOT NULL,
    destination_school text,
    authorized_by_user_id text NOT NULL,
    picked_up_by text,
    clearance_id text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.student_exits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT 'legacy-unassigned'::text NOT NULL,
    student_id text DEFAULT 'legacy-student'::text NOT NULL,
    reason text DEFAULT 'Unspecified'::text NOT NULL,
    authorized_by_user_id text DEFAULT 'system'::text NOT NULL,
    picked_up_by text,
    time_out timestamp with time zone DEFAULT now() NOT NULL,
    time_in timestamp with time zone,
    status text DEFAULT 'out'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE ONLY public.student_exits FORCE ROW LEVEL SECURITY;
CREATE TABLE public.student_fee_accounts (
    id text NOT NULL,
    school_id text NOT NULL,
    student_id text NOT NULL,
    opening_balance double precision DEFAULT 0 NOT NULL,
    current_balance double precision DEFAULT 0 NOT NULL,
    status public."FeeAccountStatus" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.student_fee_assignments (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    student_id text NOT NULL,
    application_id text NOT NULL,
    fee_structure_id text NOT NULL,
    status text DEFAULT 'assigned'::text NOT NULL,
    amount_minor bigint NOT NULL,
    currency_code text DEFAULT 'KES'::text NOT NULL,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_student_fee_assignments_amount_positive CHECK ((amount_minor > 0)),
    CONSTRAINT ck_student_fee_assignments_currency CHECK ((currency_code ~ '^[A-Z]{3}$'::text)),
    CONSTRAINT ck_student_fee_assignments_status CHECK ((status = ANY (ARRAY['assigned'::text, 'waived'::text, 'voided'::text])))
);
ALTER TABLE ONLY public.student_fee_assignments FORCE ROW LEVEL SECURITY;
CREATE TABLE public.student_fee_credits (
    amount_minor numeric(10,2) NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    idempotency_key text NOT NULL,
    ledger_transaction_id uuid NOT NULL,
    metadata jsonb NOT NULL,
    parent_user_id uuid NOT NULL,
    payment_intent_id uuid NOT NULL,
    remaining_amount_minor numeric(10,2) NOT NULL,
    student_id uuid NOT NULL,
    tenant_id text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
ALTER TABLE ONLY public.student_fee_credits FORCE ROW LEVEL SECURITY;
CREATE TABLE public.student_fee_invoices (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    assignment_id text NOT NULL,
    student_id text NOT NULL,
    invoice_number text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    description text NOT NULL,
    currency_code text DEFAULT 'KES'::text NOT NULL,
    amount_due_minor bigint NOT NULL,
    amount_paid_minor bigint DEFAULT 0 NOT NULL,
    issued_date date DEFAULT CURRENT_DATE NOT NULL,
    due_date date NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_student_fee_invoices_amount_due_positive CHECK ((amount_due_minor > 0)),
    CONSTRAINT ck_student_fee_invoices_amount_paid_non_negative CHECK ((amount_paid_minor >= 0)),
    CONSTRAINT ck_student_fee_invoices_currency CHECK ((currency_code ~ '^[A-Z]{3}$'::text)),
    CONSTRAINT ck_student_fee_invoices_description_not_blank CHECK ((btrim(description) <> ''::text)),
    CONSTRAINT ck_student_fee_invoices_status CHECK ((status = ANY (ARRAY['open'::text, 'pending_payment'::text, 'paid'::text, 'voided'::text])))
);
ALTER TABLE ONLY public.student_fee_invoices FORCE ROW LEVEL SECURITY;
CREATE TABLE public.student_fee_payment_allocations (
    amount_minor numeric(10,2) NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    idempotency_key text NOT NULL,
    invoice_id uuid NOT NULL,
    ledger_transaction_id uuid NOT NULL,
    metadata jsonb NOT NULL,
    parent_user_id uuid NOT NULL,
    payment_intent_id uuid NOT NULL,
    student_id uuid NOT NULL,
    tenant_id text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
ALTER TABLE ONLY public.student_fee_payment_allocations FORCE ROW LEVEL SECURITY;
CREATE TABLE public.student_fee_structures (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    tenant_id text NOT NULL,
    class_name text NOT NULL,
    academic_year text NOT NULL,
    term_name text NOT NULL,
    description text NOT NULL,
    currency_code text DEFAULT 'KES'::text NOT NULL,
    amount_minor bigint NOT NULL,
    due_days_after_registration integer DEFAULT 14 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_student_fee_structures_amount_positive CHECK ((amount_minor > 0)),
    CONSTRAINT ck_student_fee_structures_class_not_blank CHECK ((btrim(class_name) <> ''::text)),
    CONSTRAINT ck_student_fee_structures_currency CHECK ((currency_code ~ '^[A-Z]{3}$'::text)),
    CONSTRAINT ck_student_fee_structures_description_not_blank CHECK ((btrim(description) <> ''::text)),
    CONSTRAINT ck_student_fee_structures_due_days CHECK (((due_days_after_registration >= 0) AND (due_days_after_registration <= 180))),
    CONSTRAINT ck_student_fee_structures_term_not_blank CHECK ((btrim(term_name) <> ''::text)),
    CONSTRAINT ck_student_fee_structures_year_not_blank CHECK ((btrim(academic_year) <> ''::text))
);
ALTER TABLE ONLY public.student_fee_structures FORCE ROW LEVEL SECURITY;
CREATE TABLE public.student_guardians (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    school_id text NOT NULL,
    student_id text NOT NULL,
    guardian_id text NOT NULL,
    relationship_type public."GuardianRelationship" NOT NULL,
    is_primary_contact boolean DEFAULT false NOT NULL,
    can_receive_sms boolean DEFAULT true NOT NULL,
    can_access_parent_portal boolean DEFAULT false NOT NULL,
    can_pick_student boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp(3) without time zone,
    tenant_id text NOT NULL,
    user_id uuid,
    invitation_id uuid,
    display_name text,
    email text,
    phone text,
    status text DEFAULT 'invited'::text NOT NULL,
    accepted_at timestamp with time zone,
    normalized_phone text,
    guardian_profile_id uuid,
    relationship text NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    CONSTRAINT ck_student_guardians_relationship_not_blank CHECK ((btrim(relationship) <> ''::text))
);
ALTER TABLE ONLY public.student_guardians FORCE ROW LEVEL SECURITY;
CREATE TABLE public.student_invoices (
    academic_year text NOT NULL,
    amount_minor numeric(10,2) NOT NULL,
    balance_minor numeric(10,2) NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fee_structure_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_number text NOT NULL,
    student_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    term text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.student_notes (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    school_id text NOT NULL,
    student_id text NOT NULL,
    note_type text NOT NULL,
    visibility text DEFAULT 'private'::text NOT NULL,
    description text NOT NULL,
    follow_up_date date,
    created_by_user_id uuid,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL
);
ALTER TABLE ONLY public.student_notes FORCE ROW LEVEL SECURITY;
CREATE TABLE public.student_portal_access (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    student_id text NOT NULL,
    user_id uuid NOT NULL,
    username text NOT NULL,
    guardian_phone_hash text NOT NULL,
    force_password_change boolean DEFAULT true NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    last_login_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_student_portal_access_phone_hash_not_blank CHECK ((btrim(guardian_phone_hash) <> ''::text)),
    CONSTRAINT ck_student_portal_access_username_not_blank CHECK ((btrim(username) <> ''::text)),
    CONSTRAINT student_portal_access_status_check CHECK ((status = ANY (ARRAY['active'::text, 'suspended'::text, 'revoked'::text])))
);
ALTER TABLE ONLY public.student_portal_access FORCE ROW LEVEL SECURITY;
CREATE TABLE public.student_report_card_audit_logs (
    action text NOT NULL,
    actor_user_id uuid,
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    exam_series_id uuid,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metadata jsonb NOT NULL,
    report_card_id uuid,
    student_id uuid,
    tenant_id text NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL
);
ALTER TABLE ONLY public.student_report_card_audit_logs FORCE ROW LEVEL SECURITY;
CREATE TABLE public.student_report_cards (
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    exam_series_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metadata jsonb NOT NULL,
    published_by_user_id uuid,
    report_snapshot_id text NOT NULL,
    status text DEFAULT 'draft_requested'::text NOT NULL,
    student_id uuid NOT NULL,
    tenant_id text NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    verification_code text,
    published_at timestamp with time zone,
    revision_number integer DEFAULT 1 NOT NULL,
    is_current boolean DEFAULT true NOT NULL,
    supersedes_report_card_id uuid,
    grading_policy_id uuid,
    grading_policy_version integer,
    template_version integer DEFAULT 1 NOT NULL,
    approved_result_version text,
    submitted_by_user_id uuid,
    submitted_at timestamp with time zone,
    approved_by_user_id uuid,
    approved_at timestamp with time zone,
    approval_role text,
    withdrawn_by_user_id uuid,
    withdrawn_at timestamp with time zone,
    workflow_version integer DEFAULT 1 NOT NULL,
    CONSTRAINT ck_student_report_cards_revision CHECK ((revision_number > 0)),
    CONSTRAINT ck_student_report_cards_status CHECK ((status = ANY (ARRAY['draft_requested'::text, 'draft_generated'::text, 'under_review'::text, 'approved'::text, 'published'::text, 'withdrawn'::text, 'regeneration_required'::text, 'draft'::text]))),
    CONSTRAINT ck_student_report_cards_workflow_version CHECK ((workflow_version > 0))
);
ALTER TABLE ONLY public.student_report_cards FORCE ROW LEVEL SECURITY;
CREATE TABLE public.student_subject_enrollments (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    student_id text NOT NULL,
    academic_enrollment_id text NOT NULL,
    subject_offering_id text,
    subject_code text NOT NULL,
    subject_name text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    enrolled_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    academic_year_id text,
    academic_term_id text,
    class_section_id text,
    stream_id text,
    subject_id text,
    curriculum_model text,
    subject_type text,
    is_compulsory boolean DEFAULT false NOT NULL,
    selected_by_user_id uuid,
    effective_from date,
    effective_to date,
    CONSTRAINT ck_student_subject_enrollments_code_not_blank CHECK ((btrim(subject_code) <> ''::text)),
    CONSTRAINT ck_student_subject_enrollments_name_not_blank CHECK ((btrim(subject_name) <> ''::text)),
    CONSTRAINT ck_student_subject_enrollments_status CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'dropped'::text])))
);
ALTER TABLE ONLY public.student_subject_enrollments FORCE ROW LEVEL SECURITY;
CREATE TABLE public.student_timetable_enrollments (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    student_id text NOT NULL,
    academic_enrollment_id text NOT NULL,
    timetable_slot_id text NOT NULL,
    day_of_week text NOT NULL,
    starts_at text NOT NULL,
    ends_at text NOT NULL,
    subject_name text NOT NULL,
    room_name text,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_student_timetable_enrollments_day CHECK ((day_of_week = ANY (ARRAY['Monday'::text, 'Tuesday'::text, 'Wednesday'::text, 'Thursday'::text, 'Friday'::text, 'Saturday'::text, 'Sunday'::text]))),
    CONSTRAINT ck_student_timetable_enrollments_end CHECK ((ends_at ~ '^[0-2][0-9]:[0-5][0-9]$'::text)),
    CONSTRAINT ck_student_timetable_enrollments_start CHECK ((starts_at ~ '^[0-2][0-9]:[0-5][0-9]$'::text)),
    CONSTRAINT ck_student_timetable_enrollments_status CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'dropped'::text]))),
    CONSTRAINT ck_student_timetable_enrollments_subject_not_blank CHECK ((btrim(subject_name) <> ''::text))
);
ALTER TABLE ONLY public.student_timetable_enrollments FORCE ROW LEVEL SECURITY;
CREATE TABLE public.student_transfer_records (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    student_id text,
    application_id text,
    transfer_type text NOT NULL,
    school_name text NOT NULL,
    reason text NOT NULL,
    requested_on date NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE ONLY public.student_transfer_records FORCE ROW LEVEL SECURITY;
CREATE TABLE public.student_transport_assignments (
    id text NOT NULL,
    school_id text NOT NULL,
    student_id text NOT NULL,
    route_id text NOT NULL,
    pickup_point text NOT NULL,
    dropoff_point text NOT NULL,
    status public."RouteStatus" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.students (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    school_id text NOT NULL,
    admission_number text NOT NULL,
    upi_number text,
    nemis_number text,
    first_name text NOT NULL,
    middle_name text,
    last_name text NOT NULL,
    gender text NOT NULL,
    date_of_birth date,
    photo_url text,
    birth_certificate_number text,
    nationality text NOT NULL,
    religion text,
    student_status public."StudentStatus" NOT NULL,
    admission_date date NOT NULL,
    current_class_id text,
    current_stream_id text,
    boarding_status public."BoardingStatus" NOT NULL,
    medical_notes_summary text,
    primary_guardian_name text,
    primary_guardian_phone text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_by_user_id text,
    updated_by_user_id text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp(3) without time zone,
    tenant_id text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL
);
ALTER TABLE ONLY public.students FORCE ROW LEVEL SECURITY;
CREATE TABLE public.sub_strands (
    id text NOT NULL,
    school_id text NOT NULL,
    strand_id text NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.subjects (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    school_id text,
    department_id text,
    name text NOT NULL,
    code text NOT NULL,
    curriculum_type public."CurriculumType",
    is_compulsory boolean DEFAULT false NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp(3) without time zone,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    academic_term_id text,
    class_section_id text,
    subject_id text,
    created_by_user_id uuid,
    version integer DEFAULT 1 NOT NULL,
    abbreviation text,
    curriculum_model text DEFAULT 'Custom'::text NOT NULL,
    subject_type text DEFAULT 'academic'::text NOT NULL,
    is_examinable boolean DEFAULT true NOT NULL,
    is_practical boolean DEFAULT false NOT NULL,
    is_co_curricular boolean DEFAULT false NOT NULL,
    archived_at timestamp with time zone,
    archived_by_user_id uuid
);
ALTER TABLE ONLY public.subjects FORCE ROW LEVEL SECURITY;
CREATE TABLE public.subscription_plans (
    id text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    monthly_price double precision NOT NULL,
    annual_price double precision NOT NULL,
    student_limit integer NOT NULL,
    staff_limit integer NOT NULL,
    sms_included integer NOT NULL,
    modules_json jsonb NOT NULL,
    status public."SubscriptionPlanStatus" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.subscriptions (
    activated_at timestamp(3) without time zone,
    billing_phone_number text,
    canceled_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    currency_code text NOT NULL,
    current_period_end text NOT NULL,
    current_period_start text NOT NULL,
    features text NOT NULL,
    grace_period_ends_at timestamp(3) without time zone,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    limits text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    plan_code text NOT NULL,
    restricted_at timestamp(3) without time zone,
    seats_allocated text NOT NULL,
    status text NOT NULL,
    suspended_at timestamp(3) without time zone,
    suspension_reason text,
    tenant_id text NOT NULL,
    trial_ends_at timestamp(3) without time zone,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_subscriptions_status CHECK ((status = ANY (ARRAY['trialing'::text, 'active'::text, 'past_due'::text, 'restricted'::text, 'suspended'::text, 'canceled'::text, 'expired'::text])))
);
ALTER TABLE ONLY public.subscriptions FORCE ROW LEVEL SECURITY;
CREATE TABLE public.supplier_invoices (
    amount_minor numeric(10,2) NOT NULL,
    attached_by_user_id uuid NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    file_url text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_date text NOT NULL,
    invoice_number text NOT NULL,
    notes text NOT NULL,
    purchase_order_id uuid NOT NULL,
    tenant_id text DEFAULT '00000000-0000-0000-0000-000000000000'::text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    audit_log_reference uuid,
    status text DEFAULT 'attached'::text NOT NULL
);
ALTER TABLE ONLY public.supplier_invoices FORCE ROW LEVEL SECURITY;
CREATE TABLE public.suppliers (
    id text NOT NULL,
    school_id text NOT NULL,
    name text NOT NULL,
    contact_person text,
    phone text NOT NULL,
    email text,
    kra_pin text,
    address text,
    status public."SupplierStatus" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.support_agents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    user_id uuid,
    display_name text NOT NULL,
    role text DEFAULT 'support_agent'::text NOT NULL,
    skills text[] DEFAULT ARRAY[]::text[] NOT NULL,
    max_open_tickets integer DEFAULT 12 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_support_agents_max_open CHECK ((max_open_tickets > 0)),
    CONSTRAINT ck_support_agents_role CHECK ((role = ANY (ARRAY['support_agent'::text, 'support_lead'::text, 'developer'::text, 'platform_owner'::text])))
);
ALTER TABLE ONLY public.support_agents FORCE ROW LEVEL SECURITY;
CREATE TABLE public.support_attachments (
    attachment_type text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    internal_note_id uuid NOT NULL,
    message_id uuid NOT NULL,
    mime_type text NOT NULL,
    original_file_name text NOT NULL,
    size_bytes text NOT NULL,
    stored_path text NOT NULL,
    tenant_id text NOT NULL,
    ticket_id uuid NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    uploaded_by_user_id uuid NOT NULL
);
ALTER TABLE ONLY public.support_attachments FORCE ROW LEVEL SECURITY;
CREATE TABLE public.support_categories (
    code text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    description text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    resolution_sla_minutes text NOT NULL,
    response_sla_minutes text NOT NULL,
    sort_order text NOT NULL,
    tenant_id text NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL
);
ALTER TABLE ONLY public.support_categories FORCE ROW LEVEL SECURITY;
CREATE TABLE public.support_incidents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    component_id uuid,
    title text NOT NULL,
    impact text NOT NULL,
    status text DEFAULT 'investigating'::text NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone,
    update_summary text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_support_incidents_impact CHECK ((impact = ANY (ARRAY['minor'::text, 'major'::text, 'critical'::text]))),
    CONSTRAINT ck_support_incidents_status CHECK ((status = ANY (ARRAY['investigating'::text, 'identified'::text, 'monitoring'::text, 'resolved'::text])))
);
ALTER TABLE ONLY public.support_incidents FORCE ROW LEVEL SECURITY;
CREATE TABLE public.support_internal_notes (
    author_user_id uuid NOT NULL,
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    note text NOT NULL,
    tenant_id text NOT NULL,
    ticket_id uuid NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL
);
ALTER TABLE ONLY public.support_internal_notes FORCE ROW LEVEL SECURITY;
CREATE TABLE public.support_kb_articles (
    body text NOT NULL,
    category text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    summary text NOT NULL,
    tags text[] DEFAULT ARRAY[]::text[] NOT NULL,
    tenant_id text NOT NULL,
    title text NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    published boolean DEFAULT true NOT NULL,
    helpful_count integer DEFAULT 0 NOT NULL
);
ALTER TABLE ONLY public.support_kb_articles FORCE ROW LEVEL SECURITY;
CREATE TABLE public.support_messages (
    author_type text NOT NULL,
    author_user_id uuid NOT NULL,
    body text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    ticket_id uuid NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    visibility text NOT NULL
);
ALTER TABLE ONLY public.support_messages FORCE ROW LEVEL SECURITY;
CREATE TABLE public.support_notifications (
    body text NOT NULL,
    channel text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metadata jsonb NOT NULL,
    recipient_type text NOT NULL,
    recipient_user_id uuid NOT NULL,
    tenant_id text NOT NULL,
    ticket_id uuid NOT NULL,
    title text NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    read_at timestamp with time zone,
    delivery_status text DEFAULT 'queued'::text NOT NULL,
    delivery_attempts integer DEFAULT 0 NOT NULL,
    last_delivery_error text,
    next_delivery_attempt_at timestamp with time zone,
    delivered_at timestamp with time zone,
    provider_accepted_at timestamp with time zone,
    delivery_unknown_at timestamp with time zone,
    CONSTRAINT ck_support_notifications_delivery_status CHECK ((delivery_status = ANY (ARRAY['queued'::text, 'provider_accepted'::text, 'delivery_unknown'::text, 'sent'::text, 'failed'::text, 'read'::text])))
);
ALTER TABLE ONLY public.support_notifications FORCE ROW LEVEL SECURITY;
CREATE TABLE public.support_status_logs (
    action text NOT NULL,
    actor_user_id uuid NOT NULL,
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    from_status text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metadata jsonb NOT NULL,
    tenant_id text NOT NULL,
    ticket_id uuid NOT NULL,
    to_status text NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL
);
ALTER TABLE ONLY public.support_status_logs FORCE ROW LEVEL SECURITY;
CREATE TABLE public.support_status_notification_attempts (
    channel text NOT NULL,
    contact_hash text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    delivery_status text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    incident_id uuid NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    subscription_id uuid NOT NULL,
    tenant_id text NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    last_error text,
    next_attempt_at timestamp with time zone,
    sent_at timestamp with time zone
);
ALTER TABLE ONLY public.support_status_notification_attempts FORCE ROW LEVEL SECURITY;
CREATE TABLE public.support_status_subscriptions (
    client_ip_hash text,
    consent_at timestamp(3) without time zone NOT NULL,
    consent_source text NOT NULL,
    contact_hash text NOT NULL,
    contact_type text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    locale text,
    status text NOT NULL,
    tenant_id text NOT NULL,
    unsubscribed_at timestamp(3) without time zone,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);
ALTER TABLE ONLY public.support_status_subscriptions FORCE ROW LEVEL SECURITY;
CREATE TABLE public.support_status_unsubscribe_tokens (
    contact_hash text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    token_hash text NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    used_at timestamp with time zone
);
ALTER TABLE ONLY public.support_status_unsubscribe_tokens FORCE ROW LEVEL SECURITY;
CREATE TABLE public.support_system_components (
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    latency_ms integer DEFAULT 0 NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    status text NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    uptime_percent numeric(5,2) DEFAULT 99.99 NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);
ALTER TABLE ONLY public.support_system_components FORCE ROW LEVEL SECURITY;
CREATE SEQUENCE public.support_ticket_number_seq
    START WITH 145
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
CREATE TABLE public.support_tickets (
    assigned_agent_id uuid NOT NULL,
    category text NOT NULL,
    context jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    created_by_user_id uuid NOT NULL,
    description text NOT NULL,
    escalated_at timestamp(3) without time zone NOT NULL,
    first_response_due_at timestamp(3) without time zone NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    module_affected text NOT NULL,
    priority text NOT NULL,
    requester_user_id uuid NOT NULL,
    resolution_due_at timestamp(3) without time zone NOT NULL,
    status text NOT NULL,
    subject text NOT NULL,
    tenant_id text NOT NULL,
    ticket_number text NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    updated_by_user_id uuid NOT NULL,
    merged_into_ticket_id uuid,
    first_responded_at timestamp with time zone,
    resolved_at timestamp with time zone,
    closed_at timestamp with time zone,
    last_school_reply_at timestamp with time zone,
    last_support_reply_at timestamp with time zone
);
ALTER TABLE ONLY public.support_tickets FORCE ROW LEVEL SECURITY;
CREATE TABLE public.sync_conflicts (
    id text NOT NULL,
    school_id text NOT NULL,
    offline_sync_event_id text NOT NULL,
    module text NOT NULL,
    entity_id text NOT NULL,
    server_value_json jsonb NOT NULL,
    client_value_json jsonb NOT NULL,
    resolution_status public."SyncConflictResolution" NOT NULL,
    resolved_by_user_id text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    resolved_at timestamp(3) without time zone
);
CREATE TABLE public.sync_cursors (
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    device_id text NOT NULL,
    entity text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    last_version bigint DEFAULT 0 NOT NULL,
    tenant_id text NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL
);
ALTER TABLE ONLY public.sync_cursors FORCE ROW LEVEL SECURITY;
CREATE TABLE public.sync_devices (
    app_version text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    device_id text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    last_seen_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    platform text NOT NULL,
    tenant_id text NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    last_push_at timestamp with time zone,
    last_pull_at timestamp with time zone
);
ALTER TABLE ONLY public.sync_devices FORCE ROW LEVEL SECURITY;
CREATE TABLE public.sync_operation_logs (
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    device_id text NOT NULL,
    entity text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    op_id uuid NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    tenant_id text NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    version bigint NOT NULL
);
ALTER TABLE ONLY public.sync_operation_logs FORCE ROW LEVEL SECURITY;
CREATE SEQUENCE public.sync_operation_logs_version_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.sync_operation_logs_version_seq OWNED BY public.sync_operation_logs.version;
CREATE TABLE public.system_health_logs (
    id text NOT NULL,
    school_id text,
    service_name text NOT NULL,
    status public."HealthStatus" NOT NULL,
    response_time_ms integer,
    message text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE public.system_jobs (
    id text NOT NULL,
    school_id text,
    job_type text NOT NULL,
    status public."SystemJobStatus" NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    max_attempts integer NOT NULL,
    payload_json jsonb NOT NULL,
    last_error text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    completed_at timestamp(3) without time zone
);
CREATE TABLE public.tasks (
    assigned_to_role text,
    assigned_to_user_id uuid,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by_user_id uuid,
    description text,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    module text,
    priority text DEFAULT 'normal'::text NOT NULL,
    record_id text,
    task_key text NOT NULL,
    tenant_id text NOT NULL,
    title text NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'OPEN'::text NOT NULL,
    due_date timestamp with time zone,
    completed_at timestamp with time zone
);
ALTER TABLE ONLY public.tasks FORCE ROW LEVEL SECURITY;
CREATE TABLE public.teacher_attendance_logs (
    attendance_date date DEFAULT CURRENT_DATE NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    device_id uuid NOT NULL,
    event_id uuid NOT NULL,
    event_type text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    manual_override boolean DEFAULT false NOT NULL,
    occurred_at timestamp(3) without time zone NOT NULL,
    override_by text NOT NULL,
    override_reason text NOT NULL,
    rule_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text NOT NULL,
    teacher_user_id uuid NOT NULL,
    tenant_id text DEFAULT '00000000-0000-0000-0000-000000000000'::text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    audit_log_reference uuid
);
ALTER TABLE ONLY public.teacher_attendance_logs FORCE ROW LEVEL SECURITY;
CREATE TABLE public.teacher_subject_assignments (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    school_id text,
    teacher_user_id text NOT NULL,
    academic_year_id text,
    term_id text,
    class_id text,
    stream_id text,
    subject_id text NOT NULL,
    assigned_by_user_id text,
    status text DEFAULT 'active'::text NOT NULL,
    curriculum_type public."CurriculumType" DEFAULT 'EIGHT_FOUR_FOUR'::public."CurriculumType" NOT NULL,
    assessment_responsibility public."AssessmentResponsibility" DEFAULT 'MAIN_TEACHER'::public."AssessmentResponsibility" NOT NULL,
    can_enter_marks boolean DEFAULT true NOT NULL,
    can_submit_marks boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp(3) without time zone,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    academic_term_id text,
    class_section_id text,
    created_by_user_id uuid,
    assignment_type text DEFAULT 'primary'::text NOT NULL,
    department_id uuid,
    curriculum_model text,
    is_primary boolean DEFAULT true NOT NULL,
    mark_entry_allowed boolean DEFAULT true NOT NULL,
    lesson_record_allowed boolean DEFAULT true NOT NULL,
    report_comment_allowed boolean DEFAULT true NOT NULL,
    effective_from date DEFAULT CURRENT_DATE NOT NULL,
    effective_to date,
    reason text,
    ended_by_user_id uuid,
    version integer DEFAULT 1 NOT NULL,
    continued_from_assignment_id text,
    CONSTRAINT ck_teacher_subject_assignments_status CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'ended'::text, 'archived'::text])))
);
ALTER TABLE ONLY public.teacher_subject_assignments FORCE ROW LEVEL SECURITY;
CREATE TABLE public.tenant_bank_accounts (
    account_name text NOT NULL,
    account_number text NOT NULL,
    account_number_hash text NOT NULL,
    bank_name text NOT NULL,
    branch_name text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    currency text DEFAULT 'KES'::text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    tenant_id text NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);
ALTER TABLE ONLY public.tenant_bank_accounts FORCE ROW LEVEL SECURITY;
CREATE TABLE public.tenant_domains (
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    created_by_user_id uuid NOT NULL,
    domain text NOT NULL,
    domain_type text DEFAULT 'custom'::text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'pending_verification'::text NOT NULL,
    tenant_id text NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    verified_at timestamp with time zone
);
ALTER TABLE ONLY public.tenant_domains FORCE ROW LEVEL SECURITY;
CREATE TABLE public.tenant_finance_summary (
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    current_term text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    total_arrears_minor text NOT NULL,
    total_collections_minor text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.tenant_financial_accounts (
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    currency_code text DEFAULT 'KES'::text NOT NULL,
    fee_control_account_code text DEFAULT '1100-AR-FEES'::text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mpesa_clearing_account_code text DEFAULT '1110-MPESA-CLEARING'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    tenant_id text NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);
ALTER TABLE ONLY public.tenant_financial_accounts FORCE ROW LEVEL SECURITY;
CREATE TABLE public.tenant_memberships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT tenant_memberships_status_check CHECK ((status = ANY (ARRAY['active'::text, 'invited'::text, 'suspended'::text, 'revoked'::text])))
);
ALTER TABLE ONLY public.tenant_memberships FORCE ROW LEVEL SECURITY;
CREATE TABLE public.tenant_mpesa_configs (
    callback_url text NOT NULL,
    consumer_key text NOT NULL,
    consumer_secret text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    environment text DEFAULT 'sandbox'::text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    initiator_name text,
    passkey text NOT NULL,
    paybill_number text,
    shortcode text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    tenant_id text NOT NULL,
    till_number text,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    callback_secret_hash text,
    callback_secret_rotated_at timestamp with time zone,
    credential_version integer DEFAULT 1 NOT NULL,
    rotated_at timestamp with time zone,
    CONSTRAINT ck_tenant_mpesa_configs_callback_secret_hash CHECK (((callback_secret_hash IS NULL) OR (callback_secret_hash ~ '^[a-f0-9]{64}$'::text)))
);
ALTER TABLE ONLY public.tenant_mpesa_configs FORCE ROW LEVEL SECURITY;
CREATE TABLE public.tenant_payment_channels (
    channel_type text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    mpesa_config_id uuid,
    name text NOT NULL,
    status text DEFAULT 'inactive'::text NOT NULL,
    tenant_id text NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    bank_account_id uuid
);
ALTER TABLE ONLY public.tenant_payment_channels FORCE ROW LEVEL SECURITY;
CREATE TABLE public.tenant_pending_waivers (
    amount_minor numeric(10,2) NOT NULL,
    class_name text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reason text NOT NULL,
    status text NOT NULL,
    student_id uuid NOT NULL,
    student_name text NOT NULL,
    tenant_id uuid NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    waiver_number text NOT NULL
);
CREATE TABLE public.tenants (
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    name text NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    subdomain text NOT NULL,
    tenant_id text NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL
);
ALTER TABLE ONLY public.tenants FORCE ROW LEVEL SECURITY;
CREATE TABLE public.terms (
    id text NOT NULL,
    school_id text NOT NULL,
    academic_year_id text NOT NULL,
    name text NOT NULL,
    term_number integer NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    status public."TermStatus" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.timetable_audit_logs (
    action text NOT NULL,
    actor_user_id uuid,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    slot_id uuid,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    version_id uuid,
    school_id text
);
ALTER TABLE ONLY public.timetable_audit_logs FORCE ROW LEVEL SECURITY;
CREATE TABLE public.timetable_common_blocks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    configuration_id uuid NOT NULL,
    name text NOT NULL,
    activity_type text DEFAULT 'activity'::text NOT NULL,
    day_of_week integer NOT NULL,
    period_id uuid NOT NULL,
    duration_periods integer DEFAULT 1 NOT NULL,
    target_scope text DEFAULT 'school'::text NOT NULL,
    target_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_locked boolean DEFAULT true NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    school_id text,
    CONSTRAINT timetable_common_blocks_day_of_week_check CHECK (((day_of_week >= 1) AND (day_of_week <= 7))),
    CONSTRAINT timetable_common_blocks_duration_periods_check CHECK ((duration_periods >= 1)),
    CONSTRAINT timetable_common_blocks_target_scope_check CHECK ((target_scope = ANY (ARRAY['school'::text, 'grade'::text, 'class'::text, 'stream'::text])))
);
ALTER TABLE ONLY public.timetable_common_blocks FORCE ROW LEVEL SECURITY;
CREATE TABLE public.timetable_configurations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    academic_year text NOT NULL,
    term_name text NOT NULL,
    row_version integer DEFAULT 1 NOT NULL,
    created_by_user_id uuid,
    updated_by_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    school_id text
);
ALTER TABLE ONLY public.timetable_configurations FORCE ROW LEVEL SECURITY;
CREATE TABLE public.timetable_days (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    configuration_id uuid NOT NULL,
    day_of_week integer NOT NULL,
    name text NOT NULL,
    is_teaching_day boolean DEFAULT true NOT NULL,
    order_index integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    school_id text,
    CONSTRAINT timetable_days_day_of_week_check CHECK (((day_of_week >= 1) AND (day_of_week <= 7)))
);
ALTER TABLE ONLY public.timetable_days FORCE ROW LEVEL SECURITY;
CREATE TABLE public.timetable_generation_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    version_id uuid NOT NULL,
    status text NOT NULL,
    scope jsonb DEFAULT '{"type": "school"}'::jsonb NOT NULL,
    required_lessons integer DEFAULT 0 NOT NULL,
    scheduled_lessons integer DEFAULT 0 NOT NULL,
    unscheduled_lessons integer DEFAULT 0 NOT NULL,
    warnings jsonb DEFAULT '[]'::jsonb NOT NULL,
    error_message text,
    created_by_user_id uuid,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    school_id text,
    CONSTRAINT timetable_generation_runs_status_check CHECK ((status = ANY (ARRAY['running'::text, 'completed'::text, 'completed_with_gaps'::text, 'failed'::text])))
);
ALTER TABLE ONLY public.timetable_generation_runs FORCE ROW LEVEL SECURITY;
CREATE TABLE public.timetable_period_definitions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    configuration_id uuid NOT NULL,
    day_of_week integer NOT NULL,
    name text NOT NULL,
    starts_at time without time zone NOT NULL,
    ends_at time without time zone NOT NULL,
    period_type text DEFAULT 'lesson'::text NOT NULL,
    is_teaching boolean DEFAULT true NOT NULL,
    order_index integer NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    school_id text,
    CONSTRAINT ck_timetable_period_time_order CHECK ((starts_at < ends_at)),
    CONSTRAINT timetable_period_definitions_day_of_week_check CHECK (((day_of_week >= 1) AND (day_of_week <= 7)))
);
ALTER TABLE ONLY public.timetable_period_definitions FORCE ROW LEVEL SECURITY;
CREATE TABLE public.timetable_periods (
    id text NOT NULL,
    school_id text NOT NULL,
    name text NOT NULL,
    day_of_week integer NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    period_type public."PeriodType" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.timetable_relief_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    version_id uuid NOT NULL,
    slot_id uuid NOT NULL,
    relief_date date NOT NULL,
    absent_teacher_id text NOT NULL,
    substitute_teacher_id text NOT NULL,
    reason text,
    status text DEFAULT 'assigned'::text NOT NULL,
    row_version integer DEFAULT 1 NOT NULL,
    assigned_by_user_id uuid,
    cancelled_by_user_id uuid,
    cancelled_at timestamp with time zone,
    cancellation_reason text,
    notification_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    school_id text,
    CONSTRAINT timetable_relief_assignments_status_check CHECK ((status = ANY (ARRAY['assigned'::text, 'cancelled'::text, 'completed'::text])))
);
ALTER TABLE ONLY public.timetable_relief_assignments FORCE ROW LEVEL SECURITY;
CREATE TABLE public.timetable_resources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    name text NOT NULL,
    resource_type text DEFAULT 'room'::text NOT NULL,
    capacity integer,
    is_exclusive boolean DEFAULT true NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    source_kind text,
    source_record_id text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    row_version integer DEFAULT 1 NOT NULL,
    created_by_user_id uuid,
    updated_by_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    school_id text,
    CONSTRAINT timetable_resources_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'archived'::text])))
);
ALTER TABLE ONLY public.timetable_resources FORCE ROW LEVEL SECURITY;
CREATE TABLE public.timetable_slots (
    academic_year text NOT NULL,
    class_section_id text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by_user_id uuid NOT NULL,
    day_of_week integer NOT NULL,
    ends_at time without time zone NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    room_id text NOT NULL,
    starts_at time without time zone NOT NULL,
    subject_id text NOT NULL,
    teacher_id text NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    term_name text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    school_id text,
    version_id uuid,
    requirement_id uuid,
    generation_run_id uuid,
    stream_id text,
    resource_id uuid,
    period_id uuid,
    parallel_key text,
    duration_periods integer DEFAULT 1 NOT NULL,
    locked boolean DEFAULT false NOT NULL,
    locked_by_user_id uuid,
    locked_at timestamp with time zone,
    row_version integer DEFAULT 1 NOT NULL,
    source_kind text DEFAULT 'canonical'::text NOT NULL,
    source_record_id text,
    status text DEFAULT 'draft'::text NOT NULL
);
ALTER TABLE ONLY public.timetable_slots FORCE ROW LEVEL SECURITY;
CREATE TABLE public.timetable_subject_requirements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    academic_year text NOT NULL,
    term_name text NOT NULL,
    class_section_id text NOT NULL,
    stream_id text,
    subject_id text NOT NULL,
    teacher_id text,
    periods_per_week integer NOT NULL,
    duration_periods integer DEFAULT 1 NOT NULL,
    resource_id uuid,
    parallel_key text,
    preferred_days jsonb DEFAULT '[]'::jsonb NOT NULL,
    preferred_start_period_ids jsonb DEFAULT '[]'::jsonb CONSTRAINT timetable_subject_requireme_preferred_start_period_ids_not_null NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    row_version integer DEFAULT 1 NOT NULL,
    created_by_user_id uuid,
    updated_by_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    school_id text,
    CONSTRAINT timetable_subject_requirements_duration_periods_check CHECK ((duration_periods >= 1)),
    CONSTRAINT timetable_subject_requirements_periods_per_week_check CHECK ((periods_per_week >= 1)),
    CONSTRAINT timetable_subject_requirements_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'archived'::text])))
);
ALTER TABLE ONLY public.timetable_subject_requirements FORCE ROW LEVEL SECURITY;
CREATE TABLE public.timetable_teacher_availability (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    academic_year text NOT NULL,
    term_name text NOT NULL,
    teacher_id text NOT NULL,
    day_of_week integer NOT NULL,
    period_id uuid NOT NULL,
    state text NOT NULL,
    reason text,
    row_version integer DEFAULT 1 NOT NULL,
    created_by_user_id uuid,
    updated_by_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    school_id text,
    CONSTRAINT timetable_teacher_availability_day_of_week_check CHECK (((day_of_week >= 1) AND (day_of_week <= 7))),
    CONSTRAINT timetable_teacher_availability_state_check CHECK ((state = ANY (ARRAY['available'::text, 'prefer_free'::text, 'unavailable'::text, 'protected'::text])))
);
ALTER TABLE ONLY public.timetable_teacher_availability FORCE ROW LEVEL SECURITY;
CREATE TABLE public.timetable_unscheduled_requirements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    version_id uuid NOT NULL,
    generation_run_id uuid,
    requirement_id uuid NOT NULL,
    remaining_periods integer NOT NULL,
    duration_periods integer DEFAULT 1 NOT NULL,
    reason_code text NOT NULL,
    reason_message text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    row_version integer DEFAULT 1 NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    school_id text,
    CONSTRAINT timetable_unscheduled_requirements_duration_periods_check CHECK ((duration_periods >= 1)),
    CONSTRAINT timetable_unscheduled_requirements_remaining_periods_check CHECK ((remaining_periods >= 0)),
    CONSTRAINT timetable_unscheduled_requirements_status_check CHECK ((status = ANY (ARRAY['open'::text, 'partially_placed'::text, 'placed'::text, 'cancelled'::text])))
);
ALTER TABLE ONLY public.timetable_unscheduled_requirements FORCE ROW LEVEL SECURITY;
CREATE TABLE public.timetable_versions (
    academic_year text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    immutable boolean NOT NULL,
    notes text NOT NULL,
    published_at timestamp(3) without time zone NOT NULL,
    published_by_user_id uuid NOT NULL,
    status text NOT NULL,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    term_name text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    school_id text,
    revision_number integer DEFAULT 1 NOT NULL,
    source_version_id uuid,
    row_version integer DEFAULT 1 NOT NULL,
    configuration_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
    generation_summary jsonb DEFAULT '{}'::jsonb NOT NULL,
    source_kind text DEFAULT 'canonical'::text NOT NULL,
    created_by_user_id uuid
);
ALTER TABLE ONLY public.timetable_versions FORCE ROW LEVEL SECURITY;
CREATE TABLE public.transactions (
    id text DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    idempotency_key_id text NOT NULL,
    reference text NOT NULL,
    description text NOT NULL,
    currency_code text NOT NULL,
    total_amount_minor text NOT NULL,
    entry_count integer NOT NULL,
    effective_at timestamp(3) without time zone NOT NULL,
    posted_at timestamp(3) without time zone NOT NULL,
    request_id text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_by_user_id text,
    updated_by_user_id text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
ALTER TABLE ONLY public.transactions FORCE ROW LEVEL SECURITY;
CREATE TABLE public.transport_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text DEFAULT '00000000-0000-0000-0000-000000000000'::text NOT NULL,
    route_id uuid,
    vehicle_id uuid,
    trip_id uuid,
    title text NOT NULL,
    message text NOT NULL,
    severity text DEFAULT 'warning'::text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    notify_parent boolean DEFAULT false NOT NULL,
    resolved_by_user_id uuid,
    resolved_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    audit_log_reference uuid,
    CONSTRAINT ck_transport_alerts_severity CHECK ((severity = ANY (ARRAY['info'::text, 'warning'::text, 'critical'::text]))),
    CONSTRAINT ck_transport_alerts_status CHECK ((status = ANY (ARRAY['open'::text, 'acknowledged'::text, 'resolved'::text])))
);
ALTER TABLE ONLY public.transport_alerts FORCE ROW LEVEL SECURITY;
CREATE TABLE public.transport_audit_logs (
    action text NOT NULL,
    actor_user_id uuid NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metadata jsonb NOT NULL,
    resource_id uuid NOT NULL,
    resource_type text NOT NULL,
    tenant_id text DEFAULT '00000000-0000-0000-0000-000000000000'::text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    audit_log_reference uuid
);
ALTER TABLE ONLY public.transport_audit_logs FORCE ROW LEVEL SECURITY;
CREATE TABLE public.transport_drivers (
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by_user_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    license_expiry_date text NOT NULL,
    license_number text NOT NULL,
    name text NOT NULL,
    phone text NOT NULL,
    staff_id uuid NOT NULL,
    tenant_id text DEFAULT '00000000-0000-0000-0000-000000000000'::text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    audit_log_reference uuid,
    status text DEFAULT 'active'::text NOT NULL
);
ALTER TABLE ONLY public.transport_drivers FORCE ROW LEVEL SECURITY;
CREATE TABLE public.transport_manifest_students (
    boarding_status text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    manifest_id uuid NOT NULL,
    student_id uuid NOT NULL,
    tenant_id text DEFAULT '00000000-0000-0000-0000-000000000000'::text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    audit_log_reference uuid
);
ALTER TABLE ONLY public.transport_manifest_students FORCE ROW LEVEL SECURITY;
CREATE TABLE public.transport_manifests (
    academic_term_id uuid NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by_user_id uuid NOT NULL,
    effective_from text NOT NULL,
    effective_to text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    route_id uuid NOT NULL,
    tenant_id text DEFAULT '00000000-0000-0000-0000-000000000000'::text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    audit_log_reference uuid,
    status text DEFAULT 'active'::text NOT NULL
);
ALTER TABLE ONLY public.transport_manifests FORCE ROW LEVEL SECURITY;
CREATE TABLE public.transport_route_stops (
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    latitude text NOT NULL,
    longitude text NOT NULL,
    name text NOT NULL,
    notes text NOT NULL,
    planned_time text NOT NULL,
    route_id uuid NOT NULL,
    stop_sequence text NOT NULL,
    tenant_id text DEFAULT '00000000-0000-0000-0000-000000000000'::text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    audit_log_reference uuid
);
ALTER TABLE ONLY public.transport_route_stops FORCE ROW LEVEL SECURITY;
CREATE TABLE public.transport_routes (
    id text NOT NULL,
    school_id text NOT NULL,
    name text NOT NULL,
    route_code text NOT NULL,
    description text,
    monthly_fee double precision,
    status public."RouteStatus" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone,
    tenant_id text DEFAULT '00000000-0000-0000-0000-000000000000'::text NOT NULL,
    audit_log_reference uuid,
    direction text DEFAULT 'round_trip'::text NOT NULL,
    assigned_vehicle_id text,
    vehicle_assigned_at timestamp with time zone,
    vehicle_assigned_by_user_id uuid
);
ALTER TABLE ONLY public.transport_routes FORCE ROW LEVEL SECURITY;
CREATE TABLE public.transport_trip_events (
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    event_type text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    latitude text NOT NULL,
    longitude text NOT NULL,
    metadata jsonb NOT NULL,
    notes text NOT NULL,
    recorded_by_user_id uuid NOT NULL,
    stop_id uuid NOT NULL,
    student_id uuid NOT NULL,
    tenant_id text DEFAULT '00000000-0000-0000-0000-000000000000'::text NOT NULL,
    trip_id uuid NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    audit_log_reference uuid,
    event_time timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE ONLY public.transport_trip_events FORCE ROW LEVEL SECURITY;
CREATE TABLE public.transport_trips (
    actual_start_at timestamp(3) without time zone NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    direction text NOT NULL,
    driver_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    learner_count integer NOT NULL,
    manifest_id uuid NOT NULL,
    route_id uuid NOT NULL,
    scheduled_start_at timestamp(3) without time zone NOT NULL,
    started_by_user_id uuid NOT NULL,
    status text NOT NULL,
    tenant_id text DEFAULT '00000000-0000-0000-0000-000000000000'::text NOT NULL,
    trip_date text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    vehicle_id uuid NOT NULL,
    audit_log_reference uuid
);
ALTER TABLE ONLY public.transport_trips FORCE ROW LEVEL SECURITY;
CREATE TABLE public.transport_vehicles (
    id text NOT NULL,
    school_id text NOT NULL,
    registration_number text NOT NULL,
    vehicle_type text NOT NULL,
    capacity integer NOT NULL,
    driver_name text,
    driver_phone text,
    status public."VehicleStatus" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone,
    tenant_id text DEFAULT '00000000-0000-0000-0000-000000000000'::text NOT NULL,
    audit_log_reference uuid,
    ownership_type text DEFAULT 'school_owned'::text NOT NULL
);
ALTER TABLE ONLY public.transport_vehicles FORCE ROW LEVEL SECURITY;
CREATE TABLE public.usage_records (
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    feature_key text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    idempotency_key text NOT NULL,
    metadata jsonb NOT NULL,
    period_end text NOT NULL,
    period_start text NOT NULL,
    quantity integer NOT NULL,
    recorded_at timestamp(3) without time zone NOT NULL,
    subscription_id uuid NOT NULL,
    tenant_id text NOT NULL,
    unit text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
ALTER TABLE ONLY public.usage_records FORCE ROW LEVEL SECURITY;
CREATE TABLE public.user_permission_overrides (
    id text NOT NULL,
    user_id uuid NOT NULL,
    school_id text NOT NULL,
    permission_id uuid NOT NULL,
    allowed boolean NOT NULL,
    reason text,
    expires_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id text,
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    scope_type text DEFAULT 'SCHOOL'::text NOT NULL,
    scope_id text,
    assigned_by_user_id uuid NOT NULL,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id text NOT NULL,
    CONSTRAINT ck_user_roles_legacy_school_tenant CHECK (((school_id IS NULL) OR (school_id = tenant_id))),
    CONSTRAINT ck_user_roles_scope_type CHECK ((scope_type = ANY (ARRAY['PLATFORM'::text, 'SCHOOL'::text, 'DEPARTMENT'::text, 'GRADE_FORM'::text, 'CLASS_STREAM'::text, 'CLASS'::text, 'STREAM'::text, 'SUBJECT'::text, 'BOARDING_HOUSE'::text, 'ASSIGNED_STUDENTS'::text, 'OWN_CHILDREN'::text, 'SELF'::text, 'READ_ONLY'::text, 'NONE'::text]))),
    CONSTRAINT ck_user_roles_status CHECK ((status = ANY (ARRAY['ACTIVE'::text, 'REVOKED'::text])))
);
ALTER TABLE ONLY public.user_roles FORCE ROW LEVEL SECURITY;
CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    full_name text NOT NULL,
    email text NOT NULL,
    phone text,
    password_hash text NOT NULL,
    avatar_url text,
    status text DEFAULT 'active'::text NOT NULL,
    last_login_at timestamp(3) without time zone,
    email_verified_at timestamp with time zone,
    phone_verified_at timestamp(3) without time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp(3) without time zone,
    tenant_id text DEFAULT 'global'::text NOT NULL,
    display_name text NOT NULL,
    user_type text DEFAULT 'member'::text NOT NULL,
    recovery_email text,
    mfa_enabled boolean DEFAULT false NOT NULL,
    mfa_verified_at timestamp with time zone,
    password_changed_at timestamp with time zone,
    phone_number_ciphertext text,
    phone_number_hash text,
    phone_number_last4 text,
    CONSTRAINT ck_users_status CHECK ((status = ANY (ARRAY['active'::text, 'disabled'::text, 'locked'::text]))),
    CONSTRAINT ck_users_user_type CHECK ((user_type = ANY (ARRAY['member'::text, 'platform_owner'::text])))
);
ALTER TABLE ONLY public.users FORCE ROW LEVEL SECURITY;
CREATE TABLE public.v2_counselling_sessions (
    id text NOT NULL,
    school_id text NOT NULL,
    counselling_case_id text NOT NULL,
    session_date timestamp(3) without time zone NOT NULL,
    notes text NOT NULL,
    follow_up_required boolean NOT NULL,
    follow_up_date timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.v2_discipline_actions (
    id text NOT NULL,
    school_id text NOT NULL,
    discipline_case_id text NOT NULL,
    action_type public."DisciplineActionType" NOT NULL,
    description text NOT NULL,
    requires_approval boolean NOT NULL,
    approved_by_user_id text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.vehicle_fuel_logs (
    id text NOT NULL,
    school_id text,
    vehicle_id text NOT NULL,
    fuel_date timestamp(3) without time zone NOT NULL,
    litres double precision NOT NULL,
    amount double precision DEFAULT 0 NOT NULL,
    odometer_reading double precision,
    recorded_by_user_id uuid,
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp(3) without time zone,
    tenant_id text DEFAULT '00000000-0000-0000-0000-000000000000'::text NOT NULL,
    audit_log_reference uuid,
    cost_minor bigint DEFAULT 0 NOT NULL,
    station text,
    receipt_reference text
);
ALTER TABLE ONLY public.vehicle_fuel_logs FORCE ROW LEVEL SECURITY;
CREATE TABLE public.vehicle_service_logs (
    cost_minor numeric(10,2) NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    next_service_date text NOT NULL,
    notes text NOT NULL,
    odometer_reading text NOT NULL,
    recorded_by_user_id uuid NOT NULL,
    service_date text NOT NULL,
    service_provider text NOT NULL,
    tenant_id text DEFAULT '00000000-0000-0000-0000-000000000000'::text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    vehicle_id uuid NOT NULL,
    audit_log_reference uuid
);
ALTER TABLE ONLY public.vehicle_service_logs FORCE ROW LEVEL SECURITY;
CREATE TABLE public.visitors_logs (
    badge_number text,
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    host_user_id text,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    logged_by_user_id text DEFAULT 'system'::text NOT NULL,
    phone_number text,
    purpose text DEFAULT 'Unspecified'::text NOT NULL,
    tenant_id text DEFAULT 'legacy-unassigned'::text NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    visitor_name text DEFAULT 'Unknown visitor'::text NOT NULL,
    visitor_id uuid,
    time_in timestamp with time zone DEFAULT now() NOT NULL,
    time_out timestamp with time zone,
    status text DEFAULT 'active'::text NOT NULL,
    id_number text
);
ALTER TABLE ONLY public.visitors_logs FORCE ROW LEVEL SECURITY;
CREATE VIEW public.visitor_checkins AS
 SELECT id,
    tenant_id,
    visitor_id,
    visitor_name,
    phone_number,
    purpose,
    host_user_id,
    badge_number,
    time_in AS checked_in_at,
    time_out AS checked_out_at,
    status,
    logged_by_user_id,
    created_at,
    updated_at
   FROM public.visitors_logs;
CREATE TABLE public.visitor_logs (
    id text NOT NULL,
    school_id text NOT NULL,
    visitor_id text NOT NULL,
    purpose text NOT NULL,
    person_to_see_user_id text,
    student_to_see_id text,
    time_in timestamp(3) without time zone NOT NULL,
    time_out timestamp(3) without time zone,
    pass_number text,
    recorded_by_user_id text NOT NULL,
    status public."VisitorStatus" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.visitors (
    id text NOT NULL,
    school_id text NOT NULL,
    full_name text NOT NULL,
    phone text,
    id_number text,
    is_frequent_visitor boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
CREATE TABLE public.visitors_appointments (
    appointment_time timestamp with time zone NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by_user_id text NOT NULL,
    host_user_id text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    purpose text NOT NULL,
    tenant_id text NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    visitor_name text NOT NULL,
    status text DEFAULT 'scheduled'::text NOT NULL
);
ALTER TABLE ONLY public.visitors_appointments FORCE ROW LEVEL SECURITY;
CREATE TABLE public.visitors_registry (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    full_name text NOT NULL,
    phone_number text,
    id_number text,
    visitor_type text DEFAULT 'parent'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE ONLY public.visitors_registry FORCE ROW LEVEL SECURITY;
CREATE TABLE public.welfare_concerns (
    id text NOT NULL,
    school_id text NOT NULL,
    student_id text NOT NULL,
    reporter_user_id text NOT NULL,
    description text NOT NULL,
    category text NOT NULL,
    status text DEFAULT 'OPEN'::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.workflow_events (
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    entity_id text,
    entity_type text NOT NULL,
    event_type text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message text,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    priority text DEFAULT 'normal'::text NOT NULL,
    source_role text,
    source_user_id uuid,
    target_roles jsonb DEFAULT '[]'::jsonb NOT NULL,
    tenant_id text NOT NULL,
    title text NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    handled_by_user_id uuid
);
ALTER TABLE ONLY public.workflow_events FORCE ROW LEVEL SECURITY;
CREATE TABLE public.workflow_tasks (
    id text NOT NULL,
    school_id text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    assigned_to_user_id text NOT NULL,
    created_by_user_id text NOT NULL,
    priority public."TaskPriority" NOT NULL,
    status public."TaskStatus" NOT NULL,
    due_at timestamp(3) without time zone,
    related_entity_type text,
    related_entity_id text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);
ALTER TABLE ONLY public.sync_operation_logs ALTER COLUMN version SET DEFAULT nextval('public.sync_operation_logs_version_seq'::regclass);
ALTER TABLE ONLY public.academic_audit_logs
    ADD CONSTRAINT academic_audit_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.academic_class_sections
    ADD CONSTRAINT academic_class_sections_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.academic_intervention_updates
    ADD CONSTRAINT academic_intervention_updates_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.academic_interventions
    ADD CONSTRAINT academic_interventions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.academic_levels
    ADD CONSTRAINT academic_levels_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.academic_subject_offerings
    ADD CONSTRAINT academic_subject_offerings_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.academic_terms
    ADD CONSTRAINT academic_terms_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.academic_timetable_slots
    ADD CONSTRAINT academic_timetable_slots_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.academic_years
    ADD CONSTRAINT academic_years_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.academics_assignment_submissions
    ADD CONSTRAINT academics_assignment_submissions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.academics_assignments
    ADD CONSTRAINT academics_assignments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.academics_attendance
    ADD CONSTRAINT academics_attendance_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.academics_attendance_settings
    ADD CONSTRAINT academics_attendance_settings_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.academics_calendar_periods
    ADD CONSTRAINT academics_calendar_periods_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.academics_class_teachers
    ADD CONSTRAINT academics_class_teachers_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.academics_curriculum_configurations
    ADD CONSTRAINT academics_curriculum_configurations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.academics_department_hod_appointments
    ADD CONSTRAINT academics_department_hod_appointments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.academics_departments
    ADD CONSTRAINT academics_departments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.academics_grading_systems
    ADD CONSTRAINT academics_grading_systems_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.academics_lesson_logs
    ADD CONSTRAINT academics_lesson_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.academics_report_card_settings
    ADD CONSTRAINT academics_report_card_settings_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.academics_resources
    ADD CONSTRAINT academics_resources_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.academics_role_appointments
    ADD CONSTRAINT academics_role_appointments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.admin_incidents
    ADD CONSTRAINT admin_incidents_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.admission_applications
    ADD CONSTRAINT admission_applications_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.admission_appointments
    ADD CONSTRAINT admission_appointments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.admission_documents
    ADD CONSTRAINT admission_documents_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.admission_drafts
    ADD CONSTRAINT admission_drafts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.admission_enquiries
    ADD CONSTRAINT admission_enquiries_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.admission_interviews
    ADD CONSTRAINT admission_interviews_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.admission_offers
    ADD CONSTRAINT admission_offers_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.admission_settings
    ADD CONSTRAINT admission_settings_pkey PRIMARY KEY (tenant_id);
ALTER TABLE ONLY public.admission_tasks
    ADD CONSTRAINT admission_tasks_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.admission_templates
    ADD CONSTRAINT admission_templates_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.admissions_applications
    ADD CONSTRAINT admissions_applications_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.ai_anomalies
    ADD CONSTRAINT ai_anomalies_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.ai_forecasts
    ADD CONSTRAINT ai_forecasts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.ai_insight_alerts
    ADD CONSTRAINT ai_insight_alerts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.ai_insight_audit_logs
    ADD CONSTRAINT ai_insight_audit_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.ai_insight_runs
    ADD CONSTRAINT ai_insight_runs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.ai_recommendations
    ADD CONSTRAINT ai_recommendations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.approval_audit_logs
    ADD CONSTRAINT approval_audit_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.approval_requests
    ADD CONSTRAINT approval_requests_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.approval_rules
    ADD CONSTRAINT approval_rules_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.asset_assignments
    ADD CONSTRAINT asset_assignments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.asset_audit_logs
    ADD CONSTRAINT asset_audit_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.asset_depreciation_entries
    ADD CONSTRAINT asset_depreciation_entries_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.asset_movements
    ADD CONSTRAINT asset_movements_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.asset_repairs
    ADD CONSTRAINT asset_repairs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.attendance_rules
    ADD CONSTRAINT attendance_rules_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.attendance_sessions
    ADD CONSTRAINT attendance_sessions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.auth_action_tokens
    ADD CONSTRAINT auth_action_tokens_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.auth_email_outbox
    ADD CONSTRAINT auth_email_outbox_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.auth_mfa_challenges
    ADD CONSTRAINT auth_mfa_challenges_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.auth_trusted_devices
    ADD CONSTRAINT auth_trusted_devices_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.beds
    ADD CONSTRAINT beds_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.behavior_improvement_plan_steps
    ADD CONSTRAINT behavior_improvement_plan_steps_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.behavior_improvement_plans
    ADD CONSTRAINT behavior_improvement_plans_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.behavior_points
    ADD CONSTRAINT behavior_points_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.billing_notifications
    ADD CONSTRAINT billing_notifications_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.biometric_devices
    ADD CONSTRAINT biometric_devices_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.biometric_events
    ADD CONSTRAINT biometric_events_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.biometric_identities
    ADD CONSTRAINT biometric_identities_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.boarding_allocations
    ADD CONSTRAINT boarding_allocations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.boarding_attendance
    ADD CONSTRAINT boarding_attendance_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.boarding_audit_logs
    ADD CONSTRAINT boarding_audit_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.boarding_dormitory_checks
    ADD CONSTRAINT boarding_dormitory_checks_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.boarding_exeats
    ADD CONSTRAINT boarding_exeats_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.boarding_houses
    ADD CONSTRAINT boarding_houses_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.boarding_incidents
    ADD CONSTRAINT boarding_incidents_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.boarding_meals
    ADD CONSTRAINT boarding_meals_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.boarding_referrals
    ADD CONSTRAINT boarding_referrals_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.boarding_reports
    ADD CONSTRAINT boarding_reports_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.boarding_students
    ADD CONSTRAINT boarding_students_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.breach_response_reports
    ADD CONSTRAINT breach_response_reports_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.callback_logs
    ADD CONSTRAINT callback_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.cbc_assessment_entries
    ADD CONSTRAINT cbc_assessment_entries_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.cbt_attempts
    ADD CONSTRAINT cbt_attempts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.cbt_audit_logs
    ADD CONSTRAINT cbt_audit_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.cbt_exam_sessions
    ADD CONSTRAINT cbt_exam_sessions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.cbt_invigilation_events
    ADD CONSTRAINT cbt_invigilation_events_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.cbt_questions
    ADD CONSTRAINT cbt_questions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.cbt_responses
    ADD CONSTRAINT cbt_responses_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.chemical_disposal_requests
    ADD CONSTRAINT chemical_disposal_requests_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.chemical_items
    ADD CONSTRAINT chemical_items_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.child_data_dpia_records
    ADD CONSTRAINT child_data_dpia_records_pkey PRIMARY KEY (id);
ALTER TABLE public.communication_sms_outbox
    ADD CONSTRAINT ck_communication_sms_outbox_tenant_owner CHECK (((btrim(tenant_id) <> ''::text) AND (lower(btrim(tenant_id)) <> 'global'::text) AND (tenant_id <> '00000000-0000-0000-0000-000000000000'::text))) NOT VALID;
ALTER TABLE public.sync_cursors
    ADD CONSTRAINT ck_sync_cursors_entity CHECK ((entity = ANY (ARRAY['attendance'::text, 'finance'::text]))) NOT VALID;
ALTER TABLE public.sync_operation_logs
    ADD CONSTRAINT ck_sync_operation_logs_entity CHECK ((entity = ANY (ARRAY['attendance'::text, 'finance'::text]))) NOT VALID;
ALTER TABLE ONLY public.class_requests
    ADD CONSTRAINT class_requests_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.class_sections
    ADD CONSTRAINT class_sections_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.class_streams
    ADD CONSTRAINT class_streams_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.class_subject_assignments
    ADD CONSTRAINT class_subject_assignments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.class_subjects
    ADD CONSTRAINT class_subjects_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.class_timetable_entries
    ADD CONSTRAINT class_timetable_entries_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.clinic_alerts
    ADD CONSTRAINT clinic_alerts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.clinic_audit_logs
    ADD CONSTRAINT clinic_audit_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.clinic_disposal_requests
    ADD CONSTRAINT clinic_disposal_requests_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.clinic_locations
    ADD CONSTRAINT clinic_locations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.clinic_medicine_batches
    ADD CONSTRAINT clinic_medicine_batches_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.clinic_medicine_dispenses
    ADD CONSTRAINT clinic_medicine_dispenses_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.clinic_medicines
    ADD CONSTRAINT clinic_medicines_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.clinic_procurement_recommendations
    ADD CONSTRAINT clinic_procurement_recommendations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.clinic_stock_movements
    ADD CONSTRAINT clinic_stock_movements_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.clinic_visits
    ADD CONSTRAINT clinic_visits_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.commendations
    ADD CONSTRAINT commendations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.communication_broadcasts
    ADD CONSTRAINT communication_broadcasts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.communication_sms_outbox
    ADD CONSTRAINT communication_sms_outbox_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.communication_templates
    ADD CONSTRAINT communication_templates_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.computer_lab_pcs
    ADD CONSTRAINT computer_lab_pcs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.computer_lab_sessions
    ADD CONSTRAINT computer_lab_sessions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.computer_lab_usage_logs
    ADD CONSTRAINT computer_lab_usage_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.consent_records
    ADD CONSTRAINT consent_records_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.counselling_cases
    ADD CONSTRAINT counselling_cases_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.counselling_escalations
    ADD CONSTRAINT counselling_escalations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.counselling_notes
    ADD CONSTRAINT counselling_notes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.counselling_referrals
    ADD CONSTRAINT counselling_referrals_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.counselling_sessions
    ADD CONSTRAINT counselling_sessions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.dashboard_approval_requests
    ADD CONSTRAINT dashboard_approval_requests_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.dashboard_summary_snapshots
    ADD CONSTRAINT dashboard_summary_snapshots_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.dashboard_tasks
    ADD CONSTRAINT dashboard_tasks_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.data_retention_schedules
    ADD CONSTRAINT data_retention_schedules_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.data_subject_requests
    ADD CONSTRAINT data_subject_requests_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.discipline_actions
    ADD CONSTRAINT discipline_actions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.discipline_attachments
    ADD CONSTRAINT discipline_attachments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.discipline_audit_logs
    ADD CONSTRAINT discipline_audit_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.discipline_cases
    ADD CONSTRAINT discipline_cases_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.discipline_comments
    ADD CONSTRAINT discipline_comments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.discipline_document_templates
    ADD CONSTRAINT discipline_document_templates_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.discipline_generated_documents
    ADD CONSTRAINT discipline_generated_documents_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.discipline_incidents
    ADD CONSTRAINT discipline_incidents_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.discipline_notifications
    ADD CONSTRAINT discipline_notifications_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.documents_generated
    ADD CONSTRAINT documents_generated_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.dormitories
    ADD CONSTRAINT dormitories_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.duty_rosters
    ADD CONSTRAINT duty_rosters_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.event_consumer_runs
    ADD CONSTRAINT event_consumer_runs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.exam_assessment_components
    ADD CONSTRAINT exam_assessment_components_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.exam_assessments
    ADD CONSTRAINT exam_assessments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.exam_attendance_records
    ADD CONSTRAINT exam_attendance_records_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.exam_competency_outcomes
    ADD CONSTRAINT exam_competency_outcomes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.exam_cycles
    ADD CONSTRAINT exam_cycles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.exam_grade_boundaries
    ADD CONSTRAINT exam_grade_boundaries_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.exam_grading_policies
    ADD CONSTRAINT exam_grading_policies_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.exam_grading_policy_boundaries
    ADD CONSTRAINT exam_grading_policy_boundaries_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.exam_invigilators
    ADD CONSTRAINT exam_invigilators_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.exam_mark_audit_logs
    ADD CONSTRAINT exam_mark_audit_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.exam_mark_entry_windows
    ADD CONSTRAINT exam_mark_entry_windows_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.exam_mark_import_batch_items
    ADD CONSTRAINT exam_mark_import_batch_items_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.exam_mark_import_batches
    ADD CONSTRAINT exam_mark_import_batches_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.exam_mark_versions
    ADD CONSTRAINT exam_mark_versions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.exam_marks
    ADD CONSTRAINT exam_marks_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.exam_readiness_checks
    ADD CONSTRAINT exam_readiness_checks_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.exam_report_card_signatures
    ADD CONSTRAINT exam_report_card_signatures_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.exam_result_snapshots
    ADD CONSTRAINT exam_result_snapshots_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.exam_series
    ADD CONSTRAINT exam_series_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.exam_settings_audit_logs
    ADD CONSTRAINT exam_settings_audit_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.exam_settings
    ADD CONSTRAINT exam_settings_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.exam_settings
    ADD CONSTRAINT exam_settings_tenant_id_key UNIQUE (tenant_id);
ALTER TABLE ONLY public.exam_student_cases
    ADD CONSTRAINT exam_student_cases_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.exam_subject_weightings
    ADD CONSTRAINT exam_subject_weightings_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.exam_subjects
    ADD CONSTRAINT exam_subjects_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.exam_timetable_slots
    ADD CONSTRAINT exam_timetable_slots_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.facility_issues
    ADD CONSTRAINT facility_issues_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.fee_items
    ADD CONSTRAINT fee_items_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.fee_structures
    ADD CONSTRAINT fee_structures_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.fee_waivers
    ADD CONSTRAINT fee_waivers_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.file_objects
    ADD CONSTRAINT file_objects_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.file_uploads
    ADD CONSTRAINT file_uploads_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.finance_approval_requests
    ADD CONSTRAINT finance_approval_requests_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.finance_close_periods
    ADD CONSTRAINT finance_close_periods_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.finance_fee_categories
    ADD CONSTRAINT finance_fee_categories_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.finance_tasks
    ADD CONSTRAINT finance_tasks_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.front_office_tickets
    ADD CONSTRAINT front_office_tickets_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.gate_incidents
    ADD CONSTRAINT gate_incidents_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.grading_scale_ranges
    ADD CONSTRAINT grading_scale_ranges_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.grading_scales
    ADD CONSTRAINT grading_scales_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.group_guidance_sessions
    ADD CONSTRAINT group_guidance_sessions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.guardian_profiles
    ADD CONSTRAINT guardian_profiles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.hod_assignments
    ADD CONSTRAINT hod_assignments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.hod_reviews
    ADD CONSTRAINT hod_reviews_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.hostel_allocations
    ADD CONSTRAINT hostel_allocations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.hostel_audit_logs
    ADD CONSTRAINT hostel_audit_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.hostel_issues
    ADD CONSTRAINT hostel_issues_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.hostel_meal_consumption
    ADD CONSTRAINT hostel_meal_consumption_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.hostel_rooms
    ADD CONSTRAINT hostel_rooms_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.hostels
    ADD CONSTRAINT hostels_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.idempotency_keys
    ADD CONSTRAINT idempotency_keys_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.import_batches
    ADD CONSTRAINT import_batches_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.import_rows
    ADD CONSTRAINT import_rows_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.integration_logs
    ADD CONSTRAINT integration_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.inventory_categories
    ADD CONSTRAINT inventory_categories_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.inventory_incidents
    ADD CONSTRAINT inventory_incidents_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.inventory_item_balances
    ADD CONSTRAINT inventory_item_balances_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.inventory_locations
    ADD CONSTRAINT inventory_locations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.inventory_purchase_orders
    ADD CONSTRAINT inventory_purchase_orders_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.inventory_request_backorders
    ADD CONSTRAINT inventory_request_backorders_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.inventory_request_items
    ADD CONSTRAINT inventory_request_items_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.inventory_requests
    ADD CONSTRAINT inventory_requests_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.inventory_requisitions
    ADD CONSTRAINT inventory_requisitions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.inventory_reservations
    ADD CONSTRAINT inventory_reservations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.inventory_stock_count_snapshots
    ADD CONSTRAINT inventory_stock_count_snapshots_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.inventory_stock_movements
    ADD CONSTRAINT inventory_stock_movements_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.inventory_suppliers
    ADD CONSTRAINT inventory_suppliers_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.inventory_transfers
    ADD CONSTRAINT inventory_transfers_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.iot_alerts
    ADD CONSTRAINT iot_alerts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.iot_audit_logs
    ADD CONSTRAINT iot_audit_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.iot_device_commands
    ADD CONSTRAINT iot_device_commands_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.iot_device_credentials
    ADD CONSTRAINT iot_device_credentials_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.iot_devices
    ADD CONSTRAINT iot_devices_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.iot_gateway_ingestions
    ADD CONSTRAINT iot_gateway_ingestions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.iot_telemetry_readings
    ADD CONSTRAINT iot_telemetry_readings_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.lab_attendance
    ADD CONSTRAINT lab_attendance_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.lab_breakage_loss_records
    ADD CONSTRAINT lab_breakage_loss_records_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.lab_departments
    ADD CONSTRAINT lab_departments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.lab_equipment
    ADD CONSTRAINT lab_equipment_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.lab_issue_lines
    ADD CONSTRAINT lab_issue_lines_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.lab_issue_records
    ADD CONSTRAINT lab_issue_records_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.lab_issue_returns
    ADD CONSTRAINT lab_issue_returns_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.lab_practical_request_items
    ADD CONSTRAINT lab_practical_request_items_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.lab_practical_requests
    ADD CONSTRAINT lab_practical_requests_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.lab_safety_checks
    ADD CONSTRAINT lab_safety_checks_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.lab_session_chemical_usage
    ADD CONSTRAINT lab_session_chemical_usage_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.lab_session_equipment_usage
    ADD CONSTRAINT lab_session_equipment_usage_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.lab_sessions
    ADD CONSTRAINT lab_sessions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.lab_stock_movements
    ADD CONSTRAINT lab_stock_movements_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.lab_stocktake_lines
    ADD CONSTRAINT lab_stocktake_lines_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.lab_stocktakes
    ADD CONSTRAINT lab_stocktakes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.lab_storage_locations
    ADD CONSTRAINT lab_storage_locations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.labs
    ADD CONSTRAINT labs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.learning_areas
    ADD CONSTRAINT learning_areas_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.library_audit_logs
    ADD CONSTRAINT library_audit_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.library_book_copies
    ADD CONSTRAINT library_book_copies_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.library_books
    ADD CONSTRAINT library_books_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.library_borrower_limits
    ADD CONSTRAINT library_borrower_limits_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.library_borrowers
    ADD CONSTRAINT library_borrowers_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.library_catalog_items
    ADD CONSTRAINT library_catalog_items_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.library_circulation_ledger
    ADD CONSTRAINT library_circulation_ledger_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.library_copies
    ADD CONSTRAINT library_copies_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.library_fine_rules
    ADD CONSTRAINT library_fine_rules_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.library_fines
    ADD CONSTRAINT library_fines_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.library_loans
    ADD CONSTRAINT library_loans_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.library_renewals
    ADD CONSTRAINT library_renewals_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.library_reservations
    ADD CONSTRAINT library_reservations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.lms_activity_events
    ADD CONSTRAINT lms_activity_events_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.lms_assignments
    ADD CONSTRAINT lms_assignments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.lms_audit_logs
    ADD CONSTRAINT lms_audit_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.lms_content_items
    ADD CONSTRAINT lms_content_items_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.lms_courses
    ADD CONSTRAINT lms_courses_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.lms_submissions
    ADD CONSTRAINT lms_submissions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.maintenance_tickets
    ADD CONSTRAINT maintenance_tickets_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.manual_fee_payment_allocations
    ADD CONSTRAINT manual_fee_payment_allocations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.manual_fee_payments
    ADD CONSTRAINT manual_fee_payments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.mark_submissions
    ADD CONSTRAINT mark_submissions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.marks_entries
    ADD CONSTRAINT marks_entries_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.medical_visits
    ADD CONSTRAINT medical_visits_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.medicine_dispensing_logs
    ADD CONSTRAINT medicine_dispensing_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.medicine_inventory
    ADD CONSTRAINT medicine_inventory_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.meeting_minutes
    ADD CONSTRAINT meeting_minutes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.module_package_items
    ADD CONSTRAINT module_package_items_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.module_packages
    ADD CONSTRAINT module_packages_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.module_permissions
    ADD CONSTRAINT module_permissions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.module_registry
    ADD CONSTRAINT module_registry_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.module_usage_events
    ADD CONSTRAINT module_usage_events_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.monitoring_service_account_audit_logs
    ADD CONSTRAINT monitoring_service_account_audit_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.monitoring_service_accounts
    ADD CONSTRAINT monitoring_service_accounts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.mpesa_c2b_payments
    ADD CONSTRAINT mpesa_c2b_payments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.mpesa_callback_channels
    ADD CONSTRAINT mpesa_callback_channels_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.mpesa_config_audit_logs
    ADD CONSTRAINT mpesa_config_audit_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.mpesa_payload_support_access_logs
    ADD CONSTRAINT mpesa_payload_support_access_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.mpesa_payload_vault
    ADD CONSTRAINT mpesa_payload_vault_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.mpesa_reconciliation_batches
    ADD CONSTRAINT mpesa_reconciliation_batches_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.mpesa_reconciliation_discrepancies
    ADD CONSTRAINT mpesa_reconciliation_discrepancies_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.mpesa_transactions
    ADD CONSTRAINT mpesa_transactions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.mpesa_verification_jobs
    ADD CONSTRAINT mpesa_verification_jobs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.notification_deliveries
    ADD CONSTRAINT notification_deliveries_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.notification_rules
    ADD CONSTRAINT notification_rules_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT notification_templates_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.offense_categories
    ADD CONSTRAINT offense_categories_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.offline_sync_events
    ADD CONSTRAINT offline_sync_events_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.operations_alerts
    ADD CONSTRAINT operations_alerts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.operations_emergencies
    ADD CONSTRAINT operations_emergencies_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.operations_reports
    ADD CONSTRAINT operations_reports_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.outbox_events
    ADD CONSTRAINT outbox_events_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.parent_acknowledgements
    ADD CONSTRAINT parent_acknowledgements_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.parent_guardians
    ADD CONSTRAINT parent_guardians_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.parent_meetings
    ADD CONSTRAINT parent_meetings_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.parent_otp_challenges
    ADD CONSTRAINT parent_otp_challenges_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.payment_intents
    ADD CONSTRAINT payment_intents_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.platform_backups
    ADD CONSTRAINT platform_backups_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.platform_broadcasts
    ADD CONSTRAINT platform_broadcasts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.platform_payment_gateways
    ADD CONSTRAINT platform_payment_gateways_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.platform_security_policies
    ADD CONSTRAINT platform_security_policies_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.platform_settings
    ADD CONSTRAINT platform_settings_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.platform_sms_providers
    ADD CONSTRAINT platform_sms_providers_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.platform_templates
    ADD CONSTRAINT platform_templates_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.principal_alerts
    ADD CONSTRAINT principal_alerts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.principal_dashboard_snapshots
    ADD CONSTRAINT principal_dashboard_snapshots_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.procurement_approvals
    ADD CONSTRAINT procurement_approvals_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.procurement_audit_logs
    ADD CONSTRAINT procurement_audit_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.procurement_budget_links
    ADD CONSTRAINT procurement_budget_links_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.procurement_request_items
    ADD CONSTRAINT procurement_request_items_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.procurement_requests
    ADD CONSTRAINT procurement_requests_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.procurement_suppliers
    ADD CONSTRAINT procurement_suppliers_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.purchase_requests
    ADD CONSTRAINT purchase_requests_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.report_card_artifacts
    ADD CONSTRAINT report_card_artifacts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.report_card_comments
    ADD CONSTRAINT report_card_comments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.report_card_generation_batches
    ADD CONSTRAINT report_card_generation_batches_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.report_cards
    ADD CONSTRAINT report_cards_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.report_schedule_requests
    ADD CONSTRAINT report_schedule_requests_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.report_snapshot_audit_logs
    ADD CONSTRAINT report_snapshot_audit_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.report_snapshots
    ADD CONSTRAINT report_snapshots_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.school_integrations
    ADD CONSTRAINT school_integrations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.school_memberships
    ADD CONSTRAINT school_memberships_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.school_module_access
    ADD CONSTRAINT school_module_access_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.school_modules
    ADD CONSTRAINT school_modules_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.school_onboarding_status
    ADD CONSTRAINT school_onboarding_status_pkey PRIMARY KEY (tenant_id);
ALTER TABLE ONLY public.school_settings
    ADD CONSTRAINT school_settings_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.school_sms_wallets
    ADD CONSTRAINT school_sms_wallets_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.school_subscriptions
    ADD CONSTRAINT school_subscriptions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.schools
    ADD CONSTRAINT schools_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.secretary_queue_tickets
    ADD CONSTRAINT secretary_queue_tickets_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.security_incidents
    ADD CONSTRAINT security_incidents_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.security_lost_found
    ADD CONSTRAINT security_lost_found_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.security_panic_alerts
    ADD CONSTRAINT security_panic_alerts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.setup_checklist_items
    ADD CONSTRAINT setup_checklist_items_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.sms_credit_transactions
    ADD CONSTRAINT sms_credit_transactions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.sms_credit_wallets
    ADD CONSTRAINT sms_credit_wallets_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.sms_logs
    ADD CONSTRAINT sms_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.sms_purchase_requests
    ADD CONSTRAINT sms_purchase_requests_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.sms_wallet_transactions
    ADD CONSTRAINT sms_wallet_transactions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.staff_attendance
    ADD CONSTRAINT staff_attendance_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.staff_audit_logs
    ADD CONSTRAINT staff_audit_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.staff_contracts
    ADD CONSTRAINT staff_contracts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.staff_departments
    ADD CONSTRAINT staff_departments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.staff_disciplinary_records
    ADD CONSTRAINT staff_disciplinary_records_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.staff_document_expiry_reminders
    ADD CONSTRAINT staff_document_expiry_reminders_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.staff_documents
    ADD CONSTRAINT staff_documents_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.staff_job_titles
    ADD CONSTRAINT staff_job_titles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.staff_leave_balances
    ADD CONSTRAINT staff_leave_balances_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.staff_leave_requests
    ADD CONSTRAINT staff_leave_requests_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.staff_payroll_bands
    ADD CONSTRAINT staff_payroll_bands_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.staff_payslips
    ADD CONSTRAINT staff_payslips_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.staff_performance_reviews
    ADD CONSTRAINT staff_performance_reviews_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.staff_profiles
    ADD CONSTRAINT staff_profiles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.staff_salaries
    ADD CONSTRAINT staff_salaries_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.strands
    ADD CONSTRAINT strands_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.streams
    ADD CONSTRAINT streams_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.student_academic_enrollments
    ADD CONSTRAINT student_academic_enrollments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.student_academic_lifecycle_events
    ADD CONSTRAINT student_academic_lifecycle_events_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.student_allocations
    ADD CONSTRAINT student_allocations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.student_audit_logs
    ADD CONSTRAINT student_audit_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.student_class_assignments
    ADD CONSTRAINT student_class_assignments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.student_clearance
    ADD CONSTRAINT student_clearance_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.student_communications
    ADD CONSTRAINT student_communications_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.student_enrollments
    ADD CONSTRAINT student_enrollments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.student_exit_records
    ADD CONSTRAINT student_exit_records_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.student_exits
    ADD CONSTRAINT student_exits_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.student_fee_accounts
    ADD CONSTRAINT student_fee_accounts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.student_fee_assignments
    ADD CONSTRAINT student_fee_assignments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.student_fee_credits
    ADD CONSTRAINT student_fee_credits_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.student_fee_invoices
    ADD CONSTRAINT student_fee_invoices_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.student_fee_payment_allocations
    ADD CONSTRAINT student_fee_payment_allocations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.student_fee_structures
    ADD CONSTRAINT student_fee_structures_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.student_guardians
    ADD CONSTRAINT student_guardians_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.student_invoices
    ADD CONSTRAINT student_invoices_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.student_notes
    ADD CONSTRAINT student_notes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.student_portal_access
    ADD CONSTRAINT student_portal_access_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.student_report_card_audit_logs
    ADD CONSTRAINT student_report_card_audit_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.student_report_cards
    ADD CONSTRAINT student_report_cards_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.student_subject_enrollments
    ADD CONSTRAINT student_subject_enrollments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.student_timetable_enrollments
    ADD CONSTRAINT student_timetable_enrollments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.student_transfer_records
    ADD CONSTRAINT student_transfer_records_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.student_transport_assignments
    ADD CONSTRAINT student_transport_assignments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.sub_strands
    ADD CONSTRAINT sub_strands_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.supplier_invoices
    ADD CONSTRAINT supplier_invoices_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.support_agents
    ADD CONSTRAINT support_agents_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.support_attachments
    ADD CONSTRAINT support_attachments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.support_categories
    ADD CONSTRAINT support_categories_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.support_incidents
    ADD CONSTRAINT support_incidents_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.support_internal_notes
    ADD CONSTRAINT support_internal_notes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.support_kb_articles
    ADD CONSTRAINT support_kb_articles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.support_messages
    ADD CONSTRAINT support_messages_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.support_notifications
    ADD CONSTRAINT support_notifications_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.support_status_logs
    ADD CONSTRAINT support_status_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.support_status_notification_attempts
    ADD CONSTRAINT support_status_notification_attempts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.support_status_subscriptions
    ADD CONSTRAINT support_status_subscriptions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.support_status_unsubscribe_tokens
    ADD CONSTRAINT support_status_unsubscribe_tokens_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.support_system_components
    ADD CONSTRAINT support_system_components_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.sync_conflicts
    ADD CONSTRAINT sync_conflicts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.sync_cursors
    ADD CONSTRAINT sync_cursors_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.sync_devices
    ADD CONSTRAINT sync_devices_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.sync_operation_logs
    ADD CONSTRAINT sync_operation_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.system_health_logs
    ADD CONSTRAINT system_health_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.system_jobs
    ADD CONSTRAINT system_jobs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.teacher_attendance_logs
    ADD CONSTRAINT teacher_attendance_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.teacher_subject_assignments
    ADD CONSTRAINT teacher_subject_assignments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.tenant_bank_accounts
    ADD CONSTRAINT tenant_bank_accounts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.tenant_domains
    ADD CONSTRAINT tenant_domains_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.tenant_finance_summary
    ADD CONSTRAINT tenant_finance_summary_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.tenant_financial_accounts
    ADD CONSTRAINT tenant_financial_accounts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.tenant_memberships
    ADD CONSTRAINT tenant_memberships_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.tenant_mpesa_configs
    ADD CONSTRAINT tenant_mpesa_configs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.tenant_payment_channels
    ADD CONSTRAINT tenant_payment_channels_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.tenant_pending_waivers
    ADD CONSTRAINT tenant_pending_waivers_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.terms
    ADD CONSTRAINT terms_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.timetable_audit_logs
    ADD CONSTRAINT timetable_audit_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.timetable_common_blocks
    ADD CONSTRAINT timetable_common_blocks_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.timetable_configurations
    ADD CONSTRAINT timetable_configurations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.timetable_days
    ADD CONSTRAINT timetable_days_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.timetable_generation_runs
    ADD CONSTRAINT timetable_generation_runs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.timetable_period_definitions
    ADD CONSTRAINT timetable_period_definitions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.timetable_periods
    ADD CONSTRAINT timetable_periods_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.timetable_relief_assignments
    ADD CONSTRAINT timetable_relief_assignments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.timetable_resources
    ADD CONSTRAINT timetable_resources_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.timetable_slots
    ADD CONSTRAINT timetable_slots_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.timetable_subject_requirements
    ADD CONSTRAINT timetable_subject_requirements_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.timetable_teacher_availability
    ADD CONSTRAINT timetable_teacher_availability_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.timetable_unscheduled_requirements
    ADD CONSTRAINT timetable_unscheduled_requirements_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.timetable_versions
    ADD CONSTRAINT timetable_versions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.transport_alerts
    ADD CONSTRAINT transport_alerts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.transport_audit_logs
    ADD CONSTRAINT transport_audit_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.transport_drivers
    ADD CONSTRAINT transport_drivers_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.transport_manifest_students
    ADD CONSTRAINT transport_manifest_students_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.transport_manifests
    ADD CONSTRAINT transport_manifests_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.transport_route_stops
    ADD CONSTRAINT transport_route_stops_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.transport_routes
    ADD CONSTRAINT transport_routes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.transport_trip_events
    ADD CONSTRAINT transport_trip_events_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.transport_trips
    ADD CONSTRAINT transport_trips_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.transport_vehicles
    ADD CONSTRAINT transport_vehicles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.academic_class_sections
    ADD CONSTRAINT uq_academic_class_sections_class_stream_year UNIQUE (tenant_id, class_name, stream_name, academic_year);
ALTER TABLE ONLY public.academic_class_sections
    ADD CONSTRAINT uq_academic_class_sections_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.academic_intervention_updates
    ADD CONSTRAINT uq_academic_intervention_updates_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.academic_interventions
    ADD CONSTRAINT uq_academic_interventions_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.academic_levels
    ADD CONSTRAINT uq_academic_levels_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.academic_subject_offerings
    ADD CONSTRAINT uq_academic_subject_offerings_section_subject UNIQUE (tenant_id, class_section_id, subject_code);
ALTER TABLE ONLY public.academic_subject_offerings
    ADD CONSTRAINT uq_academic_subject_offerings_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.academic_terms
    ADD CONSTRAINT uq_academic_terms_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.academic_terms
    ADD CONSTRAINT uq_academic_terms_year_name UNIQUE (tenant_id, academic_year_id, name);
ALTER TABLE ONLY public.academic_timetable_slots
    ADD CONSTRAINT uq_academic_timetable_slots_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.academic_years
    ADD CONSTRAINT uq_academic_years_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.academics_assignment_submissions
    ADD CONSTRAINT uq_academics_assignment_submission UNIQUE (tenant_id, assignment_id, student_id);
ALTER TABLE ONLY public.academics_calendar_periods
    ADD CONSTRAINT uq_academics_calendar_periods_scope UNIQUE (tenant_id, academic_year_id, name, starts_on);
ALTER TABLE ONLY public.academics_calendar_periods
    ADD CONSTRAINT uq_academics_calendar_periods_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.academics_curriculum_configurations
    ADD CONSTRAINT uq_academics_curriculum_name_start UNIQUE (tenant_id, name, effective_from);
ALTER TABLE ONLY public.academics_departments
    ADD CONSTRAINT uq_academics_departments_tenant_name UNIQUE (tenant_id, name);
ALTER TABLE ONLY public.admission_applications
    ADD CONSTRAINT uq_admission_applications_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.admission_appointments
    ADD CONSTRAINT uq_admission_appointments_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.admission_drafts
    ADD CONSTRAINT uq_admission_drafts_owner UNIQUE (tenant_id, created_by_user_id);
ALTER TABLE ONLY public.admission_enquiries
    ADD CONSTRAINT uq_admission_enquiries_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.admission_interviews
    ADD CONSTRAINT uq_admission_interviews_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.admission_offers
    ADD CONSTRAINT uq_admission_offers_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.admission_tasks
    ADD CONSTRAINT uq_admission_tasks_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.admission_templates
    ADD CONSTRAINT uq_admission_templates_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.ai_insight_runs
    ADD CONSTRAINT uq_ai_insight_runs_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.auth_trusted_devices
    ADD CONSTRAINT uq_auth_trusted_devices_user_token UNIQUE (user_id, device_token_hash);
ALTER TABLE ONLY public.breach_response_reports
    ADD CONSTRAINT uq_breach_response_reports_tenant_incident UNIQUE (tenant_id, incident_number);
ALTER TABLE ONLY public.cbt_exam_sessions
    ADD CONSTRAINT uq_cbt_exam_sessions_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.child_data_dpia_records
    ADD CONSTRAINT uq_child_data_dpia_records_tenant_module UNIQUE (tenant_id, module_code, assessment_version);
ALTER TABLE ONLY public.class_requests
    ADD CONSTRAINT uq_class_requests_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.class_sections
    ADD CONSTRAINT uq_class_sections_scope UNIQUE (tenant_id, academic_year_id, name);
ALTER TABLE ONLY public.class_sections
    ADD CONSTRAINT uq_class_sections_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.class_streams
    ADD CONSTRAINT uq_class_streams_scope UNIQUE (tenant_id, class_section_id, name);
ALTER TABLE ONLY public.class_streams
    ADD CONSTRAINT uq_class_streams_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.class_subject_assignments
    ADD CONSTRAINT uq_class_subject_assignments_scope UNIQUE (tenant_id, academic_term_id, class_section_id, subject_id);
ALTER TABLE ONLY public.class_subject_assignments
    ADD CONSTRAINT uq_class_subject_assignments_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.clinic_locations
    ADD CONSTRAINT uq_clinic_locations_name UNIQUE (tenant_id, name);
ALTER TABLE ONLY public.clinic_locations
    ADD CONSTRAINT uq_clinic_locations_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.clinic_medicine_batches
    ADD CONSTRAINT uq_clinic_medicine_batches_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.clinic_medicines
    ADD CONSTRAINT uq_clinic_medicines_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.communication_templates
    ADD CONSTRAINT uq_communication_templates_tenant_name UNIQUE (tenant_id, name);
ALTER TABLE ONLY public.dashboard_summary_snapshots
    ADD CONSTRAINT uq_dashboard_summary_scope UNIQUE (tenant_id, module, summary_id, role);
ALTER TABLE ONLY public.data_retention_schedules
    ADD CONSTRAINT uq_data_retention_schedules_tenant_scope UNIQUE (tenant_id, data_category, module_code);
ALTER TABLE ONLY public.discipline_document_templates
    ADD CONSTRAINT uq_discipline_document_templates_type UNIQUE (tenant_id, school_id, document_type);
ALTER TABLE ONLY public.discipline_generated_documents
    ADD CONSTRAINT uq_discipline_generated_documents_number UNIQUE (tenant_id, document_number);
ALTER TABLE ONLY public.event_consumer_runs
    ADD CONSTRAINT uq_event_consumer_runs_tenant_consumer_event_key UNIQUE (tenant_id, consumer_name, event_key);
ALTER TABLE ONLY public.event_consumer_runs
    ADD CONSTRAINT uq_event_consumer_runs_tenant_outbox_consumer UNIQUE (tenant_id, outbox_event_id, consumer_name);
ALTER TABLE ONLY public.exam_competency_outcomes
    ADD CONSTRAINT uq_exam_competency_outcomes_code UNIQUE (tenant_id, grading_policy_id, code);
ALTER TABLE ONLY public.exam_competency_outcomes
    ADD CONSTRAINT uq_exam_competency_outcomes_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.exam_grading_policy_boundaries
    ADD CONSTRAINT uq_exam_grading_policy_boundaries_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.exam_mark_import_batch_items
    ADD CONSTRAINT uq_exam_mark_import_batch_items_scope UNIQUE (tenant_id, batch_id, mark_id);
ALTER TABLE ONLY public.exam_mark_import_batch_items
    ADD CONSTRAINT uq_exam_mark_import_batch_items_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.exam_mark_import_batches
    ADD CONSTRAINT uq_exam_mark_import_batches_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.exam_report_card_signatures
    ADD CONSTRAINT uq_exam_report_card_signatures_owner UNIQUE (tenant_id, signer_user_id, signer_role);
ALTER TABLE ONLY public.exam_result_snapshots
    ADD CONSTRAINT uq_exam_result_snapshots_batch_student UNIQUE (tenant_id, batch_id, student_id);
ALTER TABLE ONLY public.exam_result_snapshots
    ADD CONSTRAINT uq_exam_result_snapshots_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.file_objects
    ADD CONSTRAINT uq_file_objects_tenant_path UNIQUE (tenant_id, storage_path);
ALTER TABLE ONLY public.finance_close_periods
    ADD CONSTRAINT uq_finance_close_periods_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.finance_close_periods
    ADD CONSTRAINT uq_finance_close_periods_tenant_name UNIQUE (tenant_id, period_name);
ALTER TABLE ONLY public.guardian_profiles
    ADD CONSTRAINT uq_guardian_profiles_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.guardian_profiles
    ADD CONSTRAINT uq_guardian_profiles_tenant_phone UNIQUE (tenant_id, normalized_phone);
ALTER TABLE ONLY public.hostels
    ADD CONSTRAINT uq_hostels_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.idempotency_keys
    ADD CONSTRAINT uq_idempotency_keys_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT uq_invoices_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.lab_breakage_loss_records
    ADD CONSTRAINT uq_lab_breakage_loss_records_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.lab_issue_lines
    ADD CONSTRAINT uq_lab_issue_lines_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.lab_issue_records
    ADD CONSTRAINT uq_lab_issue_records_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.lab_issue_returns
    ADD CONSTRAINT uq_lab_issue_returns_submission UNIQUE (tenant_id, submission_id);
ALTER TABLE ONLY public.lab_issue_returns
    ADD CONSTRAINT uq_lab_issue_returns_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.lab_practical_request_items
    ADD CONSTRAINT uq_lab_practical_request_items_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.lab_practical_requests
    ADD CONSTRAINT uq_lab_practical_requests_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.lab_safety_checks
    ADD CONSTRAINT uq_lab_safety_checks_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.lab_stock_movements
    ADD CONSTRAINT uq_lab_stock_movements_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.lab_stocktake_lines
    ADD CONSTRAINT uq_lab_stocktake_lines_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.lab_stocktakes
    ADD CONSTRAINT uq_lab_stocktakes_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.lab_storage_locations
    ADD CONSTRAINT uq_lab_storage_locations_path UNIQUE (tenant_id, full_path);
ALTER TABLE ONLY public.lab_storage_locations
    ADD CONSTRAINT uq_lab_storage_locations_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.library_copies
    ADD CONSTRAINT uq_library_copies_tenant_accession UNIQUE (tenant_id, accession_number);
ALTER TABLE ONLY public.lms_courses
    ADD CONSTRAINT uq_lms_courses_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.manual_fee_payment_allocations
    ADD CONSTRAINT uq_manual_fee_payment_allocations_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.manual_fee_payments
    ADD CONSTRAINT uq_manual_fee_payments_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.outbox_events
    ADD CONSTRAINT uq_outbox_events_tenant_event_key UNIQUE (tenant_id, event_key);
ALTER TABLE ONLY public.outbox_events
    ADD CONSTRAINT uq_outbox_events_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.parent_meetings
    ADD CONSTRAINT uq_parent_meetings_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.payment_intents
    ADD CONSTRAINT uq_payment_intents_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.report_card_comments
    ADD CONSTRAINT uq_report_card_comments_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.report_snapshots
    ADD CONSTRAINT uq_report_snapshots_tenant_snapshot UNIQUE (tenant_id, snapshot_id);
ALTER TABLE ONLY public.staff_attendance
    ADD CONSTRAINT uq_staff_attendance_tenant_staff_date UNIQUE (tenant_id, staff_profile_id, date);
ALTER TABLE ONLY public.staff_leave_balances
    ADD CONSTRAINT uq_staff_leave_balances_tenant_staff_type UNIQUE (tenant_id, staff_profile_id, leave_type);
ALTER TABLE ONLY public.staff_payslips
    ADD CONSTRAINT uq_staff_payslips_tenant_staff_month_year UNIQUE (tenant_id, staff_profile_id, month, year);
ALTER TABLE ONLY public.staff_profiles
    ADD CONSTRAINT uq_staff_profiles_tenant_number UNIQUE (tenant_id, staff_number);
ALTER TABLE ONLY public.staff_salaries
    ADD CONSTRAINT uq_staff_salaries_tenant_staff UNIQUE (tenant_id, staff_profile_id);
ALTER TABLE ONLY public.student_academic_enrollments
    ADD CONSTRAINT uq_student_academic_enrollments_student_year UNIQUE (tenant_id, student_id, academic_year);
ALTER TABLE ONLY public.student_academic_enrollments
    ADD CONSTRAINT uq_student_academic_enrollments_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.student_academic_lifecycle_events
    ADD CONSTRAINT uq_student_academic_lifecycle_events_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.student_allocations
    ADD CONSTRAINT uq_student_allocations_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.student_class_assignments
    ADD CONSTRAINT uq_student_class_assignments_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.student_fee_assignments
    ADD CONSTRAINT uq_student_fee_assignments_student_structure UNIQUE (tenant_id, student_id, fee_structure_id);
ALTER TABLE ONLY public.student_fee_assignments
    ADD CONSTRAINT uq_student_fee_assignments_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.student_fee_invoices
    ADD CONSTRAINT uq_student_fee_invoices_assignment UNIQUE (tenant_id, assignment_id);
ALTER TABLE ONLY public.student_fee_invoices
    ADD CONSTRAINT uq_student_fee_invoices_number UNIQUE (tenant_id, invoice_number);
ALTER TABLE ONLY public.student_fee_invoices
    ADD CONSTRAINT uq_student_fee_invoices_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.student_fee_structures
    ADD CONSTRAINT uq_student_fee_structures_class_term UNIQUE (tenant_id, class_name, academic_year, term_name);
ALTER TABLE ONLY public.student_fee_structures
    ADD CONSTRAINT uq_student_fee_structures_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.student_notes
    ADD CONSTRAINT uq_student_notes_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.student_portal_access
    ADD CONSTRAINT uq_student_portal_access_tenant_student UNIQUE (tenant_id, student_id);
ALTER TABLE ONLY public.student_portal_access
    ADD CONSTRAINT uq_student_portal_access_tenant_user UNIQUE (tenant_id, user_id);
ALTER TABLE ONLY public.student_report_cards
    ADD CONSTRAINT uq_student_report_cards_revision UNIQUE (tenant_id, exam_series_id, student_id, revision_number);
ALTER TABLE ONLY public.student_subject_enrollments
    ADD CONSTRAINT uq_student_subject_enrollments_student_offering UNIQUE (tenant_id, student_id, subject_offering_id);
ALTER TABLE ONLY public.student_subject_enrollments
    ADD CONSTRAINT uq_student_subject_enrollments_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.student_timetable_enrollments
    ADD CONSTRAINT uq_student_timetable_enrollments_student_slot UNIQUE (tenant_id, student_id, timetable_slot_id);
ALTER TABLE ONLY public.student_timetable_enrollments
    ADD CONSTRAINT uq_student_timetable_enrollments_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.student_transfer_records
    ADD CONSTRAINT uq_student_transfers_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.students
    ADD CONSTRAINT uq_students_school_id_id UNIQUE (school_id, id);
ALTER TABLE ONLY public.students
    ADD CONSTRAINT uq_students_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT uq_subjects_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT uq_subscriptions_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.support_agents
    ADD CONSTRAINT uq_support_agents_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.support_agents
    ADD CONSTRAINT uq_support_agents_user UNIQUE (tenant_id, user_id);
ALTER TABLE ONLY public.support_categories
    ADD CONSTRAINT uq_support_categories_tenant_code UNIQUE (tenant_id, code);
ALTER TABLE ONLY public.support_categories
    ADD CONSTRAINT uq_support_categories_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.support_incidents
    ADD CONSTRAINT uq_support_incidents_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.support_kb_articles
    ADD CONSTRAINT uq_support_kb_articles_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.support_kb_articles
    ADD CONSTRAINT uq_support_kb_articles_tenant_slug UNIQUE (tenant_id, slug);
ALTER TABLE ONLY public.support_system_components
    ADD CONSTRAINT uq_support_system_components_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.support_system_components
    ADD CONSTRAINT uq_support_system_components_tenant_slug UNIQUE (tenant_id, slug);
ALTER TABLE ONLY public.sync_cursors
    ADD CONSTRAINT uq_sync_cursors_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.sync_devices
    ADD CONSTRAINT uq_sync_devices_tenant_device UNIQUE (tenant_id, device_id);
ALTER TABLE ONLY public.sync_devices
    ADD CONSTRAINT uq_sync_devices_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.sync_operation_logs
    ADD CONSTRAINT uq_sync_operation_logs_tenant_version UNIQUE (tenant_id, version);
ALTER TABLE ONLY public.teacher_subject_assignments
    ADD CONSTRAINT uq_teacher_subject_assignments_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.tenant_mpesa_configs
    ADD CONSTRAINT uq_tenant_mpesa_configs_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.tenant_payment_channels
    ADD CONSTRAINT uq_tenant_payment_channels_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.timetable_teacher_availability
    ADD CONSTRAINT uq_timetable_availability_scope UNIQUE (tenant_id, academic_year, term_name, teacher_id, day_of_week, period_id);
ALTER TABLE ONLY public.timetable_teacher_availability
    ADD CONSTRAINT uq_timetable_availability_tenant_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.timetable_common_blocks
    ADD CONSTRAINT uq_timetable_common_block_tenant_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.timetable_configurations
    ADD CONSTRAINT uq_timetable_configuration_scope UNIQUE (tenant_id, academic_year, term_name);
ALTER TABLE ONLY public.timetable_configurations
    ADD CONSTRAINT uq_timetable_configuration_tenant_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.timetable_days
    ADD CONSTRAINT uq_timetable_days_scope UNIQUE (tenant_id, configuration_id, day_of_week);
ALTER TABLE ONLY public.timetable_days
    ADD CONSTRAINT uq_timetable_days_tenant_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.timetable_generation_runs
    ADD CONSTRAINT uq_timetable_generation_run_tenant_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.timetable_period_definitions
    ADD CONSTRAINT uq_timetable_period_scope UNIQUE (tenant_id, configuration_id, day_of_week, order_index);
ALTER TABLE ONLY public.timetable_period_definitions
    ADD CONSTRAINT uq_timetable_period_tenant_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.timetable_relief_assignments
    ADD CONSTRAINT uq_timetable_relief_tenant_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.timetable_subject_requirements
    ADD CONSTRAINT uq_timetable_requirement_tenant_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.timetable_resources
    ADD CONSTRAINT uq_timetable_resource_name UNIQUE (tenant_id, name);
ALTER TABLE ONLY public.timetable_resources
    ADD CONSTRAINT uq_timetable_resource_tenant_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.timetable_unscheduled_requirements
    ADD CONSTRAINT uq_timetable_unscheduled_scope UNIQUE (tenant_id, version_id, requirement_id);
ALTER TABLE ONLY public.timetable_unscheduled_requirements
    ADD CONSTRAINT uq_timetable_unscheduled_tenant_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT uq_transactions_tenant_id_id UNIQUE (tenant_id, id);
ALTER TABLE ONLY public.usage_records
    ADD CONSTRAINT usage_records_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_permission_overrides
    ADD CONSTRAINT user_permission_overrides_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.v2_counselling_sessions
    ADD CONSTRAINT v2_counselling_sessions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.v2_discipline_actions
    ADD CONSTRAINT v2_discipline_actions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.vehicle_fuel_logs
    ADD CONSTRAINT vehicle_fuel_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.vehicle_service_logs
    ADD CONSTRAINT vehicle_service_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.visitor_logs
    ADD CONSTRAINT visitor_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.visitors_appointments
    ADD CONSTRAINT visitors_appointments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.visitors_logs
    ADD CONSTRAINT visitors_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.visitors
    ADD CONSTRAINT visitors_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.visitors_registry
    ADD CONSTRAINT visitors_registry_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.welfare_concerns
    ADD CONSTRAINT welfare_concerns_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.workflow_events
    ADD CONSTRAINT workflow_events_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.workflow_tasks
    ADD CONSTRAINT workflow_tasks_pkey PRIMARY KEY (id);
CREATE UNIQUE INDEX academic_levels_school_id_id_key ON public.academic_levels USING btree (school_id, id);
CREATE INDEX academic_levels_school_id_order_index_idx ON public.academic_levels USING btree (school_id, order_index);
CREATE UNIQUE INDEX academic_levels_school_id_order_index_key ON public.academic_levels USING btree (school_id, order_index);
CREATE INDEX academic_years_school_id_idx ON public.academic_years USING btree (school_id);
CREATE UNIQUE INDEX academic_years_school_id_name_key ON public.academic_years USING btree (school_id, name);
CREATE INDEX academic_years_school_id_status_idx ON public.academic_years USING btree (school_id, status);
CREATE INDEX academics_assignments_school_id_idx ON public.academics_assignments USING btree (school_id);
CREATE UNIQUE INDEX academics_attendance_settings_school_id_name_key ON public.academics_attendance_settings USING btree (school_id, name);
CREATE INDEX academics_attendance_tenant_id_idx ON public.academics_attendance USING btree (tenant_id);
CREATE INDEX academics_class_teachers_school_id_idx ON public.academics_class_teachers USING btree (school_id);
CREATE UNIQUE INDEX academics_grading_systems_school_id_name_key ON public.academics_grading_systems USING btree (school_id, name);
CREATE INDEX academics_lesson_logs_school_id_idx ON public.academics_lesson_logs USING btree (school_id);
CREATE INDEX academics_report_card_settings_school_id_idx ON public.academics_report_card_settings USING btree (school_id);
CREATE INDEX academics_resources_school_id_idx ON public.academics_resources USING btree (school_id);
CREATE UNIQUE INDEX accounts_tenant_id_code_key ON public.accounts USING btree (tenant_id, code);
CREATE INDEX accounts_tenant_id_idx ON public.accounts USING btree (tenant_id);
CREATE INDEX admin_incidents_tenant_id_idx ON public.admin_incidents USING btree (tenant_id);
CREATE INDEX admission_applications_school_id_idx ON public.admission_applications USING btree (school_id);
CREATE INDEX admission_documents_school_id_idx ON public.admission_documents USING btree (school_id);
CREATE INDEX admission_interviews_school_id_idx ON public.admission_interviews USING btree (school_id);
CREATE INDEX admissions_applications_school_id_idx ON public.admissions_applications USING btree (school_id);
CREATE INDEX admissions_applications_tenant_id_idx ON public.admissions_applications USING btree (tenant_id);
CREATE INDEX announcements_tenant_id_idx ON public.announcements USING btree (tenant_id);
CREATE INDEX appointments_school_id_idx ON public.appointments USING btree (school_id);
CREATE INDEX approval_audit_logs_request_id_idx ON public.approval_audit_logs USING btree (request_id);
CREATE INDEX approval_audit_logs_school_id_idx ON public.approval_audit_logs USING btree (school_id);
CREATE INDEX approval_requests_school_id_idx ON public.approval_requests USING btree (school_id);
CREATE INDEX approval_rules_school_id_idx ON public.approval_rules USING btree (school_id);
CREATE INDEX asset_movements_school_id_idx ON public.asset_movements USING btree (school_id);
CREATE UNIQUE INDEX assets_school_id_asset_tag_key ON public.assets USING btree (school_id, asset_tag);
CREATE INDEX assets_school_id_idx ON public.assets USING btree (school_id);
CREATE UNIQUE INDEX assets_school_id_serial_number_key ON public.assets USING btree (school_id, serial_number);
CREATE UNIQUE INDEX attendance_records_school_id_attendance_session_id_student__key ON public.attendance_records USING btree (school_id, attendance_session_id, student_id);
CREATE INDEX attendance_records_school_id_idx ON public.attendance_records USING btree (school_id);
CREATE INDEX attendance_records_school_id_student_id_idx ON public.attendance_records USING btree (school_id, student_id);
CREATE INDEX attendance_rules_tenant_id_idx ON public.attendance_rules USING btree (tenant_id);
CREATE UNIQUE INDEX attendance_sessions_school_id_class_id_stream_id_date_sessi_key ON public.attendance_sessions USING btree (school_id, class_id, stream_id, date, session_type);
CREATE INDEX attendance_sessions_school_id_idx ON public.attendance_sessions USING btree (school_id);
CREATE INDEX audit_logs_school_id_actor_user_id_idx ON public.audit_logs USING btree (school_id, actor_user_id);
CREATE INDEX audit_logs_school_id_created_at_idx ON public.audit_logs USING btree (school_id, created_at);
CREATE INDEX audit_logs_school_id_entity_type_entity_id_idx ON public.audit_logs USING btree (school_id, entity_type, entity_id);
CREATE INDEX audit_logs_school_id_idx ON public.audit_logs USING btree (school_id);
CREATE INDEX auth_action_tokens_tenant_id_idx ON public.auth_action_tokens USING btree (tenant_id);
CREATE INDEX auth_email_outbox_tenant_id_idx ON public.auth_email_outbox USING btree (tenant_id);
CREATE INDEX beds_school_id_idx ON public.beds USING btree (school_id);
CREATE INDEX behavior_improvement_plan_steps_school_id_idx ON public.behavior_improvement_plan_steps USING btree (school_id);
CREATE INDEX behavior_improvement_plan_steps_tenant_id_idx ON public.behavior_improvement_plan_steps USING btree (tenant_id);
CREATE INDEX behavior_improvement_plans_school_id_idx ON public.behavior_improvement_plans USING btree (school_id);
CREATE INDEX behavior_improvement_plans_tenant_id_idx ON public.behavior_improvement_plans USING btree (tenant_id);
CREATE INDEX billing_notifications_tenant_id_idx ON public.billing_notifications USING btree (tenant_id);
CREATE INDEX biometric_devices_tenant_id_idx ON public.biometric_devices USING btree (tenant_id);
CREATE INDEX biometric_events_tenant_id_idx ON public.biometric_events USING btree (tenant_id);
CREATE INDEX biometric_identities_tenant_id_idx ON public.biometric_identities USING btree (tenant_id);
CREATE INDEX boarding_allocations_school_id_idx ON public.boarding_allocations USING btree (school_id);
CREATE INDEX boarding_attendance_school_id_idx ON public.boarding_attendance USING btree (school_id);
CREATE INDEX boarding_houses_school_id_idx ON public.boarding_houses USING btree (school_id);
CREATE INDEX boarding_referrals_school_id_idx ON public.boarding_referrals USING btree (school_id);
CREATE INDEX boarding_referrals_tenant_id_idx ON public.boarding_referrals USING btree (tenant_id);
CREATE INDEX callback_logs_tenant_id_idx ON public.callback_logs USING btree (tenant_id);
CREATE INDEX cbc_assessment_entries_school_id_exam_cycle_id_idx ON public.cbc_assessment_entries USING btree (school_id, exam_cycle_id);
CREATE INDEX cbc_assessment_entries_school_id_idx ON public.cbc_assessment_entries USING btree (school_id);
CREATE INDEX cbc_assessment_entries_school_id_student_id_idx ON public.cbc_assessment_entries USING btree (school_id, student_id);
CREATE INDEX chemical_disposal_requests_tenant_id_idx ON public.chemical_disposal_requests USING btree (tenant_id);
CREATE INDEX chemical_items_tenant_id_idx ON public.chemical_items USING btree (tenant_id);
CREATE UNIQUE INDEX class_requests_school_id_id_key ON public.class_requests USING btree (school_id, id);
CREATE INDEX class_requests_school_id_idx ON public.class_requests USING btree (school_id);
CREATE UNIQUE INDEX class_subjects_school_id_class_id_subject_id_key ON public.class_subjects USING btree (school_id, class_id, subject_id);
CREATE INDEX class_subjects_school_id_idx ON public.class_subjects USING btree (school_id);
CREATE INDEX class_timetable_entries_school_id_idx ON public.class_timetable_entries USING btree (school_id);
CREATE INDEX classes_school_id_idx ON public.classes USING btree (school_id);
CREATE UNIQUE INDEX classes_school_id_name_key ON public.classes USING btree (school_id, name);
CREATE INDEX clinic_alerts_tenant_id_idx ON public.clinic_alerts USING btree (tenant_id);
CREATE INDEX clinic_audit_logs_tenant_id_idx ON public.clinic_audit_logs USING btree (tenant_id);
CREATE INDEX clinic_medicine_batches_tenant_id_idx ON public.clinic_medicine_batches USING btree (tenant_id);
CREATE INDEX clinic_medicine_dispenses_tenant_id_idx ON public.clinic_medicine_dispenses USING btree (tenant_id);
CREATE INDEX clinic_medicines_tenant_id_idx ON public.clinic_medicines USING btree (tenant_id);
CREATE INDEX clinic_procurement_recommendations_tenant_id_idx ON public.clinic_procurement_recommendations USING btree (tenant_id);
CREATE INDEX clinic_stock_movements_tenant_id_idx ON public.clinic_stock_movements USING btree (tenant_id);
CREATE INDEX clinic_visits_tenant_id_idx ON public.clinic_visits USING btree (tenant_id);
CREATE INDEX communication_broadcasts_school_id_idx ON public.communication_broadcasts USING btree (school_id);
CREATE INDEX communication_broadcasts_user_id_idx ON public.communication_broadcasts USING btree (user_id);
CREATE INDEX communication_sms_outbox_tenant_id_idx ON public.communication_sms_outbox USING btree (tenant_id);
CREATE INDEX computer_lab_pcs_school_id_idx ON public.computer_lab_pcs USING btree (school_id);
CREATE INDEX computer_lab_sessions_school_id_idx ON public.computer_lab_sessions USING btree (school_id);
CREATE INDEX computer_lab_usage_logs_school_id_idx ON public.computer_lab_usage_logs USING btree (school_id);
CREATE INDEX consent_records_tenant_id_idx ON public.consent_records USING btree (tenant_id);
CREATE INDEX counselling_cases_school_id_idx ON public.counselling_cases USING btree (school_id);
CREATE INDEX counselling_escalations_school_id_idx ON public.counselling_escalations USING btree (school_id);
CREATE INDEX counselling_notes_school_id_idx ON public.counselling_notes USING btree (school_id);
CREATE INDEX counselling_notes_tenant_id_idx ON public.counselling_notes USING btree (tenant_id);
CREATE INDEX counselling_referrals_school_id_idx ON public.counselling_referrals USING btree (school_id);
CREATE INDEX counselling_referrals_tenant_id_idx ON public.counselling_referrals USING btree (tenant_id);
CREATE INDEX counselling_sessions_school_id_idx ON public.counselling_sessions USING btree (school_id);
CREATE INDEX counselling_sessions_tenant_id_idx ON public.counselling_sessions USING btree (tenant_id);
CREATE INDEX dashboard_tasks_tenant_id_idx ON public.dashboard_tasks USING btree (tenant_id);
CREATE INDEX data_subject_requests_tenant_id_idx ON public.data_subject_requests USING btree (tenant_id);
CREATE INDEX departments_school_id_idx ON public.departments USING btree (school_id);
CREATE INDEX discipline_attachments_school_id_idx ON public.discipline_attachments USING btree (school_id);
CREATE INDEX discipline_attachments_tenant_id_idx ON public.discipline_attachments USING btree (tenant_id);
CREATE INDEX discipline_cases_school_id_idx ON public.discipline_cases USING btree (school_id);
CREATE INDEX discipline_comments_school_id_idx ON public.discipline_comments USING btree (school_id);
CREATE INDEX discipline_comments_tenant_id_idx ON public.discipline_comments USING btree (tenant_id);
CREATE INDEX documents_generated_school_id_idx ON public.documents_generated USING btree (school_id);
CREATE INDEX dormitories_school_id_idx ON public.dormitories USING btree (school_id);
CREATE INDEX exam_assessment_components_tenant_id_idx ON public.exam_assessment_components USING btree (tenant_id);
CREATE INDEX exam_assessments_tenant_id_idx ON public.exam_assessments USING btree (tenant_id);
CREATE INDEX exam_attendance_records_tenant_id_idx ON public.exam_attendance_records USING btree (tenant_id);
CREATE INDEX exam_cycles_school_id_academic_year_id_idx ON public.exam_cycles USING btree (school_id, academic_year_id);
CREATE INDEX exam_cycles_school_id_idx ON public.exam_cycles USING btree (school_id);
CREATE INDEX exam_grade_boundaries_tenant_id_idx ON public.exam_grade_boundaries USING btree (tenant_id);
CREATE INDEX exam_grading_policies_tenant_id_idx ON public.exam_grading_policies USING btree (tenant_id);
CREATE INDEX exam_invigilators_tenant_id_idx ON public.exam_invigilators USING btree (tenant_id);
CREATE INDEX exam_mark_audit_logs_tenant_id_idx ON public.exam_mark_audit_logs USING btree (tenant_id);
CREATE INDEX exam_mark_entry_windows_tenant_id_idx ON public.exam_mark_entry_windows USING btree (tenant_id);
CREATE INDEX exam_mark_versions_tenant_id_idx ON public.exam_mark_versions USING btree (tenant_id);
CREATE INDEX exam_marks_tenant_id_idx ON public.exam_marks USING btree (tenant_id);
CREATE INDEX exam_readiness_checks_school_id_idx ON public.exam_readiness_checks USING btree (school_id);
CREATE INDEX exam_series_tenant_id_idx ON public.exam_series USING btree (tenant_id);
CREATE INDEX exam_student_cases_tenant_id_idx ON public.exam_student_cases USING btree (tenant_id);
CREATE INDEX exam_subject_weightings_tenant_id_idx ON public.exam_subject_weightings USING btree (tenant_id);
CREATE INDEX exam_subjects_school_id_idx ON public.exam_subjects USING btree (school_id);
CREATE INDEX exam_timetable_slots_tenant_id_idx ON public.exam_timetable_slots USING btree (tenant_id);
CREATE INDEX fee_items_school_id_idx ON public.fee_items USING btree (school_id);
CREATE INDEX fee_structures_school_id_idx ON public.fee_structures USING btree (school_id);
CREATE INDEX fee_waivers_school_id_idx ON public.fee_waivers USING btree (school_id);
CREATE INDEX file_uploads_school_id_idx ON public.file_uploads USING btree (school_id);
CREATE INDEX finance_approval_requests_tenant_id_idx ON public.finance_approval_requests USING btree (tenant_id);
CREATE INDEX finance_fee_categories_tenant_id_idx ON public.finance_fee_categories USING btree (tenant_id);
CREATE INDEX finance_tasks_tenant_id_idx ON public.finance_tasks USING btree (tenant_id);
CREATE INDEX front_office_tickets_school_id_idx ON public.front_office_tickets USING btree (school_id);
CREATE INDEX gate_incidents_school_id_idx ON public.gate_incidents USING btree (school_id);
CREATE INDEX grading_scale_ranges_school_id_idx ON public.grading_scale_ranges USING btree (school_id);
CREATE INDEX grading_scales_school_id_idx ON public.grading_scales USING btree (school_id);
CREATE INDEX group_guidance_sessions_school_id_idx ON public.group_guidance_sessions USING btree (school_id);
CREATE INDEX hod_assignments_school_id_department_id_idx ON public.hod_assignments USING btree (school_id, department_id);
CREATE INDEX hod_assignments_school_id_idx ON public.hod_assignments USING btree (school_id);
CREATE INDEX hod_assignments_school_id_teacher_user_id_idx ON public.hod_assignments USING btree (school_id, teacher_user_id);
CREATE INDEX hod_reviews_school_id_idx ON public.hod_reviews USING btree (school_id);
CREATE INDEX idempotency_keys_tenant_id_idx ON public.idempotency_keys USING btree (tenant_id);
CREATE UNIQUE INDEX idempotency_keys_tenant_id_scope_idempotency_key_key ON public.idempotency_keys USING btree (tenant_id, scope, idempotency_key);
CREATE INDEX idx_platform_backups_created_at ON public.platform_backups USING btree (created_at);
CREATE INDEX idx_platform_broadcasts_created_at ON public.platform_broadcasts USING btree (created_at);
CREATE INDEX idx_platform_payment_gateways_created_at ON public.platform_payment_gateways USING btree (created_at DESC);
CREATE INDEX idx_platform_templates_created_at ON public.platform_templates USING btree (created_at);
CREATE INDEX idx_security_lost_found_tenant_status ON public.security_lost_found USING btree (tenant_id, status, found_at DESC);
CREATE INDEX idx_tenant_domains_active_verified ON public.tenant_domains USING btree (domain, tenant_id) WHERE ((status = 'active'::text) AND (verified_at IS NOT NULL));
CREATE INDEX idx_workflow_events_status ON public.workflow_events USING btree (tenant_id, status);
CREATE INDEX idx_workflow_events_tenant_id ON public.workflow_events USING btree (tenant_id);
CREATE INDEX import_batches_school_id_idx ON public.import_batches USING btree (school_id);
CREATE INDEX import_rows_school_id_idx ON public.import_rows USING btree (school_id);
CREATE INDEX integration_logs_tenant_id_idx ON public.integration_logs USING btree (tenant_id);
CREATE INDEX inventory_categories_school_id_idx ON public.inventory_categories USING btree (school_id);
CREATE INDEX inventory_incidents_tenant_id_idx ON public.inventory_incidents USING btree (tenant_id);
CREATE INDEX inventory_item_balances_tenant_id_idx ON public.inventory_item_balances USING btree (tenant_id);
CREATE INDEX inventory_items_school_id_idx ON public.inventory_items USING btree (school_id);
CREATE INDEX inventory_locations_tenant_id_idx ON public.inventory_locations USING btree (tenant_id);
CREATE INDEX inventory_purchase_orders_tenant_id_idx ON public.inventory_purchase_orders USING btree (tenant_id);
CREATE INDEX inventory_request_backorders_tenant_id_idx ON public.inventory_request_backorders USING btree (tenant_id);
CREATE INDEX inventory_request_items_school_id_idx ON public.inventory_request_items USING btree (school_id);
CREATE INDEX inventory_requests_school_id_idx ON public.inventory_requests USING btree (school_id);
CREATE INDEX inventory_requisitions_tenant_id_idx ON public.inventory_requisitions USING btree (tenant_id);
CREATE INDEX inventory_reservations_tenant_id_idx ON public.inventory_reservations USING btree (tenant_id);
CREATE INDEX inventory_stock_count_snapshots_tenant_id_idx ON public.inventory_stock_count_snapshots USING btree (tenant_id);
CREATE INDEX inventory_stock_movements_school_id_idx ON public.inventory_stock_movements USING btree (school_id);
CREATE INDEX inventory_suppliers_tenant_id_idx ON public.inventory_suppliers USING btree (tenant_id);
CREATE INDEX inventory_transfers_tenant_id_idx ON public.inventory_transfers USING btree (tenant_id);
CREATE INDEX invoice_items_school_id_idx ON public.invoice_items USING btree (school_id);
CREATE UNIQUE INDEX invoices_invoice_number_key ON public.invoices USING btree (invoice_number);
CREATE INDEX invoices_school_id_idx ON public.invoices USING btree (school_id);
CREATE INDEX invoices_school_id_invoice_number_idx ON public.invoices USING btree (school_id, invoice_number);
CREATE INDEX invoices_school_id_student_id_idx ON public.invoices USING btree (school_id, student_id);
CREATE INDEX iot_alerts_tenant_id_idx ON public.iot_alerts USING btree (tenant_id);
CREATE INDEX iot_audit_logs_tenant_id_idx ON public.iot_audit_logs USING btree (tenant_id);
CREATE INDEX iot_device_commands_tenant_id_idx ON public.iot_device_commands USING btree (tenant_id);
CREATE INDEX iot_device_credentials_tenant_id_idx ON public.iot_device_credentials USING btree (tenant_id);
CREATE INDEX iot_devices_tenant_id_idx ON public.iot_devices USING btree (tenant_id);
CREATE INDEX iot_gateway_ingestions_tenant_id_idx ON public.iot_gateway_ingestions USING btree (tenant_id);
CREATE INDEX iot_telemetry_readings_tenant_id_idx ON public.iot_telemetry_readings USING btree (tenant_id);
CREATE INDEX ix_academic_audit_entity_history ON public.academic_audit_logs USING btree (tenant_id, entity_type, entity_id, created_at DESC);
CREATE INDEX ix_academic_class_sections_lookup ON public.academic_class_sections USING btree (tenant_id, lower(class_name), lower(stream_name), is_active);
CREATE INDEX ix_academic_intervention_updates_history ON public.academic_intervention_updates USING btree (tenant_id, intervention_id, recorded_at DESC);
CREATE INDEX ix_academic_interventions_owner ON public.academic_interventions USING btree (tenant_id, owner_user_id, status, due_on);
CREATE INDEX ix_academic_interventions_student ON public.academic_interventions USING btree (tenant_id, student_id, status, created_at DESC);
CREATE INDEX ix_academic_levels_tenant_order ON public.academic_levels USING btree (tenant_id, order_index);
CREATE INDEX ix_academic_subject_offerings_section_active ON public.academic_subject_offerings USING btree (tenant_id, class_section_id, is_active);
CREATE INDEX ix_academic_terms_year ON public.academic_terms USING btree (tenant_id, academic_year_id, starts_on);
CREATE INDEX ix_academic_timetable_slots_section_active ON public.academic_timetable_slots USING btree (tenant_id, class_section_id, is_active);
CREATE INDEX ix_academics_assignment_submissions_assignment ON public.academics_assignment_submissions USING btree (tenant_id, assignment_id, status);
CREATE INDEX ix_academics_assignment_submissions_student ON public.academics_assignment_submissions USING btree (tenant_id, student_id, updated_at DESC);
CREATE INDEX ix_academics_department_hod_history ON public.academics_department_hod_appointments USING btree (tenant_id, department_id, effective_from DESC);
CREATE INDEX ix_academics_departments_tenant_active ON public.academics_departments USING btree (tenant_id, is_active, name);
CREATE INDEX ix_academics_role_appointments_history ON public.academics_role_appointments USING btree (tenant_id, role_type, teacher_user_id, effective_from DESC);
CREATE INDEX ix_accounts_tenant_category_active ON public.accounts USING btree (tenant_id, category, is_active);
CREATE INDEX ix_accounts_tenant_name ON public.accounts USING btree (tenant_id, name);
CREATE INDEX ix_admin_incidents_queue ON public.admin_incidents USING btree (tenant_id, status, severity, created_at DESC);
CREATE INDEX ix_admission_applications_search_vector ON public.admission_applications USING gin (to_tsvector('simple'::regconfig, ((((((((((((application_number || ' '::text) || full_name) || ' '::text) || birth_certificate_number) || ' '::text) || class_applying) || ' '::text) || parent_name) || ' '::text) || parent_phone) || ' '::text) || COALESCE(parent_email, ''::text))));
CREATE INDEX ix_admission_applications_status ON public.admission_applications USING btree (tenant_id, status, created_at DESC);
CREATE INDEX ix_admission_documents_status ON public.admission_documents USING btree (tenant_id, verification_status, created_at DESC);
CREATE INDEX ix_admission_drafts_owner_status ON public.admission_drafts USING btree (tenant_id, created_by_user_id, status, updated_at DESC);
CREATE INDEX ix_ai_anomalies_status ON public.ai_anomalies USING btree (tenant_id, status, score DESC);
CREATE INDEX ix_ai_insight_alerts_status ON public.ai_insight_alerts USING btree (tenant_id, status, severity);
CREATE INDEX ix_ai_insight_runs_priority ON public.ai_insight_runs USING btree (tenant_id, priority, created_at DESC);
CREATE INDEX ix_ai_insight_runs_status_due ON public.ai_insight_runs USING btree (tenant_id, status, due_date);
CREATE INDEX ix_announcements_status ON public.announcements USING btree (tenant_id, status, created_at DESC);
CREATE INDEX ix_asset_assignments_asset ON public.asset_assignments USING btree (tenant_id, asset_id, status);
CREATE INDEX ix_asset_assignments_due ON public.asset_assignments USING btree (tenant_id, status, due_at);
CREATE INDEX ix_asset_repairs_status ON public.asset_repairs USING btree (tenant_id, repair_status);
CREATE INDEX ix_assets_priority ON public.assets USING btree (tenant_id, priority, created_at DESC);
CREATE INDEX ix_assets_status_due ON public.assets USING btree (tenant_id, status, due_date);
CREATE INDEX ix_attendance_records_student_date ON public.attendance_records USING btree (tenant_id, student_id, attendance_date DESC);
CREATE INDEX ix_attendance_records_sync_version ON public.attendance_records USING btree (tenant_id, sync_version) WHERE (sync_version IS NOT NULL);
CREATE INDEX ix_audit_logs_request_id ON public.audit_logs USING btree (request_id) WHERE (request_id IS NOT NULL);
CREATE INDEX ix_audit_logs_tenant_actor_occurred_at ON public.audit_logs USING btree (tenant_id, actor_user_id, occurred_at DESC);
CREATE INDEX ix_audit_logs_tenant_occurred_at ON public.audit_logs USING btree (tenant_id, occurred_at DESC);
CREATE INDEX ix_audit_logs_tenant_resource_occurred_at ON public.audit_logs USING btree (tenant_id, resource_type, resource_id, occurred_at DESC);
CREATE INDEX ix_auth_action_tokens_tenant_email ON public.auth_action_tokens USING btree (tenant_id, lower(email), purpose);
CREATE INDEX ix_auth_action_tokens_tenant_invites ON public.auth_action_tokens USING btree (tenant_id, purpose, consumed_at, expires_at, created_at DESC) WHERE (purpose = 'invite_acceptance'::text);
CREATE INDEX ix_auth_email_outbox_status ON public.auth_email_outbox USING btree (status, next_attempt_at);
CREATE INDEX ix_auth_mfa_challenges_user_active ON public.auth_mfa_challenges USING btree (user_id, expires_at) WHERE (consumed_at IS NULL);
CREATE INDEX ix_auth_trusted_devices_user_active ON public.auth_trusted_devices USING btree (user_id, expires_at) WHERE (revoked_at IS NULL);
CREATE INDEX ix_behavior_points_student_term ON public.behavior_points USING btree (tenant_id, student_id, academic_year_id, academic_term_id, awarded_at DESC);
CREATE INDEX ix_billing_notifications_status_channel ON public.billing_notifications USING btree (tenant_id, status, channel, scheduled_for DESC);
CREATE INDEX ix_billing_notifications_subscription_scheduled_for ON public.billing_notifications USING btree (tenant_id, subscription_id, scheduled_for DESC);
CREATE INDEX ix_biometric_events_processing ON public.biometric_events USING btree (tenant_id, processing_status, occurred_at);
CREATE INDEX ix_boarding_exeats_guardian ON public.boarding_exeats USING btree (tenant_id, guardian_id, created_at DESC);
CREATE INDEX ix_boarding_exeats_status ON public.boarding_exeats USING btree (tenant_id, status, from_date DESC, created_at DESC);
CREATE INDEX ix_boarding_houses_priority ON public.boarding_houses USING btree (tenant_id, priority, created_at DESC);
CREATE INDEX ix_boarding_houses_status_due ON public.boarding_houses USING btree (tenant_id, status, due_date);
CREATE INDEX ix_boarding_meals_date ON public.boarding_meals USING btree (tenant_id, meal_date, meal_type);
CREATE INDEX ix_boarding_referrals_tenant_status ON public.boarding_referrals USING btree (tenant_id, status, created_at DESC);
CREATE INDEX ix_boarding_reports_tenant_status ON public.boarding_reports USING btree (tenant_id, status, created_at DESC);
CREATE INDEX ix_boarding_students_house ON public.boarding_students USING btree (tenant_id, house_id, status);
CREATE INDEX ix_breach_response_reports_status ON public.breach_response_reports USING btree (tenant_id, status, detected_at DESC);
CREATE INDEX ix_callback_logs_checkout_request_id ON public.callback_logs USING btree (tenant_id, checkout_request_id, created_at DESC);
CREATE INDEX ix_callback_logs_payload_sha256 ON public.callback_logs USING btree (tenant_id, payload_sha256) WHERE (payload_sha256 IS NOT NULL);
CREATE INDEX ix_callback_logs_processing_status ON public.callback_logs USING btree (tenant_id, processing_status, created_at DESC);
CREATE INDEX ix_callback_logs_request_fingerprint ON public.callback_logs USING btree (tenant_id, request_fingerprint, created_at DESC);
CREATE INDEX ix_cbt_attempts_session_student ON public.cbt_attempts USING btree (tenant_id, session_id, student_id);
CREATE INDEX ix_cbt_exam_sessions_priority ON public.cbt_exam_sessions USING btree (tenant_id, priority, created_at DESC);
CREATE INDEX ix_cbt_exam_sessions_status_due ON public.cbt_exam_sessions USING btree (tenant_id, status, due_date);
CREATE INDEX ix_cbt_invigilation_events_session ON public.cbt_invigilation_events USING btree (tenant_id, session_id, severity);
CREATE INDEX ix_chemical_items_expiry ON public.chemical_items USING btree (tenant_id, status, expiry_date);
CREATE INDEX ix_child_data_dpia_records_review ON public.child_data_dpia_records USING btree (tenant_id, review_due_at);
CREATE INDEX ix_class_sections_year ON public.class_sections USING btree (tenant_id, academic_year_id, grade_level, name);
CREATE INDEX ix_class_streams_class ON public.class_streams USING btree (tenant_id, class_section_id, name);
CREATE INDEX ix_clinic_dispenses_visit ON public.clinic_medicine_dispenses USING btree (tenant_id, visit_id, dispensed_at DESC);
CREATE INDEX ix_clinic_medicine_batches_expiry ON public.clinic_medicine_batches USING btree (tenant_id, status, expiry_date);
CREATE INDEX ix_clinic_medicine_batches_stock ON public.clinic_medicine_batches USING btree (tenant_id, medicine_id, quantity_available);
CREATE INDEX ix_clinic_medicines_tenant_active_category_name ON public.clinic_medicines USING btree (tenant_id, is_active, category, medicine_name);
CREATE INDEX ix_clinic_procurement_recommendations_open ON public.clinic_procurement_recommendations USING btree (tenant_id, recommendation_status, created_at DESC);
CREATE INDEX ix_clinic_stock_movements_batch ON public.clinic_stock_movements USING btree (tenant_id, batch_id, occurred_at DESC);
CREATE INDEX ix_clinic_visits_student_date ON public.clinic_visits USING btree (tenant_id, student_id, visit_date DESC);
CREATE INDEX ix_commendations_student_term ON public.commendations USING btree (tenant_id, student_id, academic_year_id, academic_term_id, awarded_at DESC);
CREATE INDEX ix_communication_sms_outbox_dispatch ON public.communication_sms_outbox USING btree (lower(status), available_at, lease_expires_at, created_at);
CREATE INDEX ix_consent_records_tenant_type_captured_at ON public.consent_records USING btree (tenant_id, consent_type, captured_at DESC);
CREATE INDEX ix_consent_records_tenant_user_captured_at ON public.consent_records USING btree (tenant_id, user_id, captured_at DESC);
CREATE INDEX ix_counselling_referrals_status ON public.counselling_referrals USING btree (tenant_id, status, created_at DESC);
CREATE INDEX ix_counselling_sessions_counsellor_schedule ON public.counselling_sessions USING btree (tenant_id, counsellor_user_id, scheduled_for, status);
CREATE INDEX ix_dashboard_approvals_tenant_role_status_created ON public.dashboard_approval_requests USING btree (tenant_id, approver_role, status, created_at DESC);
CREATE INDEX ix_dashboard_approvals_tenant_user_status_created ON public.dashboard_approval_requests USING btree (tenant_id, approver_user_id, status, created_at DESC);
CREATE INDEX ix_dashboard_summary_tenant_module_role ON public.dashboard_summary_snapshots USING btree (tenant_id, module, role, updated_at DESC);
CREATE INDEX ix_dashboard_summary_tenant_stale_after ON public.dashboard_summary_snapshots USING btree (tenant_id, stale_after) WHERE (stale_after IS NOT NULL);
CREATE INDEX ix_data_retention_schedules_module ON public.data_retention_schedules USING btree (tenant_id, module_code, status);
CREATE INDEX ix_data_subject_requests_status ON public.data_subject_requests USING btree (tenant_id, status, due_at);
CREATE INDEX ix_discipline_actions_incident_due ON public.discipline_actions USING btree (tenant_id, incident_id, due_at, status);
CREATE INDEX ix_discipline_incidents_class_severity ON public.discipline_incidents USING btree (tenant_id, class_id, severity, occurred_at DESC) WHERE (deleted_at IS NULL);
CREATE INDEX ix_discipline_incidents_search ON public.discipline_incidents USING gin (to_tsvector('simple'::regconfig, ((((incident_number || ' '::text) || title) || ' '::text) || description)));
CREATE INDEX ix_discipline_incidents_student_term ON public.discipline_incidents USING btree (tenant_id, student_id, academic_year_id, academic_term_id, occurred_at DESC) WHERE (deleted_at IS NULL);
CREATE INDEX ix_discipline_incidents_tenant_status ON public.discipline_incidents USING btree (tenant_id, status, occurred_at DESC) WHERE (deleted_at IS NULL);
CREATE INDEX ix_duty_rosters_date ON public.duty_rosters USING btree (tenant_id, duty_date, status);
CREATE INDEX ix_event_consumer_runs_outbox_consumer ON public.event_consumer_runs USING btree (tenant_id, outbox_event_id, consumer_name);
CREATE INDEX ix_exam_grading_policies_effective ON public.exam_grading_policies USING btree (tenant_id, exam_series_id, status, effective_from DESC NULLS LAST, version DESC);
CREATE INDEX ix_exam_mark_audit_logs_mark ON public.exam_mark_audit_logs USING btree (tenant_id, mark_id, created_at DESC);
CREATE INDEX ix_exam_mark_import_batch_items_batch ON public.exam_mark_import_batch_items USING btree (tenant_id, batch_id, row_number);
CREATE INDEX ix_exam_mark_import_batches_history ON public.exam_mark_import_batches USING btree (tenant_id, imported_at DESC);
CREATE INDEX ix_exam_mark_versions_mark ON public.exam_mark_versions USING btree (tenant_id, mark_id, created_at DESC);
CREATE INDEX ix_exam_marks_student ON public.exam_marks USING btree (tenant_id, student_id, exam_series_id);
CREATE INDEX ix_exam_marks_subject_scope ON public.exam_marks USING btree (tenant_id, exam_series_id, academic_term_id, class_section_id, subject_id);
CREATE INDEX ix_exam_result_snapshots_batch_rank ON public.exam_result_snapshots USING btree (tenant_id, batch_id, class_rank, student_id);
CREATE INDEX ix_exam_settings_audit_logs_tenant ON public.exam_settings_audit_logs USING btree (tenant_id, created_at DESC);
CREATE INDEX ix_facility_issues_status ON public.facility_issues USING btree (tenant_id, status, priority);
CREATE INDEX ix_fee_structures_scope ON public.fee_structures USING btree (tenant_id, academic_year DESC, term, grade_level, class_name, status);
CREATE INDEX ix_file_objects_retention_expiry ON public.file_objects USING btree (retention_expires_at) WHERE (retention_expires_at IS NOT NULL);
CREATE INDEX ix_file_objects_sha256 ON public.file_objects USING btree (sha256);
CREATE INDEX ix_file_objects_tenant_created ON public.file_objects USING btree (tenant_id, created_at DESC);
CREATE INDEX ix_finance_approval_requests_status ON public.finance_approval_requests USING btree (tenant_id, status, created_at DESC);
CREATE INDEX ix_finance_close_periods_window ON public.finance_close_periods USING btree (tenant_id, period_started_at, period_ended_at, status);
CREATE INDEX ix_guardian_profiles_user ON public.guardian_profiles USING btree (tenant_id, user_id) WHERE (user_id IS NOT NULL);
CREATE INDEX ix_hostel_allocations_student ON public.hostel_allocations USING btree (tenant_id, student_id, status);
CREATE INDEX ix_hostel_meal_consumption_date ON public.hostel_meal_consumption USING btree (tenant_id, meal_date, meal_type);
CREATE INDEX ix_hostels_priority ON public.hostels USING btree (tenant_id, priority, created_at DESC);
CREATE INDEX ix_hostels_status_due ON public.hostels USING btree (tenant_id, status, due_date);
CREATE INDEX ix_idempotency_keys_expires_at ON public.idempotency_keys USING btree (tenant_id, expires_at);
CREATE INDEX ix_idempotency_keys_lookup ON public.idempotency_keys USING btree (tenant_id, scope, idempotency_key);
CREATE INDEX ix_idempotency_keys_user_status ON public.idempotency_keys USING btree (tenant_id, user_id, status, created_at DESC);
CREATE INDEX ix_integration_logs_tenant_created ON public.integration_logs USING btree (tenant_id, created_at DESC);
CREATE INDEX ix_inventory_backorders_request ON public.inventory_request_backorders USING btree (tenant_id, request_id, status);
CREATE INDEX ix_inventory_incidents_tenant_status_reported ON public.inventory_incidents USING btree (tenant_id, status, reported_at DESC);
CREATE INDEX ix_inventory_item_balances_location ON public.inventory_item_balances USING btree (tenant_id, location_code, item_id);
CREATE INDEX ix_inventory_items_low_stock ON public.inventory_items USING btree (tenant_id, quantity_on_hand, reorder_level);
CREATE INDEX ix_inventory_items_search_vector ON public.inventory_items USING gin (to_tsvector('simple'::regconfig, ((((((((item_name || ' '::text) || sku) || ' '::text) || unit) || ' '::text) || COALESCE(storage_location, ''::text)) || ' '::text) || COALESCE(notes, ''::text))));
CREATE INDEX ix_inventory_items_status ON public.inventory_items USING btree (tenant_id, status, updated_at DESC);
CREATE INDEX ix_inventory_movements_occurred_at ON public.inventory_stock_movements USING btree (tenant_id, occurred_at DESC);
CREATE INDEX ix_inventory_movements_submission_id ON public.inventory_stock_movements USING btree (tenant_id, submission_id) WHERE (submission_id IS NOT NULL);
CREATE INDEX ix_inventory_purchase_orders_tenant_status_created ON public.inventory_purchase_orders USING btree (tenant_id, status, created_at DESC);
CREATE INDEX ix_inventory_requests_tenant_status_created ON public.inventory_requests USING btree (tenant_id, status, created_at DESC);
CREATE INDEX ix_inventory_reservations_request ON public.inventory_reservations USING btree (tenant_id, request_id, status);
CREATE INDEX ix_inventory_stock_counts_counted_at ON public.inventory_stock_count_snapshots USING btree (tenant_id, counted_at DESC);
CREATE INDEX ix_inventory_suppliers_search_vector ON public.inventory_suppliers USING gin (to_tsvector('simple'::regconfig, ((((((((supplier_name || ' '::text) || COALESCE(contact_person, ''::text)) || ' '::text) || COALESCE(email, ''::text)) || ' '::text) || COALESCE(phone, ''::text)) || ' '::text) || COALESCE(county, ''::text))));
CREATE INDEX ix_inventory_transfers_tenant_status_created ON public.inventory_transfers USING btree (tenant_id, status, created_at DESC);
CREATE INDEX ix_invoices_payment_intent_id ON public.invoices USING btree (tenant_id, payment_intent_id);
CREATE INDEX ix_invoices_student_fee_allocation ON public.invoices USING btree (tenant_id, ((metadata ->> 'student_id'::text)), status, due_at);
CREATE INDEX ix_invoices_student_fee_statement ON public.invoices USING btree (tenant_id, ((metadata ->> 'student_id'::text)), issued_at, created_at);
CREATE INDEX ix_invoices_tenant_issued_created ON public.invoices USING btree (tenant_id, issued_at DESC, created_at DESC);
CREATE INDEX ix_invoices_tenant_status_due_at ON public.invoices USING btree (tenant_id, status, due_at DESC);
CREATE INDEX ix_iot_alerts_open ON public.iot_alerts USING btree (tenant_id, status, severity, created_at DESC);
CREATE INDEX ix_iot_commands_device_status ON public.iot_device_commands USING btree (tenant_id, device_id, status, created_at DESC);
CREATE INDEX ix_iot_credentials_device_status ON public.iot_device_credentials USING btree (tenant_id, device_id, status, created_at DESC);
CREATE INDEX ix_iot_devices_status ON public.iot_devices USING btree (tenant_id, status, health_status);
CREATE INDEX ix_iot_gateway_ingestions_device_time ON public.iot_gateway_ingestions USING btree (tenant_id, device_id, accepted_at DESC);
CREATE INDEX ix_iot_telemetry_device_time ON public.iot_telemetry_readings USING btree (tenant_id, device_id, recorded_at DESC);
CREATE INDEX ix_lab_attendance_session ON public.lab_attendance USING btree (tenant_id, session_id, status);
CREATE INDEX ix_lab_breakage_loss_attention ON public.lab_breakage_loss_records USING btree (tenant_id, status, incident_date);
CREATE INDEX ix_lab_equipment_location ON public.lab_equipment USING btree (tenant_id, storage_location, item_type);
CREATE INDEX ix_lab_issue_records_attention ON public.lab_issue_records USING btree (tenant_id, status, expected_return_at);
CREATE INDEX ix_lab_practical_requests_schedule ON public.lab_practical_requests USING btree (tenant_id, practical_date, lesson_time, status);
CREATE INDEX ix_lab_sessions_schedule ON public.lab_sessions USING btree (tenant_id, session_date, class_section_id, lab_id);
CREATE INDEX ix_lab_stocktakes_location ON public.lab_stocktakes USING btree (tenant_id, status, location_name);
CREATE INDEX ix_ledger_entries_account_created_at ON public.ledger_entries USING btree (tenant_id, account_id, created_at DESC);
CREATE INDEX ix_ledger_entries_transaction ON public.ledger_entries USING btree (tenant_id, transaction_id, line_number);
CREATE INDEX ix_library_borrowers_tenant_scan_code ON public.library_borrowers USING btree (tenant_id, scan_code) WHERE (scan_code IS NOT NULL);
CREATE INDEX ix_library_catalog_items_tenant_title ON public.library_catalog_items USING btree (tenant_id, title);
CREATE INDEX ix_library_catalog_items_title_trgm ON public.library_catalog_items USING gin (lower(title) public.gin_trgm_ops);
CREATE INDEX ix_library_circulation_tenant_action_created ON public.library_circulation_ledger USING btree (tenant_id, action, created_at DESC);
CREATE INDEX ix_library_circulation_tenant_borrower_action_created ON public.library_circulation_ledger USING btree (tenant_id, borrower_id, action, created_at DESC) WHERE (borrower_id IS NOT NULL);
CREATE INDEX ix_library_circulation_tenant_copy_action_created ON public.library_circulation_ledger USING btree (tenant_id, copy_id, action, created_at DESC) WHERE (copy_id IS NOT NULL);
CREATE INDEX ix_library_copies_tenant_accession ON public.library_copies USING btree (tenant_id, accession_number);
CREATE INDEX ix_library_copies_tenant_status_created ON public.library_copies USING btree (tenant_id, status, created_at DESC);
CREATE INDEX ix_lms_activity_events_course ON public.lms_activity_events USING btree (tenant_id, course_id, created_at DESC);
CREATE INDEX ix_lms_assignments_course_due ON public.lms_assignments USING btree (tenant_id, course_id, due_at);
CREATE INDEX ix_lms_courses_priority ON public.lms_courses USING btree (tenant_id, priority, created_at DESC);
CREATE INDEX ix_lms_courses_status_due ON public.lms_courses USING btree (tenant_id, status, due_date);
CREATE INDEX ix_lms_submissions_student_assignment ON public.lms_submissions USING btree (tenant_id, student_id, assignment_id, submitted_at DESC);
CREATE INDEX ix_manual_fee_payment_allocations_payment ON public.manual_fee_payment_allocations USING btree (tenant_id, manual_payment_id, created_at);
CREATE INDEX ix_manual_fee_payments_invoice ON public.manual_fee_payments USING btree (tenant_id, invoice_id, received_at DESC) WHERE (invoice_id IS NOT NULL);
CREATE INDEX ix_manual_fee_payments_reconciliation_cleared ON public.manual_fee_payments USING btree (tenant_id, payment_method, cleared_at DESC) WHERE (cleared_at IS NOT NULL);
CREATE INDEX ix_manual_fee_payments_reconciliation_received ON public.manual_fee_payments USING btree (tenant_id, payment_method, received_at DESC);
CREATE INDEX ix_manual_fee_payments_status_received ON public.manual_fee_payments USING btree (tenant_id, status, received_at DESC);
CREATE INDEX ix_manual_fee_payments_student ON public.manual_fee_payments USING btree (tenant_id, student_id, received_at DESC) WHERE (student_id IS NOT NULL);
CREATE INDEX ix_manual_fee_payments_unapplied_student_credit ON public.manual_fee_payments USING btree (tenant_id, student_id, currency_code, cleared_at DESC) WHERE ((status = 'cleared'::text) AND (student_id IS NOT NULL) AND (invoice_id IS NULL));
CREATE INDEX ix_meeting_minutes_date ON public.meeting_minutes USING btree (tenant_id, meeting_date DESC);
CREATE INDEX ix_module_usage_events_tenant_module ON public.module_usage_events USING btree (tenant_id, module_code, created_at DESC);
CREATE INDEX ix_monitoring_service_account_audit_logs_tenant_created ON public.monitoring_service_account_audit_logs USING btree (tenant_id, created_at DESC);
CREATE INDEX ix_monitoring_service_accounts_expires_at ON public.monitoring_service_accounts USING btree (expires_at);
CREATE INDEX ix_monitoring_service_accounts_tenant_status ON public.monitoring_service_accounts USING btree (tenant_id, status);
CREATE INDEX ix_mpesa_c2b_payments_reference ON public.mpesa_c2b_payments USING btree (tenant_id, bill_ref_number, received_at DESC) WHERE (bill_ref_number IS NOT NULL);
CREATE INDEX ix_mpesa_c2b_payments_status_received ON public.mpesa_c2b_payments USING btree (tenant_id, status, received_at DESC);
CREATE INDEX ix_mpesa_c2b_payments_student ON public.mpesa_c2b_payments USING btree (tenant_id, matched_student_id, received_at DESC) WHERE (matched_student_id IS NOT NULL);
CREATE INDEX ix_mpesa_callback_channels_tenant_shortcode ON public.mpesa_callback_channels USING btree (tenant_id, shortcode, environment) WHERE (disabled_at IS NULL);
CREATE INDEX ix_mpesa_config_audit_logs_config_created ON public.mpesa_config_audit_logs USING btree (tenant_id, mpesa_config_id, created_at DESC);
CREATE INDEX ix_mpesa_payload_support_access_ref ON public.mpesa_payload_support_access_logs USING btree (tenant_id, raw_payload_encrypted_ref, accessed_at DESC);
CREATE INDEX ix_mpesa_payload_vault_source ON public.mpesa_payload_vault USING btree (tenant_id, source, source_id);
CREATE INDEX ix_mpesa_reconciliation_batches_report_date ON public.mpesa_reconciliation_batches USING btree (tenant_id, report_date DESC, payment_channel_id);
CREATE INDEX ix_mpesa_reconciliation_batches_state ON public.mpesa_reconciliation_batches USING btree (tenant_id, reconciliation_state, generated_at DESC);
CREATE INDEX ix_mpesa_reconciliation_discrepancies_batch ON public.mpesa_reconciliation_discrepancies USING btree (tenant_id, reconciliation_batch_id, severity);
CREATE INDEX ix_mpesa_reconciliation_discrepancies_resolution ON public.mpesa_reconciliation_discrepancies USING btree (tenant_id, resolution_status, occurred_at DESC);
CREATE INDEX ix_mpesa_transactions_receipt_number ON public.mpesa_transactions USING btree (tenant_id, mpesa_receipt_number);
CREATE INDEX ix_mpesa_transactions_status ON public.mpesa_transactions USING btree (tenant_id, status, created_at DESC);
CREATE INDEX ix_mpesa_verification_jobs_checkout_request ON public.mpesa_verification_jobs USING btree (tenant_id, checkout_request_id, created_at DESC) WHERE (checkout_request_id IS NOT NULL);
CREATE INDEX ix_mpesa_verification_jobs_next_retry ON public.mpesa_verification_jobs USING btree (tenant_id, transaction_status, next_retry_at) WHERE (transaction_status = ANY (ARRAY['pending'::text, 'retry_scheduled'::text]));
CREATE INDEX ix_notifications_tenant_role_status_created ON public.notifications USING btree (tenant_id, recipient_role, status, created_at DESC);
CREATE INDEX ix_notifications_tenant_user_status_created ON public.notifications USING btree (tenant_id, recipient_user_id, status, created_at DESC);
CREATE INDEX ix_outbox_events_dispatch ON public.outbox_events USING btree (status, available_at, created_at);
CREATE INDEX ix_outbox_events_tenant_status_available_at ON public.outbox_events USING btree (tenant_id, status, available_at, created_at);
CREATE INDEX ix_outbox_events_tenant_status_created_id ON public.outbox_events USING btree (tenant_id, status, created_at, id);
CREATE INDEX ix_parent_acknowledgements_incident ON public.parent_acknowledgements USING btree (tenant_id, incident_id, parent_user_id);
CREATE INDEX ix_parent_guardians_school_status ON public.parent_guardians USING btree (school_id, status) WHERE (deleted_at IS NULL);
CREATE INDEX ix_parent_otp_challenges_phone_hash ON public.parent_otp_challenges USING btree (tenant_id, phone_hash, created_at DESC);
CREATE INDEX ix_payment_intents_mpesa_short_code ON public.payment_intents USING btree (tenant_id, mpesa_short_code, created_at DESC) WHERE (mpesa_short_code IS NOT NULL);
CREATE INDEX ix_payment_intents_phone_number ON public.payment_intents USING btree (tenant_id, phone_number, created_at DESC);
CREATE INDEX ix_payment_intents_status_created_at ON public.payment_intents USING btree (tenant_id, status, created_at DESC);
CREATE INDEX ix_payment_intents_status_expires_at ON public.payment_intents USING btree (tenant_id, status, expires_at) WHERE (status = ANY (ARRAY['stk_requested'::text, 'callback_received'::text, 'processing'::text]));
CREATE INDEX ix_payment_intents_student_id ON public.payment_intents USING btree (tenant_id, student_id, created_at DESC) WHERE (student_id IS NOT NULL);
CREATE INDEX ix_principal_alerts_status ON public.principal_alerts USING btree (tenant_id, status, severity, created_at DESC);
CREATE INDEX ix_principal_dashboard_snapshots_expiry ON public.principal_dashboard_snapshots USING btree (tenant_id, enabled_module_hash, filter_hash, expires_at DESC);
CREATE INDEX ix_procurement_budget_links_code ON public.procurement_budget_links USING btree (tenant_id, budget_code);
CREATE INDEX ix_procurement_request_items_request ON public.procurement_request_items USING btree (tenant_id, request_id);
CREATE INDEX ix_purchase_orders_supplier_status ON public.purchase_orders USING btree (tenant_id, supplier_id, status);
CREATE INDEX ix_query_plan_admission_applications_search ON public.admission_applications USING gin (to_tsvector('simple'::regconfig, ((((((((((((application_number || ' '::text) || full_name) || ' '::text) || birth_certificate_number) || ' '::text) || class_applying) || ' '::text) || parent_name) || ' '::text) || parent_phone) || ' '::text) || COALESCE(parent_email, ''::text))));
CREATE INDEX ix_query_plan_admission_applications_tenant_created ON public.admission_applications USING btree (tenant_id, created_at DESC);
CREATE INDEX ix_query_plan_counselling_sessions_schedule ON public.counselling_sessions USING btree (tenant_id, counsellor_user_id, status, scheduled_for);
CREATE INDEX ix_query_plan_discipline_incidents_queue ON public.discipline_incidents USING btree (tenant_id, status, severity, occurred_at DESC, created_at DESC) WHERE (deleted_at IS NULL);
CREATE INDEX ix_query_plan_exam_marks_student_series ON public.exam_marks USING btree (tenant_id, student_id, exam_series_id, updated_at DESC);
CREATE INDEX ix_query_plan_inventory_items_search ON public.inventory_items USING gin (to_tsvector('simple'::regconfig, ((((((((item_name || ' '::text) || sku) || ' '::text) || unit) || ' '::text) || COALESCE(storage_location, ''::text)) || ' '::text) || COALESCE(notes, ''::text))));
CREATE INDEX ix_query_plan_inventory_items_tenant_status_name ON public.inventory_items USING btree (tenant_id, status, item_name);
CREATE INDEX ix_query_plan_library_catalog_items_tenant_title ON public.library_catalog_items USING btree (tenant_id, title);
CREATE INDEX ix_query_plan_library_catalog_items_title_trgm ON public.library_catalog_items USING gin (lower(title) public.gin_trgm_ops);
CREATE INDEX ix_query_plan_staff_profiles_directory ON public.staff_profiles USING btree (tenant_id, status, display_name);
CREATE INDEX ix_query_plan_student_fee_payment_allocations_student ON public.student_fee_payment_allocations USING btree (tenant_id, student_id, created_at DESC);
CREATE INDEX ix_query_plan_students_search ON public.students USING gin (to_tsvector('simple'::regconfig, ((((((((((admission_number || ' '::text) || first_name) || ' '::text) || COALESCE(middle_name, ''::text)) || ' '::text) || last_name) || ' '::text) || COALESCE(primary_guardian_name, ''::text)) || ' '::text) || COALESCE(primary_guardian_phone, ''::text))));
CREATE INDEX ix_query_plan_students_tenant_name ON public.students USING btree (tenant_id, last_name, first_name);
CREATE INDEX ix_query_plan_support_status_subscriptions_active ON public.support_status_subscriptions USING btree (tenant_id, status, created_at);
CREATE INDEX ix_query_plan_support_tickets_search ON public.support_tickets USING gin (to_tsvector('simple'::regconfig, ((((((((ticket_number || ' '::text) || subject) || ' '::text) || category) || ' '::text) || module_affected) || ' '::text) || description)));
CREATE INDEX ix_query_plan_support_tickets_tenant_updated ON public.support_tickets USING btree (tenant_id, updated_at DESC);
CREATE INDEX ix_query_plan_teacher_subject_assignments_teacher ON public.teacher_subject_assignments USING btree (tenant_id, teacher_user_id, academic_term_id);
CREATE INDEX ix_query_plan_timetable_slots_lookup ON public.timetable_slots USING btree (tenant_id, academic_year, term_name, day_of_week, starts_at);
CREATE INDEX ix_report_card_artifacts_report_card ON public.report_card_artifacts USING btree (tenant_id, report_card_id, generated_at DESC);
CREATE INDEX ix_report_card_comments_term ON public.report_card_comments USING btree (tenant_id, academic_term_id, class_section_id);
CREATE INDEX ix_report_card_generation_batches_status ON public.report_card_generation_batches USING btree (tenant_id, status, created_at DESC);
CREATE INDEX ix_report_schedule_requests_status ON public.report_schedule_requests USING btree (tenant_id, status, created_at DESC);
CREATE INDEX ix_report_snapshot_audit_tenant_snapshot_created ON public.report_snapshot_audit_logs USING btree (tenant_id, snapshot_id, created_at DESC);
CREATE INDEX ix_report_snapshots_manifest_checksum ON public.report_snapshots USING btree (manifest_checksum_sha256);
CREATE INDEX ix_report_snapshots_tenant_module_created ON public.report_snapshots USING btree (tenant_id, module, created_at DESC);
CREATE INDEX ix_report_snapshots_tenant_report_created ON public.report_snapshots USING btree (tenant_id, report_id, created_at DESC);
CREATE INDEX ix_school_integrations_shortcode ON public.school_integrations USING btree (shortcode) WHERE (shortcode IS NOT NULL);
CREATE INDEX ix_school_integrations_tenant_active ON public.school_integrations USING btree (tenant_id, integration_type, is_active);
CREATE INDEX ix_school_module_access_module ON public.school_module_access USING btree (module_id, enabled);
CREATE INDEX ix_school_module_access_tenant_enabled ON public.school_module_access USING btree (tenant_id, enabled);
CREATE INDEX ix_sms_logs_tenant_created ON public.sms_logs USING btree (tenant_id, created_at DESC);
CREATE INDEX ix_sms_logs_tenant_status_created ON public.sms_logs USING btree (tenant_id, status, created_at DESC);
CREATE INDEX ix_sms_wallet_transactions_tenant_created ON public.sms_wallet_transactions USING btree (tenant_id, created_at DESC);
CREATE INDEX ix_staff_profiles_display_name_trgm ON public.staff_profiles USING gin (display_name public.gin_trgm_ops);
CREATE INDEX ix_staff_profiles_tenant_status_display_name ON public.staff_profiles USING btree (tenant_id, status, display_name, staff_number);
CREATE INDEX ix_student_academic_enrollments_section_status ON public.student_academic_enrollments USING btree (tenant_id, class_section_id, status);
CREATE INDEX ix_student_academic_lifecycle_events_student_created ON public.student_academic_lifecycle_events USING btree (tenant_id, student_id, created_at DESC);
CREATE INDEX ix_student_class_assignments_student_year ON public.student_class_assignments USING btree (tenant_id, student_id, academic_year_id, status);
CREATE INDEX ix_student_exits_tenant ON public.student_exits USING btree (tenant_id, status);
CREATE INDEX ix_student_fee_assignments_student_status ON public.student_fee_assignments USING btree (tenant_id, student_id, status);
CREATE INDEX ix_student_fee_credits_student_remaining ON public.student_fee_credits USING btree (tenant_id, student_id, remaining_amount_minor DESC);
CREATE INDEX ix_student_fee_invoices_student_status ON public.student_fee_invoices USING btree (tenant_id, student_id, status, due_date DESC);
CREATE INDEX ix_student_fee_payment_allocations_student ON public.student_fee_payment_allocations USING btree (tenant_id, student_id, created_at DESC);
CREATE INDEX ix_student_fee_structures_class_active ON public.student_fee_structures USING btree (tenant_id, lower(class_name), is_active);
CREATE INDEX ix_student_guardians_invitation ON public.student_guardians USING btree (tenant_id, invitation_id) WHERE (invitation_id IS NOT NULL);
CREATE INDEX ix_student_guardians_user_status ON public.student_guardians USING btree (tenant_id, user_id, status) WHERE (user_id IS NOT NULL);
CREATE INDEX ix_student_portal_access_lookup ON public.student_portal_access USING btree (lower(username), guardian_phone_hash) WHERE (status = 'active'::text);
CREATE INDEX ix_student_report_cards_student ON public.student_report_cards USING btree (tenant_id, student_id, published_at DESC);
CREATE INDEX ix_student_report_cards_tenant_published ON public.student_report_cards USING btree (tenant_id, published_at DESC NULLS LAST, created_at DESC);
CREATE INDEX ix_student_subject_enrollments_class_subject ON public.student_subject_enrollments USING btree (tenant_id, class_section_id, subject_id, status) WHERE ((class_section_id IS NOT NULL) AND (subject_id IS NOT NULL));
CREATE INDEX ix_student_subject_enrollments_student_status ON public.student_subject_enrollments USING btree (tenant_id, student_id, status);
CREATE INDEX ix_student_timetable_enrollments_student_status ON public.student_timetable_enrollments USING btree (tenant_id, student_id, status);
CREATE INDEX ix_students_name_lookup ON public.students USING btree (tenant_id, last_name, first_name, admission_number);
CREATE INDEX ix_students_school_name_lookup ON public.students USING btree (school_id, last_name, first_name, admission_number);
CREATE INDEX ix_students_school_status_created_at ON public.students USING btree (school_id, student_status, created_at DESC);
CREATE INDEX ix_students_search_vector ON public.students USING gin (to_tsvector('simple'::regconfig, ((((((((((admission_number || ' '::text) || first_name) || ' '::text) || COALESCE(middle_name, ''::text)) || ' '::text) || last_name) || ' '::text) || COALESCE(primary_guardian_name, ''::text)) || ' '::text) || COALESCE(primary_guardian_phone, ''::text))));
CREATE INDEX ix_students_status_created_at ON public.students USING btree (tenant_id, status, created_at DESC);
CREATE INDEX ix_subjects_department ON public.subjects USING btree (tenant_id, department_id, name);
CREATE INDEX ix_subscriptions_tenant_status_period_end ON public.subscriptions USING btree (tenant_id, status, current_period_end DESC);
CREATE INDEX ix_supplier_invoices_order ON public.supplier_invoices USING btree (tenant_id, purchase_order_id, status);
CREATE INDEX ix_support_incidents_status ON public.support_incidents USING btree (tenant_id, status, started_at DESC);
CREATE INDEX ix_support_internal_notes_ticket ON public.support_internal_notes USING btree (tenant_id, ticket_id, created_at DESC);
CREATE INDEX ix_support_kb_articles_search ON public.support_kb_articles USING btree (tenant_id, category, published, title);
CREATE INDEX ix_support_kb_articles_search_vector ON public.support_kb_articles USING gin (to_tsvector('simple'::regconfig, ((((title || ' '::text) || summary) || ' '::text) || body)));
CREATE INDEX ix_support_kb_articles_tags ON public.support_kb_articles USING gin (tags);
CREATE INDEX ix_support_messages_ticket ON public.support_messages USING btree (tenant_id, ticket_id, created_at);
CREATE INDEX ix_support_notifications_delivery_queue ON public.support_notifications USING btree (delivery_status, channel, next_delivery_attempt_at, created_at);
CREATE INDEX ix_support_notifications_recipient ON public.support_notifications USING btree (tenant_id, recipient_type, read_at, created_at DESC);
CREATE INDEX ix_support_status_logs_ticket ON public.support_status_logs USING btree (tenant_id, ticket_id, created_at DESC);
CREATE INDEX ix_support_status_notification_attempts_incident ON public.support_status_notification_attempts USING btree (tenant_id, incident_id, created_at DESC);
CREATE INDEX ix_support_status_notification_attempts_queue ON public.support_status_notification_attempts USING btree (delivery_status, next_attempt_at, created_at);
CREATE INDEX ix_support_status_subscriptions_active ON public.support_status_subscriptions USING btree (tenant_id, status, created_at);
CREATE INDEX ix_support_status_subscriptions_rate_limit ON public.support_status_subscriptions USING btree (contact_hash, client_ip_hash, created_at DESC);
CREATE INDEX ix_support_status_unsubscribe_tokens_contact ON public.support_status_unsubscribe_tokens USING btree (tenant_id, contact_hash, used_at, expires_at);
CREATE INDEX ix_support_tickets_queue ON public.support_tickets USING btree (tenant_id, status, priority, updated_at DESC);
CREATE INDEX ix_support_tickets_search ON public.support_tickets USING btree (ticket_number, tenant_id, module_affected, status);
CREATE INDEX ix_support_tickets_search_vector ON public.support_tickets USING gin (to_tsvector('simple'::regconfig, ((((((((ticket_number || ' '::text) || subject) || ' '::text) || category) || ' '::text) || module_affected) || ' '::text) || description)));
CREATE INDEX ix_support_tickets_sla ON public.support_tickets USING btree (status, first_response_due_at, resolution_due_at);
CREATE INDEX ix_sync_cursors_device_updated_at ON public.sync_cursors USING btree (tenant_id, device_id, updated_at DESC);
CREATE INDEX ix_sync_devices_last_seen_at ON public.sync_devices USING btree (tenant_id, last_seen_at DESC);
CREATE INDEX ix_sync_devices_platform ON public.sync_devices USING btree (tenant_id, platform, updated_at DESC);
CREATE INDEX ix_sync_operation_logs_device_created_at ON public.sync_operation_logs USING btree (tenant_id, device_id, created_at DESC);
CREATE INDEX ix_sync_operation_logs_tenant_entity_version ON public.sync_operation_logs USING btree (tenant_id, entity, version);
CREATE INDEX ix_tasks_tenant_role_status_created ON public.tasks USING btree (tenant_id, assigned_to_role, status, created_at DESC);
CREATE INDEX ix_tasks_tenant_user_status_created ON public.tasks USING btree (tenant_id, assigned_to_user_id, status, created_at DESC);
CREATE INDEX ix_teacher_attendance_logs_teacher_date ON public.teacher_attendance_logs USING btree (tenant_id, teacher_user_id, attendance_date, created_at DESC);
CREATE INDEX ix_teacher_subject_assignments_teacher ON public.teacher_subject_assignments USING btree (tenant_id, teacher_user_id, academic_term_id);
CREATE INDEX ix_tenant_bank_accounts_tenant_status ON public.tenant_bank_accounts USING btree (tenant_id, status, bank_name);
CREATE INDEX ix_tenant_memberships_user_id ON public.tenant_memberships USING btree (user_id);
CREATE INDEX ix_tenant_mpesa_configs_shortcode ON public.tenant_mpesa_configs USING btree (shortcode);
CREATE INDEX ix_tenant_mpesa_configs_tenant_status ON public.tenant_mpesa_configs USING btree (tenant_id, status, updated_at DESC);
CREATE INDEX ix_tenant_payment_channels_tenant_status ON public.tenant_payment_channels USING btree (tenant_id, status, channel_type);
CREATE INDEX ix_timetable_availability_teacher ON public.timetable_teacher_availability USING btree (tenant_id, academic_year, term_name, teacher_id, day_of_week);
CREATE INDEX ix_timetable_periods_configuration_day ON public.timetable_period_definitions USING btree (tenant_id, configuration_id, day_of_week, order_index);
CREATE INDEX ix_timetable_requirements_scope ON public.timetable_subject_requirements USING btree (tenant_id, academic_year, term_name, class_section_id, status);
CREATE INDEX ix_timetable_slots_class_view ON public.timetable_slots USING btree (tenant_id, version_id, class_section_id, day_of_week, starts_at) WHERE (status <> 'cancelled'::text);
CREATE INDEX ix_timetable_slots_conflict_lookup ON public.timetable_slots USING btree (tenant_id, academic_year, term_name, day_of_week, starts_at, ends_at);
CREATE INDEX ix_timetable_slots_resource_view ON public.timetable_slots USING btree (tenant_id, version_id, resource_id, day_of_week, starts_at) WHERE ((resource_id IS NOT NULL) AND (status <> 'cancelled'::text));
CREATE INDEX ix_timetable_slots_stream_view ON public.timetable_slots USING btree (tenant_id, version_id, stream_id, day_of_week, starts_at) WHERE ((stream_id IS NOT NULL) AND (status <> 'cancelled'::text));
CREATE INDEX ix_timetable_slots_teacher_view ON public.timetable_slots USING btree (tenant_id, version_id, teacher_id, day_of_week, starts_at) WHERE (status <> 'cancelled'::text);
CREATE INDEX ix_timetable_versions_history ON public.timetable_versions USING btree (tenant_id, academic_year, term_name, revision_number DESC, created_at DESC);
CREATE INDEX ix_timetable_versions_tenant_term ON public.timetable_versions USING btree (tenant_id, academic_year, term_name, status);
CREATE INDEX ix_transactions_created_by_user ON public.transactions USING btree (tenant_id, created_by_user_id, posted_at DESC);
CREATE INDEX ix_transactions_tenant_effective_at ON public.transactions USING btree (tenant_id, effective_at DESC);
CREATE INDEX ix_transactions_tenant_posted_at ON public.transactions USING btree (tenant_id, posted_at DESC);
CREATE INDEX ix_transport_alerts_open ON public.transport_alerts USING btree (tenant_id, status, severity, created_at DESC);
CREATE INDEX ix_transport_manifest_students_student ON public.transport_manifest_students USING btree (tenant_id, student_id);
CREATE INDEX ix_transport_route_stops_route_sequence ON public.transport_route_stops USING btree (tenant_id, route_id, stop_sequence);
CREATE INDEX ix_transport_routes_assigned_vehicle ON public.transport_routes USING btree (tenant_id, assigned_vehicle_id) WHERE (assigned_vehicle_id IS NOT NULL);
CREATE INDEX ix_transport_trip_events_trip_time ON public.transport_trip_events USING btree (tenant_id, trip_id, event_time DESC);
CREATE INDEX ix_transport_trips_route_date ON public.transport_trips USING btree (tenant_id, route_id, trip_date DESC);
CREATE INDEX ix_usage_records_subscription_period ON public.usage_records USING btree (tenant_id, subscription_id, period_start, period_end);
CREATE INDEX ix_usage_records_tenant_feature_recorded_at ON public.usage_records USING btree (tenant_id, feature_key, recorded_at DESC);
CREATE INDEX ix_user_roles_tenant_role ON public.user_roles USING btree (tenant_id, role_id);
CREATE INDEX ix_user_roles_tenant_user_status ON public.user_roles USING btree (tenant_id, user_id, status) WHERE (deleted_at IS NULL);
CREATE INDEX ix_users_phone_number_hash ON public.users USING btree (phone_number_hash) WHERE (phone_number_hash IS NOT NULL);
CREATE INDEX ix_users_tenant_id ON public.users USING btree (tenant_id);
CREATE INDEX ix_vehicle_fuel_logs_vehicle ON public.vehicle_fuel_logs USING btree (tenant_id, vehicle_id, fuel_date DESC);
CREATE INDEX ix_vehicle_service_logs_vehicle ON public.vehicle_service_logs USING btree (tenant_id, vehicle_id, service_date DESC);
CREATE INDEX ix_visitors_appointments_tenant ON public.visitors_appointments USING btree (tenant_id, appointment_time);
CREATE INDEX ix_visitors_logs_tenant ON public.visitors_logs USING btree (tenant_id, status);
CREATE INDEX ix_visitors_registry_tenant ON public.visitors_registry USING btree (tenant_id);
CREATE INDEX lab_attendance_tenant_id_idx ON public.lab_attendance USING btree (tenant_id);
CREATE INDEX lab_departments_tenant_id_idx ON public.lab_departments USING btree (tenant_id);
CREATE INDEX lab_equipment_tenant_id_idx ON public.lab_equipment USING btree (tenant_id);
CREATE INDEX lab_session_chemical_usage_tenant_id_idx ON public.lab_session_chemical_usage USING btree (tenant_id);
CREATE INDEX lab_session_equipment_usage_tenant_id_idx ON public.lab_session_equipment_usage USING btree (tenant_id);
CREATE INDEX lab_sessions_tenant_id_idx ON public.lab_sessions USING btree (tenant_id);
CREATE INDEX labs_tenant_id_idx ON public.labs USING btree (tenant_id);
CREATE INDEX learning_areas_school_id_idx ON public.learning_areas USING btree (school_id);
CREATE INDEX ledger_entries_tenant_id_idx ON public.ledger_entries USING btree (tenant_id);
CREATE UNIQUE INDEX ledger_entries_tenant_id_transaction_id_line_number_key ON public.ledger_entries USING btree (tenant_id, transaction_id, line_number);
CREATE INDEX library_book_copies_school_id_idx ON public.library_book_copies USING btree (school_id);
CREATE UNIQUE INDEX library_books_school_id_barcode_key ON public.library_books USING btree (school_id, barcode);
CREATE INDEX library_books_school_id_idx ON public.library_books USING btree (school_id);
CREATE INDEX library_circulation_ledger_tenant_id_idx ON public.library_circulation_ledger USING btree (tenant_id);
CREATE INDEX library_fines_school_id_idx ON public.library_fines USING btree (school_id);
CREATE INDEX library_loans_school_id_idx ON public.library_loans USING btree (school_id);
CREATE INDEX library_reservations_tenant_id_idx ON public.library_reservations USING btree (tenant_id);
CREATE INDEX lms_submissions_tenant_id_idx ON public.lms_submissions USING btree (tenant_id);
CREATE INDEX maintenance_tickets_school_id_idx ON public.maintenance_tickets USING btree (school_id);
CREATE INDEX manual_fee_payment_allocations_tenant_id_idx ON public.manual_fee_payment_allocations USING btree (tenant_id);
CREATE INDEX manual_fee_payments_tenant_id_idx ON public.manual_fee_payments USING btree (tenant_id);
CREATE INDEX mark_submissions_school_id_idx ON public.mark_submissions USING btree (school_id);
CREATE INDEX marks_entries_school_id_exam_cycle_id_idx ON public.marks_entries USING btree (school_id, exam_cycle_id);
CREATE UNIQUE INDEX marks_entries_school_id_exam_cycle_id_student_id_subject_id_key ON public.marks_entries USING btree (school_id, exam_cycle_id, student_id, subject_id);
CREATE INDEX marks_entries_school_id_idx ON public.marks_entries USING btree (school_id);
CREATE INDEX marks_entries_school_id_student_id_idx ON public.marks_entries USING btree (school_id, student_id);
CREATE INDEX medical_visits_school_id_idx ON public.medical_visits USING btree (school_id);
CREATE INDEX medicine_dispensing_logs_school_id_idx ON public.medicine_dispensing_logs USING btree (school_id);
CREATE INDEX medicine_inventory_school_id_idx ON public.medicine_inventory USING btree (school_id);
CREATE INDEX meeting_minutes_tenant_id_idx ON public.meeting_minutes USING btree (tenant_id);
CREATE INDEX module_package_items_tenant_id_idx ON public.module_package_items USING btree (tenant_id);
CREATE INDEX module_packages_tenant_id_idx ON public.module_packages USING btree (tenant_id);
CREATE UNIQUE INDEX module_permissions_module_code_permission_id_key ON public.module_permissions USING btree (module_code, permission_id);
CREATE INDEX module_registry_tenant_id_idx ON public.module_registry USING btree (tenant_id);
CREATE INDEX module_usage_events_tenant_id_idx ON public.module_usage_events USING btree (tenant_id);
CREATE INDEX mpesa_c2b_payments_tenant_id_idx ON public.mpesa_c2b_payments USING btree (tenant_id);
CREATE INDEX mpesa_callback_channels_tenant_id_idx ON public.mpesa_callback_channels USING btree (tenant_id);
CREATE INDEX mpesa_config_audit_logs_tenant_id_idx ON public.mpesa_config_audit_logs USING btree (tenant_id);
CREATE INDEX mpesa_payload_support_access_logs_tenant_id_idx ON public.mpesa_payload_support_access_logs USING btree (tenant_id);
CREATE INDEX mpesa_payload_vault_tenant_id_idx ON public.mpesa_payload_vault USING btree (tenant_id);
CREATE INDEX mpesa_reconciliation_batches_tenant_id_idx ON public.mpesa_reconciliation_batches USING btree (tenant_id);
CREATE INDEX mpesa_reconciliation_discrepancies_tenant_id_idx ON public.mpesa_reconciliation_discrepancies USING btree (tenant_id);
CREATE UNIQUE INDEX mpesa_transactions_mpesa_receipt_number_key ON public.mpesa_transactions USING btree (mpesa_receipt_number);
CREATE INDEX mpesa_transactions_school_id_idx ON public.mpesa_transactions USING btree (school_id);
CREATE INDEX mpesa_transactions_school_id_mpesa_receipt_number_idx ON public.mpesa_transactions USING btree (school_id, mpesa_receipt_number);
CREATE INDEX mpesa_verification_jobs_tenant_id_idx ON public.mpesa_verification_jobs USING btree (tenant_id);
CREATE INDEX notification_deliveries_notification_id_idx ON public.notification_deliveries USING btree (notification_id);
CREATE INDEX notification_deliveries_school_id_idx ON public.notification_deliveries USING btree (school_id);
CREATE INDEX notification_deliveries_status_idx ON public.notification_deliveries USING btree (status);
CREATE INDEX notification_preferences_school_id_idx ON public.notification_preferences USING btree (school_id);
CREATE INDEX notification_preferences_user_id_idx ON public.notification_preferences USING btree (user_id);
CREATE INDEX notification_rules_school_id_idx ON public.notification_rules USING btree (school_id);
CREATE INDEX notification_templates_school_id_idx ON public.notification_templates USING btree (school_id);
CREATE INDEX notifications_school_id_idx ON public.notifications USING btree (school_id);
CREATE INDEX notifications_school_id_module_status_idx ON public.notifications USING btree (school_id, module, status);
CREATE INDEX notifications_school_id_target_role_status_idx ON public.notifications USING btree (school_id, target_role, status);
CREATE INDEX notifications_school_id_target_user_id_status_idx ON public.notifications USING btree (school_id, target_user_id, status);
CREATE INDEX offense_categories_school_id_idx ON public.offense_categories USING btree (school_id);
CREATE INDEX offense_categories_tenant_id_idx ON public.offense_categories USING btree (tenant_id);
CREATE INDEX offline_sync_events_school_id_idx ON public.offline_sync_events USING btree (school_id);
CREATE UNIQUE INDEX offline_sync_events_school_id_operation_id_key ON public.offline_sync_events USING btree (school_id, operation_id);
CREATE INDEX operations_alerts_tenant_id_idx ON public.operations_alerts USING btree (tenant_id);
CREATE INDEX operations_emergencies_tenant_id_idx ON public.operations_emergencies USING btree (tenant_id);
CREATE INDEX operations_reports_tenant_id_idx ON public.operations_reports USING btree (tenant_id);
CREATE INDEX parent_guardians_school_id_idx ON public.parent_guardians USING btree (school_id);
CREATE UNIQUE INDEX parent_guardians_school_id_phone_key ON public.parent_guardians USING btree (school_id, phone);
CREATE UNIQUE INDEX parent_meetings_school_id_id_key ON public.parent_meetings USING btree (school_id, id);
CREATE INDEX parent_meetings_school_id_idx ON public.parent_meetings USING btree (school_id);
CREATE INDEX parent_otp_challenges_tenant_id_idx ON public.parent_otp_challenges USING btree (tenant_id);
CREATE INDEX payment_intents_tenant_id_idx ON public.payment_intents USING btree (tenant_id);
CREATE UNIQUE INDEX payments_payment_reference_key ON public.payments USING btree (payment_reference);
CREATE INDEX payments_school_id_idx ON public.payments USING btree (school_id);
CREATE UNIQUE INDEX permissions_code_key ON public.permissions USING btree (code);
CREATE UNIQUE INDEX permissions_key_key ON public.permissions USING btree (key);
CREATE INDEX platform_sms_providers_tenant_id_idx ON public.platform_sms_providers USING btree (tenant_id);
CREATE INDEX principal_dashboard_snapshots_tenant_id_idx ON public.principal_dashboard_snapshots USING btree (tenant_id);
CREATE INDEX procurement_approvals_tenant_id_idx ON public.procurement_approvals USING btree (tenant_id);
CREATE INDEX procurement_audit_logs_tenant_id_idx ON public.procurement_audit_logs USING btree (tenant_id);
CREATE INDEX procurement_budget_links_tenant_id_idx ON public.procurement_budget_links USING btree (tenant_id);
CREATE INDEX procurement_request_items_tenant_id_idx ON public.procurement_request_items USING btree (tenant_id);
CREATE INDEX procurement_requests_budget ON public.procurement_requests USING btree (tenant_id, budget_code, status);
CREATE INDEX procurement_requests_tenant_id_idx ON public.procurement_requests USING btree (tenant_id);
CREATE INDEX procurement_suppliers_tenant_id_idx ON public.procurement_suppliers USING btree (tenant_id);
CREATE INDEX purchase_order_items_tenant_id_idx ON public.purchase_order_items USING btree (tenant_id);
CREATE INDEX purchase_orders_school_id_idx ON public.purchase_orders USING btree (school_id);
CREATE INDEX purchase_requests_school_id_idx ON public.purchase_requests USING btree (school_id);
CREATE UNIQUE INDEX receipts_receipt_number_key ON public.receipts USING btree (receipt_number);
CREATE INDEX receipts_school_id_idx ON public.receipts USING btree (school_id);
CREATE INDEX receipts_school_id_receipt_number_idx ON public.receipts USING btree (school_id, receipt_number);
CREATE INDEX report_card_artifacts_tenant_id_idx ON public.report_card_artifacts USING btree (tenant_id);
CREATE INDEX report_card_comments_school_id_academic_term_id_class_secti_idx ON public.report_card_comments USING btree (school_id, academic_term_id, class_section_id);
CREATE UNIQUE INDEX report_card_comments_school_id_id_key ON public.report_card_comments USING btree (school_id, id);
CREATE INDEX report_card_generation_batches_tenant_id_idx ON public.report_card_generation_batches USING btree (tenant_id);
CREATE INDEX report_cards_school_id_idx ON public.report_cards USING btree (school_id);
CREATE UNIQUE INDEX report_cards_school_id_student_id_academic_year_id_term_id_key ON public.report_cards USING btree (school_id, student_id, academic_year_id, term_id);
CREATE INDEX report_cards_school_id_student_id_idx ON public.report_cards USING btree (school_id, student_id);
CREATE UNIQUE INDEX role_permissions_role_id_permission_id_key ON public.role_permissions USING btree (role_id, permission_id);
CREATE INDEX role_permissions_school_id_idx ON public.role_permissions USING btree (school_id);
CREATE INDEX roles_school_id_idx ON public.roles USING btree (school_id);
CREATE INDEX school_integrations_tenant_id_idx ON public.school_integrations USING btree (tenant_id);
CREATE INDEX school_memberships_school_id_idx ON public.school_memberships USING btree (school_id);
CREATE INDEX school_memberships_school_id_user_id_idx ON public.school_memberships USING btree (school_id, user_id);
CREATE UNIQUE INDEX school_memberships_school_id_user_id_key ON public.school_memberships USING btree (school_id, user_id);
CREATE INDEX school_module_access_tenant_id_idx ON public.school_module_access USING btree (tenant_id);
CREATE INDEX school_modules_school_id_idx ON public.school_modules USING btree (school_id);
CREATE UNIQUE INDEX school_modules_school_id_module_code_key ON public.school_modules USING btree (school_id, module_code);
CREATE INDEX school_settings_school_id_idx ON public.school_settings USING btree (school_id);
CREATE UNIQUE INDEX school_settings_school_id_key ON public.school_settings USING btree (school_id);
CREATE INDEX school_sms_wallets_tenant_id_idx ON public.school_sms_wallets USING btree (tenant_id);
CREATE INDEX school_subscriptions_school_id_idx ON public.school_subscriptions USING btree (school_id);
CREATE UNIQUE INDEX schools_registration_number_key ON public.schools USING btree (registration_number);
CREATE UNIQUE INDEX schools_school_code_key ON public.schools USING btree (school_code);
CREATE UNIQUE INDEX schools_slug_key ON public.schools USING btree (slug);
CREATE INDEX secretary_queue_tickets_tenant_id_idx ON public.secretary_queue_tickets USING btree (tenant_id);
CREATE INDEX security_incidents_tenant_id_idx ON public.security_incidents USING btree (tenant_id);
CREATE INDEX security_panic_alerts_tenant_id_idx ON public.security_panic_alerts USING btree (tenant_id);
CREATE INDEX setup_checklist_items_school_id_idx ON public.setup_checklist_items USING btree (school_id);
CREATE INDEX sms_credit_transactions_school_id_idx ON public.sms_credit_transactions USING btree (school_id);
CREATE INDEX sms_credit_wallets_school_id_idx ON public.sms_credit_wallets USING btree (school_id);
CREATE INDEX sms_logs_school_id_idx ON public.sms_logs USING btree (school_id);
CREATE INDEX sms_purchase_requests_tenant_id_idx ON public.sms_purchase_requests USING btree (tenant_id);
CREATE INDEX sms_wallet_transactions_tenant_id_idx ON public.sms_wallet_transactions USING btree (tenant_id);
CREATE INDEX staff_audit_logs_tenant_id_idx ON public.staff_audit_logs USING btree (tenant_id);
CREATE INDEX staff_contracts_tenant_id_idx ON public.staff_contracts USING btree (tenant_id);
CREATE INDEX staff_leave_requests_tenant_id_idx ON public.staff_leave_requests USING btree (tenant_id);
CREATE INDEX strands_school_id_idx ON public.strands USING btree (school_id);
CREATE INDEX streams_school_id_class_id_idx ON public.streams USING btree (school_id, class_id);
CREATE UNIQUE INDEX streams_school_id_class_id_name_key ON public.streams USING btree (school_id, class_id, name);
CREATE INDEX streams_school_id_idx ON public.streams USING btree (school_id);
CREATE INDEX student_audit_logs_school_id_idx ON public.student_audit_logs USING btree (school_id);
CREATE INDEX student_audit_logs_student_id_idx ON public.student_audit_logs USING btree (student_id);
CREATE UNIQUE INDEX student_class_assignments_school_id_id_key ON public.student_class_assignments USING btree (school_id, id);
CREATE INDEX student_class_assignments_school_id_idx ON public.student_class_assignments USING btree (school_id);
CREATE INDEX student_clearance_school_id_idx ON public.student_clearance USING btree (school_id);
CREATE INDEX student_clearance_student_id_idx ON public.student_clearance USING btree (student_id);
CREATE INDEX student_communications_guardian_id_idx ON public.student_communications USING btree (guardian_id);
CREATE INDEX student_communications_school_id_idx ON public.student_communications USING btree (school_id);
CREATE INDEX student_communications_student_id_idx ON public.student_communications USING btree (student_id);
CREATE INDEX student_enrollments_school_id_academic_year_id_idx ON public.student_enrollments USING btree (school_id, academic_year_id);
CREATE INDEX student_enrollments_school_id_idx ON public.student_enrollments USING btree (school_id);
CREATE INDEX student_enrollments_school_id_student_id_idx ON public.student_enrollments USING btree (school_id, student_id);
CREATE UNIQUE INDEX student_exit_records_clearance_id_key ON public.student_exit_records USING btree (clearance_id);
CREATE INDEX student_exit_records_school_id_idx ON public.student_exit_records USING btree (school_id);
CREATE INDEX student_exit_records_student_id_idx ON public.student_exit_records USING btree (student_id);
CREATE INDEX student_fee_accounts_school_id_idx ON public.student_fee_accounts USING btree (school_id);
CREATE INDEX student_fee_accounts_school_id_student_id_status_idx ON public.student_fee_accounts USING btree (school_id, student_id, status);
CREATE UNIQUE INDEX student_fee_accounts_student_id_key ON public.student_fee_accounts USING btree (student_id);
CREATE INDEX student_fee_credits_tenant_id_idx ON public.student_fee_credits USING btree (tenant_id);
CREATE INDEX student_fee_payment_allocations_tenant_id_idx ON public.student_fee_payment_allocations USING btree (tenant_id);
CREATE INDEX student_guardians_school_id_idx ON public.student_guardians USING btree (school_id);
CREATE UNIQUE INDEX student_guardians_school_id_student_id_guardian_id_key ON public.student_guardians USING btree (school_id, student_id, guardian_id);
CREATE INDEX student_guardians_school_id_student_id_idx ON public.student_guardians USING btree (school_id, student_id);
CREATE INDEX student_invoices_tenant_id_idx ON public.student_invoices USING btree (tenant_id);
CREATE UNIQUE INDEX student_notes_school_id_id_key ON public.student_notes USING btree (school_id, id);
CREATE INDEX student_notes_school_id_idx ON public.student_notes USING btree (school_id);
CREATE INDEX student_report_card_audit_logs_tenant_id_idx ON public.student_report_card_audit_logs USING btree (tenant_id);
CREATE INDEX student_report_cards_tenant_id_idx ON public.student_report_cards USING btree (tenant_id);
CREATE INDEX student_transport_assignments_school_id_idx ON public.student_transport_assignments USING btree (school_id);
CREATE UNIQUE INDEX students_school_id_admission_number_key ON public.students USING btree (school_id, admission_number);
CREATE INDEX students_school_id_current_class_id_idx ON public.students USING btree (school_id, current_class_id);
CREATE INDEX students_school_id_idx ON public.students USING btree (school_id);
CREATE UNIQUE INDEX students_school_id_nemis_number_key ON public.students USING btree (school_id, nemis_number);
CREATE UNIQUE INDEX students_school_id_upi_number_key ON public.students USING btree (school_id, upi_number);
CREATE INDEX sub_strands_school_id_idx ON public.sub_strands USING btree (school_id);
CREATE INDEX subjects_school_id_idx ON public.subjects USING btree (school_id);
CREATE INDEX subscriptions_tenant_id_idx ON public.subscriptions USING btree (tenant_id);
CREATE INDEX supplier_invoices_tenant_id_idx ON public.supplier_invoices USING btree (tenant_id);
CREATE INDEX suppliers_school_id_idx ON public.suppliers USING btree (school_id);
CREATE INDEX support_attachments_tenant_id_idx ON public.support_attachments USING btree (tenant_id);
CREATE INDEX support_categories_tenant_id_idx ON public.support_categories USING btree (tenant_id);
CREATE INDEX support_internal_notes_tenant_id_idx ON public.support_internal_notes USING btree (tenant_id);
CREATE INDEX support_kb_articles_tenant_id_idx ON public.support_kb_articles USING btree (tenant_id);
CREATE INDEX support_messages_tenant_id_idx ON public.support_messages USING btree (tenant_id);
CREATE INDEX support_notifications_tenant_id_idx ON public.support_notifications USING btree (tenant_id);
CREATE INDEX support_status_logs_tenant_id_idx ON public.support_status_logs USING btree (tenant_id);
CREATE INDEX support_status_notification_attempts_tenant_id_idx ON public.support_status_notification_attempts USING btree (tenant_id);
CREATE INDEX support_status_subscriptions_tenant_id_idx ON public.support_status_subscriptions USING btree (tenant_id);
CREATE INDEX support_status_unsubscribe_tokens_tenant_id_idx ON public.support_status_unsubscribe_tokens USING btree (tenant_id);
CREATE INDEX support_system_components_tenant_id_idx ON public.support_system_components USING btree (tenant_id);
CREATE INDEX support_tickets_tenant_id_idx ON public.support_tickets USING btree (tenant_id);
CREATE INDEX sync_conflicts_school_id_idx ON public.sync_conflicts USING btree (school_id);
CREATE INDEX sync_cursors_tenant_id_idx ON public.sync_cursors USING btree (tenant_id);
CREATE INDEX sync_devices_tenant_id_idx ON public.sync_devices USING btree (tenant_id);
CREATE INDEX sync_operation_logs_tenant_id_idx ON public.sync_operation_logs USING btree (tenant_id);
CREATE INDEX system_health_logs_school_id_idx ON public.system_health_logs USING btree (school_id);
CREATE INDEX system_jobs_school_id_idx ON public.system_jobs USING btree (school_id);
CREATE INDEX tasks_tenant_id_idx ON public.tasks USING btree (tenant_id);
CREATE INDEX teacher_attendance_logs_tenant_id_idx ON public.teacher_attendance_logs USING btree (tenant_id);
CREATE INDEX teacher_subject_assignments_school_id_class_id_idx ON public.teacher_subject_assignments USING btree (school_id, class_id);
CREATE INDEX teacher_subject_assignments_school_id_idx ON public.teacher_subject_assignments USING btree (school_id);
CREATE INDEX teacher_subject_assignments_school_id_teacher_user_id_idx ON public.teacher_subject_assignments USING btree (school_id, teacher_user_id);
CREATE INDEX tenant_bank_accounts_tenant_id_idx ON public.tenant_bank_accounts USING btree (tenant_id);
CREATE INDEX tenant_domains_tenant_id_idx ON public.tenant_domains USING btree (tenant_id);
CREATE INDEX tenant_finance_summary_tenant_id_idx ON public.tenant_finance_summary USING btree (tenant_id);
CREATE INDEX tenant_financial_accounts_tenant_id_idx ON public.tenant_financial_accounts USING btree (tenant_id);
CREATE INDEX tenant_mpesa_configs_tenant_id_idx ON public.tenant_mpesa_configs USING btree (tenant_id);
CREATE INDEX tenant_payment_channels_tenant_id_idx ON public.tenant_payment_channels USING btree (tenant_id);
CREATE INDEX tenant_pending_waivers_tenant_id_idx ON public.tenant_pending_waivers USING btree (tenant_id);
CREATE INDEX tenants_tenant_id_idx ON public.tenants USING btree (tenant_id);
CREATE INDEX terms_school_id_academic_year_id_idx ON public.terms USING btree (school_id, academic_year_id);
CREATE UNIQUE INDEX terms_school_id_academic_year_id_term_number_key ON public.terms USING btree (school_id, academic_year_id, term_number);
CREATE INDEX terms_school_id_idx ON public.terms USING btree (school_id);
CREATE INDEX timetable_audit_logs_tenant_id_idx ON public.timetable_audit_logs USING btree (tenant_id);
CREATE INDEX timetable_periods_school_id_idx ON public.timetable_periods USING btree (school_id);
CREATE INDEX timetable_slots_tenant_id_idx ON public.timetable_slots USING btree (tenant_id);
CREATE INDEX timetable_versions_tenant_id_idx ON public.timetable_versions USING btree (tenant_id);
CREATE INDEX transactions_tenant_id_idx ON public.transactions USING btree (tenant_id);
CREATE UNIQUE INDEX transactions_tenant_id_reference_key ON public.transactions USING btree (tenant_id, reference);
CREATE INDEX transport_audit_logs_tenant_id_idx ON public.transport_audit_logs USING btree (tenant_id);
CREATE INDEX transport_drivers_tenant_id_idx ON public.transport_drivers USING btree (tenant_id);
CREATE INDEX transport_manifest_students_tenant_id_idx ON public.transport_manifest_students USING btree (tenant_id);
CREATE INDEX transport_manifests_tenant_id_idx ON public.transport_manifests USING btree (tenant_id);
CREATE INDEX transport_route_stops_tenant_id_idx ON public.transport_route_stops USING btree (tenant_id);
CREATE UNIQUE INDEX transport_routes_name ON public.transport_routes USING btree (tenant_id, lower(name));
CREATE INDEX transport_routes_school_id_idx ON public.transport_routes USING btree (school_id);
CREATE INDEX transport_trip_events_tenant_id_idx ON public.transport_trip_events USING btree (tenant_id);
CREATE INDEX transport_trips_tenant_id_idx ON public.transport_trips USING btree (tenant_id);
CREATE INDEX transport_vehicles_school_id_idx ON public.transport_vehicles USING btree (school_id);
CREATE UNIQUE INDEX uq_academic_years_tenant_name ON public.academic_years USING btree (tenant_id, name);
CREATE UNIQUE INDEX uq_academics_attendance_settings_tenant_name ON public.academics_attendance_settings USING btree (tenant_id, name);
CREATE UNIQUE INDEX uq_academics_grading_systems_tenant_name ON public.academics_grading_systems USING btree (tenant_id, name);
CREATE UNIQUE INDEX uq_academics_report_card_settings_tenant_name ON public.academics_report_card_settings USING btree (tenant_id, name);
CREATE UNIQUE INDEX uq_boarding_allocations_active_bed ON public.boarding_allocations USING btree (tenant_id, bed_id) WHERE (status = 'active'::text);
CREATE UNIQUE INDEX uq_boarding_allocations_active_student ON public.boarding_allocations USING btree (tenant_id, student_id) WHERE (status = 'active'::text);
CREATE UNIQUE INDEX uq_chemical_items_submission ON public.chemical_items USING btree (tenant_id, submission_id) WHERE (submission_id IS NOT NULL);
CREATE UNIQUE INDEX uq_exam_marks_scope ON public.exam_marks USING btree (tenant_id, assessment_id, student_id);
CREATE UNIQUE INDEX uq_lab_breakage_loss_submission ON public.lab_breakage_loss_records USING btree (tenant_id, submission_id) WHERE (submission_id IS NOT NULL);
CREATE UNIQUE INDEX uq_lab_equipment_submission ON public.lab_equipment USING btree (tenant_id, submission_id) WHERE (submission_id IS NOT NULL);
CREATE UNIQUE INDEX uq_lab_issue_records_submission ON public.lab_issue_records USING btree (tenant_id, submission_id) WHERE (submission_id IS NOT NULL);
CREATE UNIQUE INDEX uq_lab_practical_requests_submission ON public.lab_practical_requests USING btree (tenant_id, submission_id) WHERE (submission_id IS NOT NULL);
CREATE UNIQUE INDEX uq_lab_safety_checks_submission ON public.lab_safety_checks USING btree (tenant_id, submission_id) WHERE (submission_id IS NOT NULL);
CREATE UNIQUE INDEX uq_lab_stock_movements_submission ON public.lab_stock_movements USING btree (tenant_id, submission_id) WHERE (submission_id IS NOT NULL);
CREATE UNIQUE INDEX uq_lab_stocktakes_submission ON public.lab_stocktakes USING btree (tenant_id, submission_id) WHERE (submission_id IS NOT NULL);
CREATE UNIQUE INDEX uq_subjects_tenant_code ON public.subjects USING btree (tenant_id, code);
CREATE UNIQUE INDEX uq_teacher_subject_assignments_active_scope ON public.teacher_subject_assignments USING btree (tenant_id, COALESCE(academic_term_id, ''::text), class_section_id, subject_id, COALESCE(stream_id, ''::text), teacher_user_id) WHERE (status = 'active'::text);
CREATE UNIQUE INDEX uq_tenant_domains_domain ON public.tenant_domains USING btree (domain);
CREATE UNIQUE INDEX uq_tenant_domains_tenant_id_domain ON public.tenant_domains USING btree (tenant_id, domain);
CREATE UNIQUE INDEX uq_tenants_tenant_id ON public.tenants USING btree (tenant_id);
CREATE UNIQUE INDEX uq_timetable_versions_active_status ON public.timetable_versions USING btree (tenant_id, academic_year, term_name, status) WHERE (status = ANY (ARRAY['draft'::text, 'published'::text]));
CREATE INDEX usage_records_tenant_id_idx ON public.usage_records USING btree (tenant_id);
CREATE INDEX user_permission_overrides_school_id_idx ON public.user_permission_overrides USING btree (school_id);
CREATE INDEX user_permission_overrides_user_id_idx ON public.user_permission_overrides USING btree (user_id);
CREATE UNIQUE INDEX user_permission_overrides_user_id_school_id_permission_id_key ON public.user_permission_overrides USING btree (user_id, school_id, permission_id);
CREATE INDEX user_roles_school_id_idx ON public.user_roles USING btree (school_id);
CREATE INDEX user_roles_school_id_user_id_idx ON public.user_roles USING btree (school_id, user_id);
CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);
CREATE UNIQUE INDEX users_phone_key ON public.users USING btree (phone);
CREATE UNIQUE INDEX ux_academics_class_teachers_scope ON public.academics_class_teachers USING btree (tenant_id, academic_year_id, class_section_id) WHERE (is_active = true);
CREATE UNIQUE INDEX ux_academics_department_hod_active ON public.academics_department_hod_appointments USING btree (tenant_id, department_id) WHERE (status = 'active'::text);
CREATE UNIQUE INDEX ux_academics_role_appointments_active ON public.academics_role_appointments USING btree (tenant_id, role_type, COALESCE((department_id)::text, ''::text), COALESCE(academic_year_id, ''::text), COALESCE(class_section_id, ''::text), COALESCE(stream_id, ''::text)) WHERE (status = 'active'::text);
CREATE UNIQUE INDEX ux_admission_drafts_owner ON public.admission_drafts USING btree (tenant_id, created_by_user_id);
CREATE UNIQUE INDEX ux_auth_action_tokens_hash ON public.auth_action_tokens USING btree (token_hash);
CREATE UNIQUE INDEX ux_class_streams_tenant_class_id ON public.class_streams USING btree (tenant_id, class_section_id, id);
CREATE UNIQUE INDEX ux_clinic_medicines_name_brand ON public.clinic_medicines USING btree (tenant_id, lower(medicine_name), COALESCE(lower(brand_name), ''::text));
CREATE UNIQUE INDEX ux_communication_sms_outbox_tenant_dispatch_key ON public.communication_sms_outbox USING btree (tenant_id, dispatch_key);
CREATE UNIQUE INDEX ux_dashboard_approvals_tenant_key ON public.dashboard_approval_requests USING btree (tenant_id, approval_key);
CREATE UNIQUE INDEX ux_exam_assessments_scope ON public.exam_assessments USING btree (tenant_id, exam_series_id, subject_id, name);
CREATE UNIQUE INDEX ux_exam_attendance_tenant_slot_student ON public.exam_attendance_records USING btree (tenant_id, timetable_slot_id, student_id);
CREATE UNIQUE INDEX ux_exam_invigilators_tenant_slot_staff ON public.exam_invigilators USING btree (tenant_id, timetable_slot_id, staff_user_id);
CREATE UNIQUE INDEX ux_exam_mark_entry_windows_scope ON public.exam_mark_entry_windows USING btree (tenant_id, exam_series_id, subject_id, class_section_id);
CREATE UNIQUE INDEX ux_fee_structures_active_scope ON public.fee_structures USING btree (tenant_id, academic_year, term, grade_level, COALESCE(class_name, ''::text)) WHERE (status = 'active'::text);
CREATE UNIQUE INDEX ux_library_copies_tenant_barcode ON public.library_copies USING btree (tenant_id, barcode) WHERE (barcode IS NOT NULL);
CREATE UNIQUE INDEX ux_library_copies_tenant_qr_code ON public.library_copies USING btree (tenant_id, qr_code) WHERE (qr_code IS NOT NULL);
CREATE UNIQUE INDEX ux_manual_fee_payment_allocations_invoice_once ON public.manual_fee_payment_allocations USING btree (tenant_id, manual_payment_id, invoice_id, allocation_type) WHERE (invoice_id IS NOT NULL);
CREATE UNIQUE INDEX ux_module_registry_code ON public.module_registry USING btree (code);
CREATE UNIQUE INDEX ux_monitoring_service_accounts_token_hash ON public.monitoring_service_accounts USING btree (token_hash);
CREATE UNIQUE INDEX ux_mpesa_callback_channels_current_channel_environment ON public.mpesa_callback_channels USING btree (tenant_id, channel_id, environment) WHERE ((disabled_at IS NULL) AND (is_current = true));
CREATE UNIQUE INDEX ux_mpesa_callback_channels_secret_hash ON public.mpesa_callback_channels USING btree (tenant_id, channel_id, environment, callback_secret_hash) WHERE (disabled_at IS NULL);
CREATE UNIQUE INDEX ux_mpesa_transactions_tenant_receipt_number ON public.mpesa_transactions USING btree (tenant_id, mpesa_receipt_number) WHERE (mpesa_receipt_number IS NOT NULL);
CREATE UNIQUE INDEX ux_mpesa_transactions_transaction_id ON public.mpesa_transactions USING btree (transaction_id) WHERE (transaction_id IS NOT NULL);
CREATE UNIQUE INDEX ux_notifications_tenant_notification_key ON public.notifications USING btree (tenant_id, notification_key);
CREATE UNIQUE INDEX ux_parent_guardians_school_phone ON public.parent_guardians USING btree (school_id, phone);
CREATE UNIQUE INDEX ux_payment_intents_checkout_request_id ON public.payment_intents USING btree (checkout_request_id) WHERE (checkout_request_id IS NOT NULL);
CREATE UNIQUE INDEX ux_payment_intents_merchant_request_id ON public.payment_intents USING btree (merchant_request_id) WHERE (merchant_request_id IS NOT NULL);
CREATE UNIQUE INDEX ux_permissions_tenant_resource_action ON public.permissions USING btree (tenant_id, resource, action);
CREATE UNIQUE INDEX ux_platform_sms_default_provider ON public.platform_sms_providers USING btree (is_default) WHERE (is_default = true);
CREATE UNIQUE INDEX ux_report_card_artifacts_verification_code_type ON public.report_card_artifacts USING btree (tenant_id, verification_code, artifact_type);
CREATE UNIQUE INDEX ux_role_permissions_tenant_role_permission ON public.role_permissions USING btree (tenant_id, role_id, permission_id);
CREATE UNIQUE INDEX ux_roles_tenant_code ON public.roles USING btree (tenant_id, code);
CREATE UNIQUE INDEX ux_roles_tenant_id_id ON public.roles USING btree (tenant_id, id);
CREATE UNIQUE INDEX ux_school_module_access_tenant_id ON public.school_module_access USING btree (tenant_id, id);
CREATE UNIQUE INDEX ux_school_module_access_tenant_module ON public.school_module_access USING btree (tenant_id, module_id);
CREATE UNIQUE INDEX ux_staff_departments_tenant_lower_name ON public.staff_departments USING btree (tenant_id, lower(name));
CREATE UNIQUE INDEX ux_staff_profiles_tenant_user ON public.staff_profiles USING btree (tenant_id, user_id) WHERE (user_id IS NOT NULL);
CREATE UNIQUE INDEX ux_student_class_assignments_active_year ON public.student_class_assignments USING btree (tenant_id, student_id, academic_year_id) WHERE (status = 'active'::text);
CREATE UNIQUE INDEX ux_student_guardians_student_email ON public.student_guardians USING btree (tenant_id, student_id, lower(email));
CREATE UNIQUE INDEX ux_student_guardians_student_phone ON public.student_guardians USING btree (tenant_id, student_id, normalized_phone) WHERE (normalized_phone IS NOT NULL);
CREATE UNIQUE INDEX ux_student_portal_access_username ON public.student_portal_access USING btree (tenant_id, lower(username));
CREATE UNIQUE INDEX ux_student_report_cards_current_revision ON public.student_report_cards USING btree (tenant_id, exam_series_id, student_id) WHERE is_current;
CREATE UNIQUE INDEX ux_student_subject_enrollments_canonical_active ON public.student_subject_enrollments USING btree (tenant_id, student_id, academic_year_id, subject_id) WHERE ((status = 'active'::text) AND (academic_year_id IS NOT NULL) AND (subject_id IS NOT NULL));
CREATE UNIQUE INDEX ux_subscriptions_single_mutable_state ON public.subscriptions USING btree (tenant_id) WHERE (status = ANY (ARRAY['trialing'::text, 'active'::text, 'past_due'::text, 'restricted'::text, 'suspended'::text]));
CREATE UNIQUE INDEX ux_tasks_tenant_task_key ON public.tasks USING btree (tenant_id, task_key);
CREATE UNIQUE INDEX ux_tenant_financial_accounts_active_tenant ON public.tenant_financial_accounts USING btree (tenant_id) WHERE (status = 'active'::text);
CREATE UNIQUE INDEX ux_tenant_memberships_tenant_user ON public.tenant_memberships USING btree (tenant_id, user_id);
CREATE UNIQUE INDEX ux_tenant_mpesa_configs_active_shortcode ON public.tenant_mpesa_configs USING btree (shortcode) WHERE (status = 'active'::text);
CREATE UNIQUE INDEX ux_tenant_mpesa_configs_active_tenant_environment_channel ON public.tenant_mpesa_configs USING btree (tenant_id, environment, COALESCE(paybill_number, ''::text), COALESCE(till_number, ''::text)) WHERE (status = 'active'::text);
CREATE UNIQUE INDEX ux_tenant_mpesa_configs_tenant_shortcode ON public.tenant_mpesa_configs USING btree (tenant_id, shortcode);
CREATE UNIQUE INDEX ux_tenant_payment_channels_active_mpesa_config ON public.tenant_payment_channels USING btree (tenant_id, mpesa_config_id) WHERE ((status = 'active'::text) AND (mpesa_config_id IS NOT NULL));
CREATE UNIQUE INDEX ux_timetable_relief_active_slot_date ON public.timetable_relief_assignments USING btree (tenant_id, slot_id, relief_date) WHERE (status = 'assigned'::text);
CREATE UNIQUE INDEX ux_timetable_requirement_scope ON public.timetable_subject_requirements USING btree (tenant_id, academic_year, term_name, class_section_id, subject_id, COALESCE(stream_id, ''::text), COALESCE(teacher_id, ''::text), COALESCE(parallel_key, ''::text));
CREATE UNIQUE INDEX ux_transport_vehicles_tenant_id_id ON public.transport_vehicles USING btree (tenant_id, id);
CREATE UNIQUE INDEX ux_user_roles_active_assignment ON public.user_roles USING btree (tenant_id, user_id, role_id, scope_type, COALESCE(scope_id, ''::text)) WHERE ((status = 'ACTIVE'::text) AND (deleted_at IS NULL));
CREATE UNIQUE INDEX ux_users_email ON public.users USING btree (lower(email));
CREATE UNIQUE INDEX ux_users_single_platform_owner ON public.users USING btree (user_type) WHERE ((user_type = 'platform_owner'::text) AND (status = 'active'::text));
CREATE INDEX v2_counselling_sessions_school_id_idx ON public.v2_counselling_sessions USING btree (school_id);
CREATE INDEX v2_discipline_actions_school_id_idx ON public.v2_discipline_actions USING btree (school_id);
CREATE INDEX vehicle_fuel_logs_school_id_idx ON public.vehicle_fuel_logs USING btree (school_id);
CREATE INDEX vehicle_service_logs_tenant_id_idx ON public.vehicle_service_logs USING btree (tenant_id);
CREATE INDEX visitor_logs_school_id_idx ON public.visitor_logs USING btree (school_id);
CREATE INDEX visitors_appointments_tenant_id_idx ON public.visitors_appointments USING btree (tenant_id);
CREATE INDEX visitors_logs_tenant_id_idx ON public.visitors_logs USING btree (tenant_id);
CREATE INDEX visitors_school_id_idx ON public.visitors USING btree (school_id);
CREATE INDEX welfare_concerns_school_id_idx ON public.welfare_concerns USING btree (school_id);
CREATE INDEX workflow_events_tenant_id_idx ON public.workflow_events USING btree (tenant_id);
CREATE INDEX workflow_tasks_school_id_idx ON public.workflow_tasks USING btree (school_id);
CREATE TRIGGER trg_academic_class_sections_set_updated_at BEFORE UPDATE ON public.academic_class_sections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_academic_subject_offerings_set_updated_at BEFORE UPDATE ON public.academic_subject_offerings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_academic_timetable_slots_set_updated_at BEFORE UPDATE ON public.academic_timetable_slots FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_accounts_set_updated_at BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_admission_applications_set_updated_at BEFORE UPDATE ON public.admission_applications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_admission_appointments_set_updated_at BEFORE UPDATE ON public.admission_appointments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_admission_documents_set_updated_at BEFORE UPDATE ON public.admission_documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_admission_drafts_set_updated_at BEFORE UPDATE ON public.admission_drafts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_admission_enquiries_set_updated_at BEFORE UPDATE ON public.admission_enquiries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_admission_interviews_set_updated_at BEFORE UPDATE ON public.admission_interviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_admission_offers_set_updated_at BEFORE UPDATE ON public.admission_offers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_admission_settings_set_updated_at BEFORE UPDATE ON public.admission_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_admission_tasks_set_updated_at BEFORE UPDATE ON public.admission_tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_admission_templates_set_updated_at BEFORE UPDATE ON public.admission_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_attendance_records_set_updated_at BEFORE UPDATE ON public.attendance_records FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_audit_logs_set_updated_at BEFORE UPDATE ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_auth_action_tokens_set_updated_at BEFORE UPDATE ON public.auth_action_tokens FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_auth_email_outbox_set_updated_at BEFORE UPDATE ON public.auth_email_outbox FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_auth_mfa_challenges_set_updated_at BEFORE UPDATE ON public.auth_mfa_challenges FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_auth_trusted_devices_set_updated_at BEFORE UPDATE ON public.auth_trusted_devices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_behavior_improvement_plan_steps_set_updated_at BEFORE UPDATE ON public.behavior_improvement_plan_steps FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_behavior_improvement_plans_set_updated_at BEFORE UPDATE ON public.behavior_improvement_plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_behavior_points_prevent_mutation BEFORE DELETE OR UPDATE ON public.behavior_points FOR EACH ROW EXECUTE FUNCTION app.prevent_discipline_audit_mutation();
CREATE TRIGGER trg_billing_notifications_set_updated_at BEFORE UPDATE ON public.billing_notifications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_breach_response_reports_set_updated_at BEFORE UPDATE ON public.breach_response_reports FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_callback_logs_set_updated_at BEFORE UPDATE ON public.callback_logs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_child_data_dpia_records_set_updated_at BEFORE UPDATE ON public.child_data_dpia_records FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_clinic_stock_movements_append_only_delete BEFORE DELETE ON public.clinic_stock_movements FOR EACH ROW EXECUTE FUNCTION public.prevent_clinic_stock_movement_mutation();
CREATE TRIGGER trg_clinic_stock_movements_append_only_update BEFORE UPDATE ON public.clinic_stock_movements FOR EACH ROW EXECUTE FUNCTION public.prevent_clinic_stock_movement_mutation();
CREATE TRIGGER trg_commendations_set_updated_at BEFORE UPDATE ON public.commendations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_consent_records_set_updated_at BEFORE UPDATE ON public.consent_records FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_counselling_notes_set_updated_at BEFORE UPDATE ON public.counselling_notes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_counselling_referrals_set_updated_at BEFORE UPDATE ON public.counselling_referrals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_counselling_sessions_set_updated_at BEFORE UPDATE ON public.counselling_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_dashboard_approvals_updated_at BEFORE UPDATE ON public.dashboard_approval_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_dashboard_summary_snapshots_set_updated_at BEFORE UPDATE ON public.dashboard_summary_snapshots FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_data_retention_schedules_set_updated_at BEFORE UPDATE ON public.data_retention_schedules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_data_subject_requests_set_updated_at BEFORE UPDATE ON public.data_subject_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_discipline_actions_set_updated_at BEFORE UPDATE ON public.discipline_actions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_discipline_audit_logs_prevent_mutation BEFORE DELETE OR UPDATE ON public.discipline_audit_logs FOR EACH ROW EXECUTE FUNCTION app.prevent_discipline_audit_mutation();
CREATE TRIGGER trg_discipline_comments_set_updated_at BEFORE UPDATE ON public.discipline_comments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_discipline_document_templates_set_updated_at BEFORE UPDATE ON public.discipline_document_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_discipline_incidents_set_updated_at BEFORE UPDATE ON public.discipline_incidents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_discipline_notifications_set_updated_at BEFORE UPDATE ON public.discipline_notifications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_event_consumer_runs_set_updated_at BEFORE UPDATE ON public.event_consumer_runs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_event_consumer_runs_sync_school_columns BEFORE INSERT OR UPDATE ON public.event_consumer_runs FOR EACH ROW EXECUTE FUNCTION public.sync_event_school_columns();
CREATE TRIGGER trg_fee_structures_set_updated_at BEFORE UPDATE ON public.fee_structures FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_file_objects_set_updated_at BEFORE UPDATE ON public.file_objects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_finance_approval_requests_set_updated_at BEFORE UPDATE ON public.finance_approval_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_finance_close_periods_set_updated_at BEFORE UPDATE ON public.finance_close_periods FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_finance_fee_categories_set_updated_at BEFORE UPDATE ON public.finance_fee_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_guardian_profiles_set_updated_at BEFORE UPDATE ON public.guardian_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_idempotency_keys_set_updated_at BEFORE UPDATE ON public.idempotency_keys FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_inventory_backorders_set_updated_at BEFORE UPDATE ON public.inventory_request_backorders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_inventory_categories_set_updated_at BEFORE UPDATE ON public.inventory_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_inventory_incidents_set_updated_at BEFORE UPDATE ON public.inventory_incidents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_inventory_item_balances_set_updated_at BEFORE UPDATE ON public.inventory_item_balances FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_inventory_items_set_updated_at BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_inventory_locations_set_updated_at BEFORE UPDATE ON public.inventory_locations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_inventory_movements_prevent_mutation BEFORE DELETE OR UPDATE ON public.inventory_stock_movements FOR EACH ROW EXECUTE FUNCTION public.prevent_inventory_movement_mutation();
CREATE TRIGGER trg_inventory_movements_set_updated_at BEFORE UPDATE ON public.inventory_stock_movements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_inventory_po_set_updated_at BEFORE UPDATE ON public.inventory_purchase_orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_inventory_requests_set_updated_at BEFORE UPDATE ON public.inventory_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_inventory_reservations_set_updated_at BEFORE UPDATE ON public.inventory_reservations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_inventory_stock_counts_set_updated_at BEFORE UPDATE ON public.inventory_stock_count_snapshots FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_inventory_suppliers_set_updated_at BEFORE UPDATE ON public.inventory_suppliers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_inventory_transfers_set_updated_at BEFORE UPDATE ON public.inventory_transfers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_invoices_set_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_ledger_entries_prevent_update BEFORE DELETE OR UPDATE ON public.ledger_entries FOR EACH ROW EXECUTE FUNCTION app.prevent_append_only_mutation();
CREATE CONSTRAINT TRIGGER trg_ledger_entries_validate_balance AFTER INSERT ON public.ledger_entries DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION app.validate_financial_transaction_balance();
CREATE TRIGGER trg_library_circulation_ledger_prevent_mutation BEFORE DELETE OR UPDATE ON public.library_circulation_ledger FOR EACH ROW EXECUTE FUNCTION public.prevent_library_ledger_mutation();
CREATE TRIGGER trg_manual_fee_allocations_prevent_update BEFORE DELETE OR UPDATE ON public.manual_fee_payment_allocations FOR EACH ROW EXECUTE FUNCTION app.prevent_append_only_mutation();
CREATE TRIGGER trg_manual_fee_payments_set_updated_at BEFORE UPDATE ON public.manual_fee_payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_monitoring_service_accounts_set_updated_at BEFORE UPDATE ON public.monitoring_service_accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_mpesa_c2b_payments_set_updated_at BEFORE UPDATE ON public.mpesa_c2b_payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_mpesa_payload_vault_set_updated_at BEFORE UPDATE ON public.mpesa_payload_vault FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_mpesa_reconciliation_batches_set_updated_at BEFORE UPDATE ON public.mpesa_reconciliation_batches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_mpesa_reconciliation_discrepancies_set_updated_at BEFORE UPDATE ON public.mpesa_reconciliation_discrepancies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_mpesa_transactions_set_updated_at BEFORE UPDATE ON public.mpesa_transactions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_mpesa_verification_jobs_set_updated_at BEFORE UPDATE ON public.mpesa_verification_jobs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_notifications_set_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_offense_categories_set_updated_at BEFORE UPDATE ON public.offense_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_outbox_events_set_updated_at BEFORE UPDATE ON public.outbox_events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_outbox_events_sync_school_columns BEFORE INSERT OR UPDATE ON public.outbox_events FOR EACH ROW EXECUTE FUNCTION public.sync_event_school_columns();
CREATE TRIGGER trg_parent_guardians_set_updated_at BEFORE UPDATE ON public.parent_guardians FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_payment_intents_set_updated_at BEFORE UPDATE ON public.payment_intents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_permissions_set_updated_at BEFORE UPDATE ON public.permissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_platform_backups_set_updated_at BEFORE UPDATE ON public.platform_backups FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_platform_broadcasts_set_updated_at BEFORE UPDATE ON public.platform_broadcasts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_platform_payment_gateways_set_updated_at BEFORE UPDATE ON public.platform_payment_gateways FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_platform_security_policies_set_updated_at BEFORE UPDATE ON public.platform_security_policies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_platform_settings_set_updated_at BEFORE UPDATE ON public.platform_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_platform_templates_set_updated_at BEFORE UPDATE ON public.platform_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_report_snapshot_audit_logs_prevent_mutation BEFORE DELETE OR UPDATE ON public.report_snapshot_audit_logs FOR EACH ROW EXECUTE FUNCTION public.prevent_report_snapshot_mutation();
CREATE TRIGGER trg_report_snapshots_prevent_mutation BEFORE DELETE OR UPDATE ON public.report_snapshots FOR EACH ROW EXECUTE FUNCTION public.prevent_report_snapshot_mutation();
CREATE TRIGGER trg_report_snapshots_set_updated_at BEFORE UPDATE ON public.report_snapshots FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_role_permissions_set_updated_at BEFORE UPDATE ON public.role_permissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_roles_set_updated_at BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_student_academic_enrollments_set_updated_at BEFORE UPDATE ON public.student_academic_enrollments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_student_academic_enrollments_validate_section BEFORE INSERT OR UPDATE OF tenant_id, class_section_id ON public.student_academic_enrollments FOR EACH ROW EXECUTE FUNCTION public.validate_admissions_class_section_reference();
CREATE TRIGGER trg_student_academic_lifecycle_validate_section BEFORE INSERT OR UPDATE OF tenant_id, to_class_section_id ON public.student_academic_lifecycle_events FOR EACH ROW EXECUTE FUNCTION public.validate_admissions_class_section_reference();
CREATE TRIGGER trg_student_allocations_set_updated_at BEFORE UPDATE ON public.student_allocations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_student_fee_allocations_prevent_update BEFORE DELETE OR UPDATE ON public.student_fee_payment_allocations FOR EACH ROW EXECUTE FUNCTION app.prevent_append_only_mutation();
CREATE TRIGGER trg_student_fee_assignments_set_updated_at BEFORE UPDATE ON public.student_fee_assignments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_student_fee_credits_set_updated_at BEFORE UPDATE ON public.student_fee_credits FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_student_fee_invoices_set_updated_at BEFORE UPDATE ON public.student_fee_invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_student_fee_structures_set_updated_at BEFORE UPDATE ON public.student_fee_structures FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_student_guardians_set_updated_at BEFORE UPDATE ON public.student_guardians FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_student_portal_access_set_updated_at BEFORE UPDATE ON public.student_portal_access FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_student_subject_enrollments_set_updated_at BEFORE UPDATE ON public.student_subject_enrollments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_student_timetable_enrollments_set_updated_at BEFORE UPDATE ON public.student_timetable_enrollments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_student_transfer_records_set_updated_at BEFORE UPDATE ON public.student_transfer_records FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_students_set_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_students_sync_tenant_columns BEFORE INSERT OR UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.sync_student_tenant_columns();
CREATE TRIGGER trg_subscriptions_set_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_support_agents_set_updated_at BEFORE UPDATE ON public.support_agents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_support_attachments_set_updated_at BEFORE UPDATE ON public.support_attachments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_support_categories_set_updated_at BEFORE UPDATE ON public.support_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_support_incidents_set_updated_at BEFORE UPDATE ON public.support_incidents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_support_internal_notes_set_updated_at BEFORE UPDATE ON public.support_internal_notes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_support_kb_articles_set_updated_at BEFORE UPDATE ON public.support_kb_articles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_support_messages_set_updated_at BEFORE UPDATE ON public.support_messages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_support_notifications_set_updated_at BEFORE UPDATE ON public.support_notifications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_support_status_logs_set_updated_at BEFORE UPDATE ON public.support_status_logs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_support_status_notification_attempts_set_updated_at BEFORE UPDATE ON public.support_status_notification_attempts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_support_status_subscriptions_set_updated_at BEFORE UPDATE ON public.support_status_subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_support_status_unsubscribe_tokens_set_updated_at BEFORE UPDATE ON public.support_status_unsubscribe_tokens FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_support_system_components_set_updated_at BEFORE UPDATE ON public.support_system_components FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_support_tickets_set_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_sync_cursors_set_updated_at BEFORE UPDATE ON public.sync_cursors FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_sync_devices_set_updated_at BEFORE UPDATE ON public.sync_devices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_sync_operation_logs_prevent_update BEFORE DELETE OR UPDATE ON public.sync_operation_logs FOR EACH ROW EXECUTE FUNCTION app.prevent_append_only_mutation();
CREATE TRIGGER trg_tasks_set_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_tenant_bank_accounts_set_updated_at BEFORE UPDATE ON public.tenant_bank_accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_tenant_domains_set_updated_at BEFORE UPDATE ON public.tenant_domains FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_tenant_financial_accounts_set_updated_at BEFORE UPDATE ON public.tenant_financial_accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_tenant_memberships_set_updated_at BEFORE UPDATE ON public.tenant_memberships FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_tenant_mpesa_configs_set_updated_at BEFORE UPDATE ON public.tenant_mpesa_configs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_tenant_payment_channels_set_updated_at BEFORE UPDATE ON public.tenant_payment_channels FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_tenants_set_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_transactions_finance_period_open BEFORE INSERT ON public.transactions FOR EACH ROW EXECUTE FUNCTION app.ensure_finance_period_open();
CREATE TRIGGER trg_transactions_prevent_update BEFORE DELETE OR UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION app.prevent_append_only_mutation();
CREATE TRIGGER trg_usage_records_prevent_update BEFORE DELETE OR UPDATE ON public.usage_records FOR EACH ROW EXECUTE FUNCTION app.prevent_append_only_mutation();
CREATE TRIGGER trg_user_roles_set_updated_at BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_users_set_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_workflow_events_updated_at BEFORE UPDATE ON public.workflow_events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE ONLY public.academic_levels
    ADD CONSTRAINT academic_levels_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.academic_years
    ADD CONSTRAINT academic_years_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.academics_assignments
    ADD CONSTRAINT academics_assignments_class_section_id_fkey FOREIGN KEY (class_section_id) REFERENCES public.classes(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE ONLY public.academics_assignments
    ADD CONSTRAINT academics_assignments_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.academics_class_teachers
    ADD CONSTRAINT academics_class_teachers_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.academics_lesson_logs
    ADD CONSTRAINT academics_lesson_logs_class_section_id_fkey FOREIGN KEY (class_section_id) REFERENCES public.classes(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE ONLY public.academics_lesson_logs
    ADD CONSTRAINT academics_lesson_logs_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.academics_resources
    ADD CONSTRAINT academics_resources_class_section_id_fkey FOREIGN KEY (class_section_id) REFERENCES public.classes(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE ONLY public.academics_resources
    ADD CONSTRAINT academics_resources_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.admission_documents
    ADD CONSTRAINT admission_documents_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.admission_applications(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.admission_documents
    ADD CONSTRAINT admission_documents_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.admission_interviews
    ADD CONSTRAINT admission_interviews_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.admission_applications(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.admission_interviews
    ADD CONSTRAINT admission_interviews_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.approval_audit_logs
    ADD CONSTRAINT approval_audit_logs_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.approval_requests(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.approval_requests
    ADD CONSTRAINT approval_requests_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.approval_rules
    ADD CONSTRAINT approval_rules_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.asset_movements
    ADD CONSTRAINT asset_movements_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.asset_movements
    ADD CONSTRAINT asset_movements_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_attendance_session_id_fkey FOREIGN KEY (attendance_session_id) REFERENCES public.attendance_sessions(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.attendance_sessions
    ADD CONSTRAINT attendance_sessions_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.attendance_sessions
    ADD CONSTRAINT attendance_sessions_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.attendance_sessions
    ADD CONSTRAINT attendance_sessions_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.attendance_sessions
    ADD CONSTRAINT attendance_sessions_stream_id_fkey FOREIGN KEY (stream_id) REFERENCES public.streams(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.attendance_sessions
    ADD CONSTRAINT attendance_sessions_term_id_fkey FOREIGN KEY (term_id) REFERENCES public.terms(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE ONLY public.auth_mfa_challenges
    ADD CONSTRAINT auth_mfa_challenges_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.auth_trusted_devices
    ADD CONSTRAINT auth_trusted_devices_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.beds
    ADD CONSTRAINT beds_dormitory_id_fkey FOREIGN KEY (dormitory_id) REFERENCES public.dormitories(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.beds
    ADD CONSTRAINT beds_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.boarding_allocations
    ADD CONSTRAINT boarding_allocations_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.boarding_allocations
    ADD CONSTRAINT boarding_allocations_bed_id_fkey FOREIGN KEY (bed_id) REFERENCES public.beds(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.boarding_allocations
    ADD CONSTRAINT boarding_allocations_boarding_house_id_fkey FOREIGN KEY (boarding_house_id) REFERENCES public.boarding_houses(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.boarding_allocations
    ADD CONSTRAINT boarding_allocations_dormitory_id_fkey FOREIGN KEY (dormitory_id) REFERENCES public.dormitories(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.boarding_allocations
    ADD CONSTRAINT boarding_allocations_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.boarding_allocations
    ADD CONSTRAINT boarding_allocations_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.boarding_attendance
    ADD CONSTRAINT boarding_attendance_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.boarding_attendance
    ADD CONSTRAINT boarding_attendance_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.boarding_houses
    ADD CONSTRAINT boarding_houses_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.breach_response_reports
    ADD CONSTRAINT breach_response_reports_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.cbc_assessment_entries
    ADD CONSTRAINT cbc_assessment_entries_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.cbc_assessment_entries
    ADD CONSTRAINT cbc_assessment_entries_exam_cycle_id_fkey FOREIGN KEY (exam_cycle_id) REFERENCES public.exam_cycles(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.cbc_assessment_entries
    ADD CONSTRAINT cbc_assessment_entries_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.cbc_assessment_entries
    ADD CONSTRAINT cbc_assessment_entries_strand_id_fkey FOREIGN KEY (strand_id) REFERENCES public.strands(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.cbc_assessment_entries
    ADD CONSTRAINT cbc_assessment_entries_stream_id_fkey FOREIGN KEY (stream_id) REFERENCES public.streams(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE ONLY public.cbc_assessment_entries
    ADD CONSTRAINT cbc_assessment_entries_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.cbc_assessment_entries
    ADD CONSTRAINT cbc_assessment_entries_sub_strand_id_fkey FOREIGN KEY (sub_strand_id) REFERENCES public.sub_strands(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE ONLY public.child_data_dpia_records
    ADD CONSTRAINT child_data_dpia_records_approved_by_user_id_fkey FOREIGN KEY (approved_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.class_requests
    ADD CONSTRAINT class_requests_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.class_requests
    ADD CONSTRAINT class_requests_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.class_subjects
    ADD CONSTRAINT class_subjects_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.class_subjects
    ADD CONSTRAINT class_subjects_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.class_subjects
    ADD CONSTRAINT class_subjects_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.class_timetable_entries
    ADD CONSTRAINT class_timetable_entries_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.class_timetable_entries
    ADD CONSTRAINT class_timetable_entries_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.class_timetable_entries
    ADD CONSTRAINT class_timetable_entries_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.class_timetable_entries
    ADD CONSTRAINT class_timetable_entries_stream_id_fkey FOREIGN KEY (stream_id) REFERENCES public.streams(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.class_timetable_entries
    ADD CONSTRAINT class_timetable_entries_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE ONLY public.class_timetable_entries
    ADD CONSTRAINT class_timetable_entries_term_id_fkey FOREIGN KEY (term_id) REFERENCES public.terms(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_academic_level_id_fkey FOREIGN KEY (academic_level_id) REFERENCES public.academic_levels(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.communication_broadcasts
    ADD CONSTRAINT communication_broadcasts_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.communication_broadcasts
    ADD CONSTRAINT communication_broadcasts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;
ALTER TABLE ONLY public.computer_lab_pcs
    ADD CONSTRAINT computer_lab_pcs_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE ONLY public.computer_lab_pcs
    ADD CONSTRAINT computer_lab_pcs_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.computer_lab_sessions
    ADD CONSTRAINT computer_lab_sessions_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.computer_lab_sessions
    ADD CONSTRAINT computer_lab_sessions_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.computer_lab_sessions
    ADD CONSTRAINT computer_lab_sessions_stream_id_fkey FOREIGN KEY (stream_id) REFERENCES public.streams(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE ONLY public.computer_lab_sessions
    ADD CONSTRAINT computer_lab_sessions_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE ONLY public.computer_lab_usage_logs
    ADD CONSTRAINT computer_lab_usage_logs_computer_lab_session_id_fkey FOREIGN KEY (computer_lab_session_id) REFERENCES public.computer_lab_sessions(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.computer_lab_usage_logs
    ADD CONSTRAINT computer_lab_usage_logs_pc_id_fkey FOREIGN KEY (pc_id) REFERENCES public.computer_lab_pcs(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.computer_lab_usage_logs
    ADD CONSTRAINT computer_lab_usage_logs_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.computer_lab_usage_logs
    ADD CONSTRAINT computer_lab_usage_logs_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE ONLY public.counselling_cases
    ADD CONSTRAINT counselling_cases_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.counselling_cases
    ADD CONSTRAINT counselling_cases_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.counselling_escalations
    ADD CONSTRAINT counselling_escalations_counselling_case_id_fkey FOREIGN KEY (counselling_case_id) REFERENCES public.counselling_cases(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.counselling_escalations
    ADD CONSTRAINT counselling_escalations_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.discipline_cases
    ADD CONSTRAINT discipline_cases_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.discipline_cases
    ADD CONSTRAINT discipline_cases_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.documents_generated
    ADD CONSTRAINT documents_generated_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.dormitories
    ADD CONSTRAINT dormitories_boarding_house_id_fkey FOREIGN KEY (boarding_house_id) REFERENCES public.boarding_houses(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.dormitories
    ADD CONSTRAINT dormitories_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.exam_cycles
    ADD CONSTRAINT exam_cycles_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.exam_cycles
    ADD CONSTRAINT exam_cycles_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.exam_cycles
    ADD CONSTRAINT exam_cycles_term_id_fkey FOREIGN KEY (term_id) REFERENCES public.terms(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.exam_readiness_checks
    ADD CONSTRAINT exam_readiness_checks_exam_cycle_id_fkey FOREIGN KEY (exam_cycle_id) REFERENCES public.exam_cycles(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.exam_readiness_checks
    ADD CONSTRAINT exam_readiness_checks_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.exam_subjects
    ADD CONSTRAINT exam_subjects_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.exam_subjects
    ADD CONSTRAINT exam_subjects_exam_cycle_id_fkey FOREIGN KEY (exam_cycle_id) REFERENCES public.exam_cycles(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.exam_subjects
    ADD CONSTRAINT exam_subjects_grading_scale_id_fkey FOREIGN KEY (grading_scale_id) REFERENCES public.grading_scales(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE ONLY public.exam_subjects
    ADD CONSTRAINT exam_subjects_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.exam_subjects
    ADD CONSTRAINT exam_subjects_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.fee_items
    ADD CONSTRAINT fee_items_fee_structure_id_fkey FOREIGN KEY (fee_structure_id) REFERENCES public.fee_structures(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.fee_items
    ADD CONSTRAINT fee_items_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.fee_structures
    ADD CONSTRAINT fee_structures_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.fee_structures
    ADD CONSTRAINT fee_structures_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE ONLY public.fee_structures
    ADD CONSTRAINT fee_structures_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.fee_structures
    ADD CONSTRAINT fee_structures_term_id_fkey FOREIGN KEY (term_id) REFERENCES public.terms(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE ONLY public.fee_waivers
    ADD CONSTRAINT fee_waivers_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.fee_waivers
    ADD CONSTRAINT fee_waivers_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.file_uploads
    ADD CONSTRAINT file_uploads_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.academic_intervention_updates
    ADD CONSTRAINT fk_academic_intervention_updates_intervention FOREIGN KEY (tenant_id, intervention_id) REFERENCES public.academic_interventions(tenant_id, id) ON DELETE CASCADE;
ALTER TABLE ONLY public.academic_subject_offerings
    ADD CONSTRAINT fk_academic_subject_offerings_section FOREIGN KEY (tenant_id, class_section_id) REFERENCES public.academic_class_sections(tenant_id, id) ON DELETE CASCADE;
ALTER TABLE ONLY public.academic_subject_offerings
    ADD CONSTRAINT fk_academic_subject_offerings_teacher FOREIGN KEY (teacher_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.academic_terms
    ADD CONSTRAINT fk_academic_terms_year FOREIGN KEY (tenant_id, academic_year_id) REFERENCES public.academic_years(tenant_id, id) ON DELETE CASCADE;
ALTER TABLE ONLY public.academic_timetable_slots
    ADD CONSTRAINT fk_academic_timetable_slots_section FOREIGN KEY (tenant_id, class_section_id) REFERENCES public.academic_class_sections(tenant_id, id) ON DELETE CASCADE;
ALTER TABLE ONLY public.academic_timetable_slots
    ADD CONSTRAINT fk_academic_timetable_slots_subject FOREIGN KEY (tenant_id, subject_offering_id) REFERENCES public.academic_subject_offerings(tenant_id, id) ON DELETE SET NULL (subject_offering_id);
ALTER TABLE ONLY public.admission_appointments
    ADD CONSTRAINT fk_admission_appointments_application FOREIGN KEY (tenant_id, application_id) REFERENCES public.admission_applications(tenant_id, id) ON DELETE CASCADE;
ALTER TABLE ONLY public.admission_documents
    ADD CONSTRAINT fk_admission_documents_student FOREIGN KEY (tenant_id, student_id) REFERENCES public.students(tenant_id, id) ON DELETE CASCADE NOT VALID;
ALTER TABLE ONLY public.admission_offers
    ADD CONSTRAINT fk_admission_offers_application FOREIGN KEY (tenant_id, application_id) REFERENCES public.admission_applications(tenant_id, id) ON DELETE CASCADE;
ALTER TABLE ONLY public.admission_tasks
    ADD CONSTRAINT fk_admission_tasks_application FOREIGN KEY (tenant_id, application_id) REFERENCES public.admission_applications(tenant_id, id) ON DELETE CASCADE;
ALTER TABLE ONLY public.billing_notifications
    ADD CONSTRAINT fk_billing_notifications_subscription FOREIGN KEY (tenant_id, subscription_id) REFERENCES public.subscriptions(tenant_id, id) ON DELETE CASCADE;
ALTER TABLE ONLY public.class_sections
    ADD CONSTRAINT fk_class_sections_academic_level FOREIGN KEY (tenant_id, academic_level_id) REFERENCES public.academic_levels(tenant_id, id);
ALTER TABLE ONLY public.class_sections
    ADD CONSTRAINT fk_class_sections_year FOREIGN KEY (tenant_id, academic_year_id) REFERENCES public.academic_years(tenant_id, id) ON DELETE CASCADE;
ALTER TABLE ONLY public.class_streams
    ADD CONSTRAINT fk_class_streams_class FOREIGN KEY (tenant_id, class_section_id) REFERENCES public.class_sections(tenant_id, id);
ALTER TABLE ONLY public.clinic_disposal_requests
    ADD CONSTRAINT fk_clinic_disposal_requests_batch FOREIGN KEY (tenant_id, batch_id) REFERENCES public.clinic_medicine_batches(tenant_id, id);
ALTER TABLE ONLY public.event_consumer_runs
    ADD CONSTRAINT fk_event_consumer_runs_outbox_event FOREIGN KEY (tenant_id, outbox_event_id) REFERENCES public.outbox_events(tenant_id, id) ON DELETE CASCADE;
ALTER TABLE ONLY public.exam_mark_import_batch_items
    ADD CONSTRAINT fk_exam_mark_import_batch_items_batch FOREIGN KEY (tenant_id, batch_id) REFERENCES public.exam_mark_import_batches(tenant_id, id) ON DELETE CASCADE;
ALTER TABLE ONLY public.finance_close_periods
    ADD CONSTRAINT fk_finance_close_periods_closed_by FOREIGN KEY (closed_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.finance_close_periods
    ADD CONSTRAINT fk_finance_close_periods_reopened_by FOREIGN KEY (reopened_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT fk_invoices_payment_intent FOREIGN KEY (tenant_id, payment_intent_id) REFERENCES public.payment_intents(tenant_id, id) ON DELETE SET NULL;
ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT fk_invoices_subscription FOREIGN KEY (tenant_id, subscription_id) REFERENCES public.subscriptions(tenant_id, id) ON DELETE RESTRICT;
ALTER TABLE ONLY public.lab_issue_lines
    ADD CONSTRAINT fk_lab_issue_lines_issue FOREIGN KEY (tenant_id, issue_id) REFERENCES public.lab_issue_records(tenant_id, id) ON DELETE CASCADE;
ALTER TABLE ONLY public.lab_issue_lines
    ADD CONSTRAINT fk_lab_issue_lines_request_item FOREIGN KEY (tenant_id, request_item_id) REFERENCES public.lab_practical_request_items(tenant_id, id);
ALTER TABLE ONLY public.lab_issue_records
    ADD CONSTRAINT fk_lab_issue_records_request FOREIGN KEY (tenant_id, practical_request_id) REFERENCES public.lab_practical_requests(tenant_id, id);
ALTER TABLE ONLY public.lab_issue_returns
    ADD CONSTRAINT fk_lab_issue_returns_issue FOREIGN KEY (tenant_id, issue_id) REFERENCES public.lab_issue_records(tenant_id, id) ON DELETE CASCADE;
ALTER TABLE ONLY public.lab_practical_request_items
    ADD CONSTRAINT fk_lab_practical_request_items_request FOREIGN KEY (tenant_id, request_id) REFERENCES public.lab_practical_requests(tenant_id, id) ON DELETE CASCADE;
ALTER TABLE ONLY public.lab_stocktake_lines
    ADD CONSTRAINT fk_lab_stocktake_lines_stocktake FOREIGN KEY (tenant_id, stocktake_id) REFERENCES public.lab_stocktakes(tenant_id, id) ON DELETE CASCADE;
ALTER TABLE ONLY public.manual_fee_payment_allocations
    ADD CONSTRAINT fk_manual_fee_payment_allocations_payment FOREIGN KEY (tenant_id, manual_payment_id) REFERENCES public.manual_fee_payments(tenant_id, id) ON DELETE RESTRICT;
ALTER TABLE ONLY public.manual_fee_payments
    ADD CONSTRAINT fk_manual_fee_payments_ledger_transaction FOREIGN KEY (tenant_id, ledger_transaction_id) REFERENCES public.transactions(tenant_id, id) ON DELETE SET NULL;
ALTER TABLE ONLY public.manual_fee_payments
    ADD CONSTRAINT fk_manual_fee_payments_reversal_ledger_transaction FOREIGN KEY (tenant_id, reversal_ledger_transaction_id) REFERENCES public.transactions(tenant_id, id) ON DELETE SET NULL;
ALTER TABLE ONLY public.payment_intents
    ADD CONSTRAINT fk_payment_intents_mpesa_config FOREIGN KEY (tenant_id, mpesa_config_id) REFERENCES public.tenant_mpesa_configs(tenant_id, id) ON DELETE RESTRICT;
ALTER TABLE ONLY public.payment_intents
    ADD CONSTRAINT fk_payment_intents_payment_channel FOREIGN KEY (tenant_id, payment_channel_id) REFERENCES public.tenant_payment_channels(tenant_id, id) ON DELETE RESTRICT;
ALTER TABLE ONLY public.payment_intents
    ADD CONSTRAINT fk_payment_intents_student FOREIGN KEY (tenant_id, student_id) REFERENCES public.students(tenant_id, id) ON DELETE SET NULL;
ALTER TABLE ONLY public.report_snapshot_audit_logs
    ADD CONSTRAINT fk_report_snapshot_audit_snapshot FOREIGN KEY (tenant_id, snapshot_id) REFERENCES public.report_snapshots(tenant_id, snapshot_id);
ALTER TABLE ONLY public.student_academic_enrollments
    ADD CONSTRAINT fk_student_academic_enrollments_application FOREIGN KEY (tenant_id, application_id) REFERENCES public.admission_applications(tenant_id, id) ON DELETE CASCADE;
ALTER TABLE ONLY public.student_academic_enrollments
    ADD CONSTRAINT fk_student_academic_enrollments_student FOREIGN KEY (tenant_id, student_id) REFERENCES public.students(tenant_id, id) ON DELETE CASCADE NOT VALID;
ALTER TABLE ONLY public.student_academic_lifecycle_events
    ADD CONSTRAINT fk_student_academic_lifecycle_events_source_enrollment FOREIGN KEY (tenant_id, source_enrollment_id) REFERENCES public.student_academic_enrollments(tenant_id, id) ON DELETE CASCADE;
ALTER TABLE ONLY public.student_academic_lifecycle_events
    ADD CONSTRAINT fk_student_academic_lifecycle_events_student FOREIGN KEY (tenant_id, student_id) REFERENCES public.students(tenant_id, id) ON DELETE CASCADE NOT VALID;
ALTER TABLE ONLY public.student_academic_lifecycle_events
    ADD CONSTRAINT fk_student_academic_lifecycle_events_target_enrollment FOREIGN KEY (tenant_id, target_enrollment_id) REFERENCES public.student_academic_enrollments(tenant_id, id) ON DELETE SET NULL (target_enrollment_id);
ALTER TABLE ONLY public.student_allocations
    ADD CONSTRAINT fk_student_allocations_student FOREIGN KEY (tenant_id, student_id) REFERENCES public.students(tenant_id, id) ON DELETE CASCADE NOT VALID;
ALTER TABLE ONLY public.student_fee_assignments
    ADD CONSTRAINT fk_student_fee_assignments_application FOREIGN KEY (tenant_id, application_id) REFERENCES public.admission_applications(tenant_id, id) ON DELETE CASCADE;
ALTER TABLE ONLY public.student_fee_assignments
    ADD CONSTRAINT fk_student_fee_assignments_structure FOREIGN KEY (tenant_id, fee_structure_id) REFERENCES public.student_fee_structures(tenant_id, id) ON DELETE RESTRICT;
ALTER TABLE ONLY public.student_fee_assignments
    ADD CONSTRAINT fk_student_fee_assignments_student FOREIGN KEY (tenant_id, student_id) REFERENCES public.students(tenant_id, id) ON DELETE CASCADE NOT VALID;
ALTER TABLE ONLY public.student_fee_invoices
    ADD CONSTRAINT fk_student_fee_invoices_assignment FOREIGN KEY (tenant_id, assignment_id) REFERENCES public.student_fee_assignments(tenant_id, id) ON DELETE CASCADE;
ALTER TABLE ONLY public.student_fee_invoices
    ADD CONSTRAINT fk_student_fee_invoices_student FOREIGN KEY (tenant_id, student_id) REFERENCES public.students(tenant_id, id) ON DELETE CASCADE NOT VALID;
ALTER TABLE ONLY public.student_portal_access
    ADD CONSTRAINT fk_student_portal_access_student FOREIGN KEY (tenant_id, student_id) REFERENCES public.students(tenant_id, id) ON DELETE CASCADE;
ALTER TABLE ONLY public.student_portal_access
    ADD CONSTRAINT fk_student_portal_access_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.student_subject_enrollments
    ADD CONSTRAINT fk_student_subject_enrollments_academic FOREIGN KEY (tenant_id, academic_enrollment_id) REFERENCES public.student_academic_enrollments(tenant_id, id) ON DELETE CASCADE;
ALTER TABLE ONLY public.student_subject_enrollments
    ADD CONSTRAINT fk_student_subject_enrollments_offering FOREIGN KEY (tenant_id, subject_offering_id) REFERENCES public.academic_subject_offerings(tenant_id, id) ON DELETE CASCADE;
ALTER TABLE ONLY public.student_subject_enrollments
    ADD CONSTRAINT fk_student_subject_enrollments_student FOREIGN KEY (tenant_id, student_id) REFERENCES public.students(tenant_id, id) ON DELETE CASCADE NOT VALID;
ALTER TABLE ONLY public.student_timetable_enrollments
    ADD CONSTRAINT fk_student_timetable_enrollments_academic FOREIGN KEY (tenant_id, academic_enrollment_id) REFERENCES public.student_academic_enrollments(tenant_id, id) ON DELETE CASCADE;
ALTER TABLE ONLY public.student_timetable_enrollments
    ADD CONSTRAINT fk_student_timetable_enrollments_slot FOREIGN KEY (tenant_id, timetable_slot_id) REFERENCES public.academic_timetable_slots(tenant_id, id) ON DELETE CASCADE;
ALTER TABLE ONLY public.student_timetable_enrollments
    ADD CONSTRAINT fk_student_timetable_enrollments_student FOREIGN KEY (tenant_id, student_id) REFERENCES public.students(tenant_id, id) ON DELETE CASCADE NOT VALID;
ALTER TABLE ONLY public.student_transfer_records
    ADD CONSTRAINT fk_student_transfer_application FOREIGN KEY (tenant_id, application_id) REFERENCES public.admission_applications(tenant_id, id) ON DELETE CASCADE;
ALTER TABLE ONLY public.student_transfer_records
    ADD CONSTRAINT fk_student_transfer_student FOREIGN KEY (tenant_id, student_id) REFERENCES public.students(tenant_id, id) ON DELETE CASCADE NOT VALID;
ALTER TABLE ONLY public.support_incidents
    ADD CONSTRAINT fk_support_incidents_component FOREIGN KEY (tenant_id, component_id) REFERENCES public.support_system_components(tenant_id, id) ON DELETE SET NULL;
ALTER TABLE ONLY public.sync_cursors
    ADD CONSTRAINT fk_sync_cursors_device FOREIGN KEY (tenant_id, device_id) REFERENCES public.sync_devices(tenant_id, device_id) ON DELETE CASCADE;
ALTER TABLE ONLY public.teacher_subject_assignments
    ADD CONSTRAINT fk_teacher_assignment_class_stream FOREIGN KEY (tenant_id, class_section_id, stream_id) REFERENCES public.class_streams(tenant_id, class_section_id, id) ON UPDATE CASCADE NOT VALID;
ALTER TABLE ONLY public.timetable_teacher_availability
    ADD CONSTRAINT fk_timetable_availability_period FOREIGN KEY (tenant_id, period_id) REFERENCES public.timetable_period_definitions(tenant_id, id) ON DELETE CASCADE;
ALTER TABLE ONLY public.timetable_common_blocks
    ADD CONSTRAINT fk_timetable_common_block_configuration FOREIGN KEY (tenant_id, configuration_id) REFERENCES public.timetable_configurations(tenant_id, id) ON DELETE CASCADE;
ALTER TABLE ONLY public.timetable_common_blocks
    ADD CONSTRAINT fk_timetable_common_block_period FOREIGN KEY (tenant_id, period_id) REFERENCES public.timetable_period_definitions(tenant_id, id) ON DELETE CASCADE;
ALTER TABLE ONLY public.timetable_days
    ADD CONSTRAINT fk_timetable_days_configuration FOREIGN KEY (tenant_id, configuration_id) REFERENCES public.timetable_configurations(tenant_id, id) ON DELETE CASCADE;
ALTER TABLE ONLY public.timetable_period_definitions
    ADD CONSTRAINT fk_timetable_period_configuration FOREIGN KEY (tenant_id, configuration_id) REFERENCES public.timetable_configurations(tenant_id, id) ON DELETE CASCADE;
ALTER TABLE ONLY public.timetable_subject_requirements
    ADD CONSTRAINT fk_timetable_requirement_resource FOREIGN KEY (tenant_id, resource_id) REFERENCES public.timetable_resources(tenant_id, id) ON DELETE SET NULL;
ALTER TABLE ONLY public.transport_routes
    ADD CONSTRAINT fk_transport_routes_assigned_vehicle FOREIGN KEY (tenant_id, assigned_vehicle_id) REFERENCES public.transport_vehicles(tenant_id, id) ON DELETE RESTRICT;
ALTER TABLE ONLY public.usage_records
    ADD CONSTRAINT fk_usage_records_subscription FOREIGN KEY (tenant_id, subscription_id) REFERENCES public.subscriptions(tenant_id, id) ON DELETE CASCADE;
ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT fk_user_roles_assigned_by_user FOREIGN KEY (assigned_by_user_id) REFERENCES public.users(id) ON DELETE RESTRICT;
ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT fk_user_roles_tenant_role FOREIGN KEY (tenant_id, role_id) REFERENCES public.roles(tenant_id, id) ON DELETE CASCADE;
ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.front_office_tickets
    ADD CONSTRAINT front_office_tickets_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.gate_incidents
    ADD CONSTRAINT gate_incidents_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.grading_scale_ranges
    ADD CONSTRAINT grading_scale_ranges_grading_scale_id_fkey FOREIGN KEY (grading_scale_id) REFERENCES public.grading_scales(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.grading_scale_ranges
    ADD CONSTRAINT grading_scale_ranges_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.grading_scales
    ADD CONSTRAINT grading_scales_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.group_guidance_sessions
    ADD CONSTRAINT group_guidance_sessions_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.guardian_profiles
    ADD CONSTRAINT guardian_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.hod_assignments
    ADD CONSTRAINT hod_assignments_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.hod_assignments
    ADD CONSTRAINT hod_assignments_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.hod_assignments
    ADD CONSTRAINT hod_assignments_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.hod_reviews
    ADD CONSTRAINT hod_reviews_mark_submission_id_fkey FOREIGN KEY (mark_submission_id) REFERENCES public.mark_submissions(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.hod_reviews
    ADD CONSTRAINT hod_reviews_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.idempotency_keys
    ADD CONSTRAINT idempotency_keys_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.import_batches
    ADD CONSTRAINT import_batches_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.import_rows
    ADD CONSTRAINT import_rows_import_batch_id_fkey FOREIGN KEY (import_batch_id) REFERENCES public.import_batches(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.import_rows
    ADD CONSTRAINT import_rows_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.inventory_categories
    ADD CONSTRAINT inventory_categories_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.inventory_categories(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.inventory_request_items
    ADD CONSTRAINT inventory_request_items_inventory_item_id_fkey FOREIGN KEY (inventory_item_id) REFERENCES public.inventory_items(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.inventory_request_items
    ADD CONSTRAINT inventory_request_items_inventory_request_id_fkey FOREIGN KEY (inventory_request_id) REFERENCES public.inventory_requests(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.inventory_request_items
    ADD CONSTRAINT inventory_request_items_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.inventory_requests
    ADD CONSTRAINT inventory_requests_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.inventory_stock_movements
    ADD CONSTRAINT inventory_stock_movements_inventory_item_id_fkey FOREIGN KEY (inventory_item_id) REFERENCES public.inventory_items(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.inventory_stock_movements
    ADD CONSTRAINT inventory_stock_movements_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_term_id_fkey FOREIGN KEY (term_id) REFERENCES public.terms(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.learning_areas
    ADD CONSTRAINT learning_areas_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.library_book_copies
    ADD CONSTRAINT library_book_copies_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.library_books(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.library_book_copies
    ADD CONSTRAINT library_book_copies_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.library_books
    ADD CONSTRAINT library_books_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.library_fines
    ADD CONSTRAINT library_fines_library_loan_id_fkey FOREIGN KEY (library_loan_id) REFERENCES public.library_loans(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.library_fines
    ADD CONSTRAINT library_fines_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.library_fines
    ADD CONSTRAINT library_fines_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.library_loans
    ADD CONSTRAINT library_loans_book_copy_id_fkey FOREIGN KEY (book_copy_id) REFERENCES public.library_book_copies(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.library_loans
    ADD CONSTRAINT library_loans_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.library_loans
    ADD CONSTRAINT library_loans_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE ONLY public.maintenance_tickets
    ADD CONSTRAINT maintenance_tickets_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE ONLY public.maintenance_tickets
    ADD CONSTRAINT maintenance_tickets_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.mark_submissions
    ADD CONSTRAINT mark_submissions_exam_cycle_id_fkey FOREIGN KEY (exam_cycle_id) REFERENCES public.exam_cycles(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.mark_submissions
    ADD CONSTRAINT mark_submissions_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.marks_entries
    ADD CONSTRAINT marks_entries_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.marks_entries
    ADD CONSTRAINT marks_entries_exam_cycle_id_fkey FOREIGN KEY (exam_cycle_id) REFERENCES public.exam_cycles(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.marks_entries
    ADD CONSTRAINT marks_entries_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.marks_entries
    ADD CONSTRAINT marks_entries_stream_id_fkey FOREIGN KEY (stream_id) REFERENCES public.streams(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.marks_entries
    ADD CONSTRAINT marks_entries_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.marks_entries
    ADD CONSTRAINT marks_entries_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.medical_visits
    ADD CONSTRAINT medical_visits_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.medical_visits
    ADD CONSTRAINT medical_visits_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.medicine_dispensing_logs
    ADD CONSTRAINT medicine_dispensing_logs_medical_visit_id_fkey FOREIGN KEY (medical_visit_id) REFERENCES public.medical_visits(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.medicine_dispensing_logs
    ADD CONSTRAINT medicine_dispensing_logs_medicine_inventory_id_fkey FOREIGN KEY (medicine_inventory_id) REFERENCES public.medicine_inventory(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.medicine_dispensing_logs
    ADD CONSTRAINT medicine_dispensing_logs_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.medicine_inventory
    ADD CONSTRAINT medicine_inventory_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.module_permissions
    ADD CONSTRAINT module_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE RESTRICT;
ALTER TABLE ONLY public.mpesa_transactions
    ADD CONSTRAINT mpesa_transactions_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.notification_deliveries
    ADD CONSTRAINT notification_deliveries_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.notifications(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT notification_templates_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.offline_sync_events
    ADD CONSTRAINT offline_sync_events_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.parent_meetings
    ADD CONSTRAINT parent_meetings_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.parent_meetings
    ADD CONSTRAINT parent_meetings_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_purchase_request_id_fkey FOREIGN KEY (purchase_request_id) REFERENCES public.purchase_requests(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.purchase_requests
    ADD CONSTRAINT purchase_requests_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.report_card_comments
    ADD CONSTRAINT report_card_comments_academic_term_id_fkey FOREIGN KEY (academic_term_id) REFERENCES public.terms(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.report_card_comments
    ADD CONSTRAINT report_card_comments_class_section_id_fkey FOREIGN KEY (class_section_id) REFERENCES public.classes(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.report_card_comments
    ADD CONSTRAINT report_card_comments_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.report_card_comments
    ADD CONSTRAINT report_card_comments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.report_cards
    ADD CONSTRAINT report_cards_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.report_cards
    ADD CONSTRAINT report_cards_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.report_cards
    ADD CONSTRAINT report_cards_exam_cycle_id_fkey FOREIGN KEY (exam_cycle_id) REFERENCES public.exam_cycles(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE ONLY public.report_cards
    ADD CONSTRAINT report_cards_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.report_cards
    ADD CONSTRAINT report_cards_stream_id_fkey FOREIGN KEY (stream_id) REFERENCES public.streams(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.report_cards
    ADD CONSTRAINT report_cards_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.report_cards
    ADD CONSTRAINT report_cards_term_id_fkey FOREIGN KEY (term_id) REFERENCES public.terms(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE RESTRICT;
ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE RESTRICT;
ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE ONLY public.school_memberships
    ADD CONSTRAINT school_memberships_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.school_memberships
    ADD CONSTRAINT school_memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;
ALTER TABLE ONLY public.school_modules
    ADD CONSTRAINT school_modules_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.school_settings
    ADD CONSTRAINT school_settings_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.school_subscriptions
    ADD CONSTRAINT school_subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.school_subscriptions
    ADD CONSTRAINT school_subscriptions_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.setup_checklist_items
    ADD CONSTRAINT setup_checklist_items_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.sms_credit_transactions
    ADD CONSTRAINT sms_credit_transactions_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.sms_credit_wallets
    ADD CONSTRAINT sms_credit_wallets_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.sms_logs
    ADD CONSTRAINT sms_logs_broadcast_id_fkey FOREIGN KEY (broadcast_id) REFERENCES public.communication_broadcasts(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE ONLY public.sms_logs
    ADD CONSTRAINT sms_logs_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.strands
    ADD CONSTRAINT strands_learning_area_id_fkey FOREIGN KEY (learning_area_id) REFERENCES public.learning_areas(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.strands
    ADD CONSTRAINT strands_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.streams
    ADD CONSTRAINT streams_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.streams
    ADD CONSTRAINT streams_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.student_audit_logs
    ADD CONSTRAINT student_audit_logs_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.student_audit_logs
    ADD CONSTRAINT student_audit_logs_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.student_class_assignments
    ADD CONSTRAINT student_class_assignments_academic_level_id_fkey FOREIGN KEY (academic_level_id) REFERENCES public.academic_levels(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.student_class_assignments
    ADD CONSTRAINT student_class_assignments_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.student_class_assignments
    ADD CONSTRAINT student_class_assignments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.student_clearance
    ADD CONSTRAINT student_clearance_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.student_clearance
    ADD CONSTRAINT student_clearance_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.student_communications
    ADD CONSTRAINT student_communications_guardian_id_fkey FOREIGN KEY (guardian_id) REFERENCES public.parent_guardians(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE ONLY public.student_communications
    ADD CONSTRAINT student_communications_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.student_communications
    ADD CONSTRAINT student_communications_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.student_enrollments
    ADD CONSTRAINT student_enrollments_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.student_enrollments
    ADD CONSTRAINT student_enrollments_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.student_enrollments
    ADD CONSTRAINT student_enrollments_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.student_enrollments
    ADD CONSTRAINT student_enrollments_stream_id_fkey FOREIGN KEY (stream_id) REFERENCES public.streams(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.student_enrollments
    ADD CONSTRAINT student_enrollments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.student_enrollments
    ADD CONSTRAINT student_enrollments_term_id_fkey FOREIGN KEY (term_id) REFERENCES public.terms(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE ONLY public.student_exit_records
    ADD CONSTRAINT student_exit_records_clearance_id_fkey FOREIGN KEY (clearance_id) REFERENCES public.student_clearance(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE ONLY public.student_exit_records
    ADD CONSTRAINT student_exit_records_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.student_exit_records
    ADD CONSTRAINT student_exit_records_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.student_fee_accounts
    ADD CONSTRAINT student_fee_accounts_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.student_fee_accounts
    ADD CONSTRAINT student_fee_accounts_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.student_guardians
    ADD CONSTRAINT student_guardians_guardian_id_fkey FOREIGN KEY (guardian_id) REFERENCES public.parent_guardians(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.student_guardians
    ADD CONSTRAINT student_guardians_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.student_notes
    ADD CONSTRAINT student_notes_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.student_notes
    ADD CONSTRAINT student_notes_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.student_transport_assignments
    ADD CONSTRAINT student_transport_assignments_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.transport_routes(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.student_transport_assignments
    ADD CONSTRAINT student_transport_assignments_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.student_transport_assignments
    ADD CONSTRAINT student_transport_assignments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.sub_strands
    ADD CONSTRAINT sub_strands_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.sub_strands
    ADD CONSTRAINT sub_strands_strand_id_fkey FOREIGN KEY (strand_id) REFERENCES public.strands(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.sync_conflicts
    ADD CONSTRAINT sync_conflicts_offline_sync_event_id_fkey FOREIGN KEY (offline_sync_event_id) REFERENCES public.offline_sync_events(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.sync_conflicts
    ADD CONSTRAINT sync_conflicts_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.system_health_logs
    ADD CONSTRAINT system_health_logs_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE ONLY public.system_jobs
    ADD CONSTRAINT system_jobs_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE ONLY public.teacher_subject_assignments
    ADD CONSTRAINT teacher_subject_assignments_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.teacher_subject_assignments
    ADD CONSTRAINT teacher_subject_assignments_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.teacher_subject_assignments
    ADD CONSTRAINT teacher_subject_assignments_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.teacher_subject_assignments
    ADD CONSTRAINT teacher_subject_assignments_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.teacher_subject_assignments
    ADD CONSTRAINT teacher_subject_assignments_term_id_fkey FOREIGN KEY (term_id) REFERENCES public.terms(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE ONLY public.tenant_memberships
    ADD CONSTRAINT tenant_memberships_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE RESTRICT;
ALTER TABLE ONLY public.tenant_memberships
    ADD CONSTRAINT tenant_memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.terms
    ADD CONSTRAINT terms_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.terms
    ADD CONSTRAINT terms_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.timetable_periods
    ADD CONSTRAINT timetable_periods_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_idempotency_key_id_fkey FOREIGN KEY (idempotency_key_id) REFERENCES public.idempotency_keys(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.transport_routes
    ADD CONSTRAINT transport_routes_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.transport_vehicles
    ADD CONSTRAINT transport_vehicles_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.user_permission_overrides
    ADD CONSTRAINT user_permission_overrides_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE RESTRICT;
ALTER TABLE ONLY public.user_permission_overrides
    ADD CONSTRAINT user_permission_overrides_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.user_permission_overrides
    ADD CONSTRAINT user_permission_overrides_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;
ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE RESTRICT;
ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;
ALTER TABLE ONLY public.v2_counselling_sessions
    ADD CONSTRAINT v2_counselling_sessions_counselling_case_id_fkey FOREIGN KEY (counselling_case_id) REFERENCES public.counselling_cases(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.v2_counselling_sessions
    ADD CONSTRAINT v2_counselling_sessions_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.v2_discipline_actions
    ADD CONSTRAINT v2_discipline_actions_discipline_case_id_fkey FOREIGN KEY (discipline_case_id) REFERENCES public.discipline_cases(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.v2_discipline_actions
    ADD CONSTRAINT v2_discipline_actions_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.vehicle_fuel_logs
    ADD CONSTRAINT vehicle_fuel_logs_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.vehicle_fuel_logs
    ADD CONSTRAINT vehicle_fuel_logs_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.transport_vehicles(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.visitor_logs
    ADD CONSTRAINT visitor_logs_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.visitor_logs
    ADD CONSTRAINT visitor_logs_visitor_id_fkey FOREIGN KEY (visitor_id) REFERENCES public.visitors(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.visitors
    ADD CONSTRAINT visitors_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.welfare_concerns
    ADD CONSTRAINT welfare_concerns_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.welfare_concerns
    ADD CONSTRAINT welfare_concerns_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.workflow_tasks
    ADD CONSTRAINT workflow_tasks_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE public.academic_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY academic_audit_logs_tenant_policy ON public.academic_audit_logs USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.academic_class_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY academic_class_sections_rls_policy ON public.academic_class_sections USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.academic_intervention_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY academic_intervention_updates_tenant_policy ON public.academic_intervention_updates USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.academic_interventions ENABLE ROW LEVEL SECURITY;
CREATE POLICY academic_interventions_tenant_policy ON public.academic_interventions USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.academic_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY academic_levels_tenant_policy ON public.academic_levels USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.academic_subject_offerings ENABLE ROW LEVEL SECURITY;
CREATE POLICY academic_subject_offerings_rls_policy ON public.academic_subject_offerings USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
CREATE POLICY academic_tenant_policy ON public.academic_years USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.academic_terms ENABLE ROW LEVEL SECURITY;
CREATE POLICY academic_terms_tenant_policy ON public.academic_terms USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.academic_timetable_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY academic_timetable_slots_rls_policy ON public.academic_timetable_slots USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academics_assignment_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY academics_assignment_submissions_tenant_policy ON public.academics_assignment_submissions USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.academics_attendance_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY academics_attendance_settings_rls_policy ON public.academics_attendance_settings USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.academics_calendar_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academics_class_teachers ENABLE ROW LEVEL SECURITY;
CREATE POLICY academics_class_teachers_tenant_policy ON public.academics_class_teachers USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.academics_curriculum_configurations ENABLE ROW LEVEL SECURITY;
CREATE POLICY academics_curriculum_configurations_tenant_policy ON public.academics_curriculum_configurations USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.academics_department_hod_appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY academics_department_hod_appointments_tenant_policy ON public.academics_department_hod_appointments USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.academics_departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY academics_departments_tenant_policy ON public.academics_departments USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.academics_grading_systems ENABLE ROW LEVEL SECURITY;
CREATE POLICY academics_grading_systems_rls_policy ON public.academics_grading_systems USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.academics_report_card_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY academics_report_card_settings_rls_policy ON public.academics_report_card_settings USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.academics_role_appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY academics_role_appointments_tenant_policy ON public.academics_role_appointments USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY accounts_rls_policy ON public.accounts USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.admin_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_incidents_tenant_policy ON public.admin_incidents USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.admission_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY admission_applications_rls_policy ON public.admission_applications USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.admission_appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY admission_appointments_rls_policy ON public.admission_appointments USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.admission_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY admission_documents_rls_policy ON public.admission_documents USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.admission_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY admission_drafts_rls_policy ON public.admission_drafts USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.admission_enquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY admission_enquiries_rls_policy ON public.admission_enquiries USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.admission_interviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY admission_interviews_rls_policy ON public.admission_interviews USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.admission_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY admission_offers_rls_policy ON public.admission_offers USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.admission_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY admission_settings_rls_policy ON public.admission_settings USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.admission_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY admission_tasks_rls_policy ON public.admission_tasks USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.admission_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY admission_templates_rls_policy ON public.admission_templates USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.ai_anomalies ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_anomalies_tenant_policy ON public.ai_anomalies USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.ai_forecasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_forecasts_tenant_policy ON public.ai_forecasts USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.ai_insight_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_insight_alerts_tenant_policy ON public.ai_insight_alerts USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.ai_insight_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_insight_audit_logs_tenant_policy ON public.ai_insight_audit_logs USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.ai_insight_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_insight_runs_tenant_policy ON public.ai_insight_runs USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_recommendations_tenant_policy ON public.ai_recommendations USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY announcements_tenant_policy ON public.announcements USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.asset_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY asset_assignments_tenant_policy ON public.asset_assignments USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.asset_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY asset_audit_logs_tenant_policy ON public.asset_audit_logs USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.asset_depreciation_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY asset_depreciation_entries_tenant_policy ON public.asset_depreciation_entries USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.asset_repairs ENABLE ROW LEVEL SECURITY;
CREATE POLICY asset_repairs_tenant_policy ON public.asset_repairs USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY assets_tenant_policy ON public.assets USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY attendance_records_rls_policy ON public.attendance_records USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.attendance_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY attendance_rules_tenant_policy ON public.attendance_rules USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_logs_rls_policy ON public.audit_logs USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.auth_action_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY auth_action_tokens_rls_policy ON public.auth_action_tokens USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'platform_owner'::text) OR (COALESCE(NULLIF(current_setting('app.auth_action_token_operation'::text, true), ''::text), ''::text) = ANY (ARRAY['password_recovery_create'::text, 'password_recovery_consume'::text, 'email_verification_create'::text, 'email_verification_consume'::text, 'invite_acceptance_consume'::text, 'magic_login_consume'::text])))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'platform_owner'::text) OR (COALESCE(NULLIF(current_setting('app.auth_action_token_operation'::text, true), ''::text), ''::text) = ANY (ARRAY['password_recovery_create'::text, 'password_recovery_consume'::text, 'email_verification_create'::text, 'email_verification_consume'::text, 'invite_acceptance_consume'::text, 'magic_login_consume'::text]))));
ALTER TABLE public.auth_email_outbox ENABLE ROW LEVEL SECURITY;
CREATE POLICY auth_email_outbox_rls_policy ON public.auth_email_outbox USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'platform_owner'::text) OR (COALESCE(NULLIF(current_setting('app.auth_email_outbox_operation'::text, true), ''::text), ''::text) = ANY (ARRAY['password_recovery_create'::text, 'email_verification_create'::text, 'mark_delivery'::text])))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'platform_owner'::text) OR (COALESCE(NULLIF(current_setting('app.auth_email_outbox_operation'::text, true), ''::text), ''::text) = ANY (ARRAY['password_recovery_create'::text, 'email_verification_create'::text, 'mark_delivery'::text]))));
ALTER TABLE public.auth_mfa_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY auth_mfa_challenges_rls_policy ON public.auth_mfa_challenges USING ((((user_id)::text = NULLIF(current_setting('app.user_id'::text, true), ''::text)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'platform_owner'::text) OR (COALESCE(NULLIF(current_setting('app.path'::text, true), ''::text), ''::text) ~~ '%/auth/login%'::text))) WITH CHECK ((((user_id)::text = NULLIF(current_setting('app.user_id'::text, true), ''::text)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'platform_owner'::text) OR (COALESCE(NULLIF(current_setting('app.path'::text, true), ''::text), ''::text) ~~ '%/auth/login%'::text)));
ALTER TABLE public.auth_trusted_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY auth_trusted_devices_rls_policy ON public.auth_trusted_devices USING ((((user_id)::text = NULLIF(current_setting('app.user_id'::text, true), ''::text)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'platform_owner'::text) OR (COALESCE(NULLIF(current_setting('app.path'::text, true), ''::text), ''::text) ~~ '%/auth/login%'::text))) WITH CHECK ((((user_id)::text = NULLIF(current_setting('app.user_id'::text, true), ''::text)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'platform_owner'::text) OR (COALESCE(NULLIF(current_setting('app.path'::text, true), ''::text), ''::text) ~~ '%/auth/login%'::text)));
ALTER TABLE public.behavior_improvement_plan_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY behavior_improvement_plan_steps_tenant_policy ON public.behavior_improvement_plan_steps USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'system'::text])))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'system'::text]))));
ALTER TABLE public.behavior_improvement_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY behavior_improvement_plans_tenant_policy ON public.behavior_improvement_plans USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'system'::text])))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'system'::text]))));
ALTER TABLE public.behavior_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY behavior_points_tenant_policy ON public.behavior_points USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'system'::text])))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'system'::text]))));
ALTER TABLE public.billing_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY billing_notifications_rls_policy ON public.billing_notifications USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.biometric_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY biometric_devices_tenant_policy ON public.biometric_devices USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.biometric_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY biometric_events_tenant_policy ON public.biometric_events USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.biometric_identities ENABLE ROW LEVEL SECURITY;
CREATE POLICY biometric_identities_tenant_policy ON public.biometric_identities USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.boarding_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY boarding_allocations_tenant_policy ON public.boarding_allocations USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.boarding_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY boarding_audit_logs_tenant_policy ON public.boarding_audit_logs USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.boarding_dormitory_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY boarding_dormitory_checks_tenant_policy ON public.boarding_dormitory_checks USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.boarding_exeats ENABLE ROW LEVEL SECURITY;
CREATE POLICY boarding_exeats_tenant_policy ON public.boarding_exeats USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.boarding_houses ENABLE ROW LEVEL SECURITY;
CREATE POLICY boarding_houses_tenant_policy ON public.boarding_houses USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.boarding_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY boarding_incidents_tenant_policy ON public.boarding_incidents USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.boarding_meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY boarding_meals_tenant_policy ON public.boarding_meals USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.boarding_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY boarding_referrals_tenant_policy ON public.boarding_referrals USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.boarding_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY boarding_reports_tenant_policy ON public.boarding_reports USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.boarding_students ENABLE ROW LEVEL SECURITY;
CREATE POLICY boarding_students_tenant_policy ON public.boarding_students USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.breach_response_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY breach_response_reports_rls_policy ON public.breach_response_reports USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.callback_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY callback_logs_rls_policy ON public.callback_logs USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.cbt_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY cbt_attempts_tenant_policy ON public.cbt_attempts USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.cbt_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY cbt_audit_logs_tenant_policy ON public.cbt_audit_logs USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.cbt_exam_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY cbt_exam_sessions_tenant_policy ON public.cbt_exam_sessions USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.cbt_invigilation_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY cbt_invigilation_events_tenant_policy ON public.cbt_invigilation_events USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.cbt_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY cbt_questions_tenant_policy ON public.cbt_questions USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.cbt_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY cbt_responses_tenant_policy ON public.cbt_responses USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.chemical_disposal_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY chemical_disposal_requests_tenant_policy ON public.chemical_disposal_requests USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.chemical_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY chemical_items_tenant_policy ON public.chemical_items USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.child_data_dpia_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY child_data_dpia_records_rls_policy ON public.child_data_dpia_records USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.class_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY class_requests_rls_policy ON public.class_requests USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.class_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY class_sections_tenant_policy ON public.class_sections USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.class_streams ENABLE ROW LEVEL SECURITY;
CREATE POLICY class_streams_tenant_policy ON public.class_streams USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.class_subject_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY class_subject_assignments_tenant_policy ON public.class_subject_assignments USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.clinic_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY clinic_alerts_tenant_policy ON public.clinic_alerts USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.clinic_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY clinic_audit_logs_tenant_policy ON public.clinic_audit_logs USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.clinic_disposal_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY clinic_disposal_requests_tenant_policy ON public.clinic_disposal_requests USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.clinic_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY clinic_locations_tenant_policy ON public.clinic_locations USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.clinic_medicine_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY clinic_medicine_batches_tenant_policy ON public.clinic_medicine_batches USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.clinic_medicine_dispenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY clinic_medicine_dispenses_tenant_policy ON public.clinic_medicine_dispenses USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.clinic_medicines ENABLE ROW LEVEL SECURITY;
CREATE POLICY clinic_medicines_tenant_policy ON public.clinic_medicines USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.clinic_procurement_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY clinic_procurement_recommendations_tenant_policy ON public.clinic_procurement_recommendations USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.clinic_stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY clinic_stock_movements_tenant_policy ON public.clinic_stock_movements USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.clinic_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY clinic_visits_tenant_policy ON public.clinic_visits USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.commendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY commendations_tenant_policy ON public.commendations USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'system'::text])))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'system'::text]))));
ALTER TABLE public.communication_sms_outbox ENABLE ROW LEVEL SECURITY;
CREATE POLICY communication_sms_outbox_tenant_policy ON public.communication_sms_outbox USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.communication_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY communication_templates_tenant_policy ON public.communication_templates USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY consent_records_rls_policy ON public.consent_records USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.counselling_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY counselling_notes_tenant_policy ON public.counselling_notes USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'system'::text])))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'system'::text]))));
ALTER TABLE public.counselling_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY counselling_referrals_tenant_policy ON public.counselling_referrals USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'system'::text])))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'system'::text]))));
ALTER TABLE public.counselling_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY counselling_sessions_tenant_policy ON public.counselling_sessions USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'system'::text])))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'system'::text]))));
ALTER TABLE public.dashboard_approval_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY dashboard_approval_requests_rls_policy ON public.dashboard_approval_requests USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.dashboard_summary_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY dashboard_summary_snapshots_rls_policy ON public.dashboard_summary_snapshots USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'support_agent'::text, 'support_lead'::text, 'developer'::text, 'system'::text])))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'support_agent'::text, 'support_lead'::text, 'developer'::text, 'system'::text]))));
ALTER TABLE public.data_retention_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY data_retention_schedules_rls_policy ON public.data_retention_schedules USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.data_subject_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY data_subject_requests_rls_policy ON public.data_subject_requests USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.discipline_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY discipline_actions_tenant_policy ON public.discipline_actions USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'system'::text])))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'system'::text]))));
ALTER TABLE public.discipline_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY discipline_attachments_tenant_policy ON public.discipline_attachments USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'system'::text])))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'system'::text]))));
ALTER TABLE public.discipline_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY discipline_audit_logs_tenant_policy ON public.discipline_audit_logs USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'system'::text])))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'system'::text]))));
ALTER TABLE public.discipline_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY discipline_comments_tenant_policy ON public.discipline_comments USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'system'::text])))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'system'::text]))));
ALTER TABLE public.discipline_document_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY discipline_document_templates_tenant_policy ON public.discipline_document_templates USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'system'::text])))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'system'::text]))));
ALTER TABLE public.discipline_generated_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY discipline_generated_documents_tenant_policy ON public.discipline_generated_documents USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'system'::text])))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'system'::text]))));
ALTER TABLE public.discipline_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY discipline_incidents_tenant_policy ON public.discipline_incidents USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'system'::text])))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'system'::text]))));
ALTER TABLE public.discipline_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY discipline_notifications_tenant_policy ON public.discipline_notifications USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'system'::text])))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'system'::text]))));
ALTER TABLE public.duty_rosters ENABLE ROW LEVEL SECURITY;
CREATE POLICY duty_rosters_tenant_policy ON public.duty_rosters USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.event_consumer_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY event_consumer_runs_rls_policy ON public.event_consumer_runs USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.exam_assessment_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY exam_assessment_components_tenant_policy ON public.exam_assessment_components USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.exam_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY exam_assessments_tenant_policy ON public.exam_assessments USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.exam_attendance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY exam_attendance_records_tenant_policy ON public.exam_attendance_records USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.exam_competency_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY exam_competency_outcomes_tenant_policy ON public.exam_competency_outcomes USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.exam_grade_boundaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY exam_grade_boundaries_tenant_policy ON public.exam_grade_boundaries USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.exam_grading_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY exam_grading_policies_tenant_policy ON public.exam_grading_policies USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.exam_grading_policy_boundaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY exam_grading_policy_boundaries_tenant_policy ON public.exam_grading_policy_boundaries USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.exam_invigilators ENABLE ROW LEVEL SECURITY;
CREATE POLICY exam_invigilators_tenant_policy ON public.exam_invigilators USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.exam_mark_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY exam_mark_audit_logs_tenant_policy ON public.exam_mark_audit_logs USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.exam_mark_entry_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_mark_import_batch_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY exam_mark_import_batch_items_tenant_policy ON public.exam_mark_import_batch_items USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.exam_mark_import_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY exam_mark_import_batches_tenant_policy ON public.exam_mark_import_batches USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.exam_mark_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY exam_mark_versions_tenant_policy ON public.exam_mark_versions USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
CREATE POLICY exam_mark_windows_tenant_policy ON public.exam_mark_entry_windows USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.exam_marks ENABLE ROW LEVEL SECURITY;
CREATE POLICY exam_marks_tenant_policy ON public.exam_marks USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.exam_report_card_signatures ENABLE ROW LEVEL SECURITY;
CREATE POLICY exam_report_card_signatures_tenant_policy ON public.exam_report_card_signatures USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.exam_result_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY exam_result_snapshots_tenant_policy ON public.exam_result_snapshots USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.exam_series ENABLE ROW LEVEL SECURITY;
CREATE POLICY exam_series_tenant_policy ON public.exam_series USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.exam_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_settings_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY exam_settings_audit_logs_tenant_policy ON public.exam_settings_audit_logs USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
CREATE POLICY exam_settings_tenant_policy ON public.exam_settings USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.exam_student_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY exam_student_cases_tenant_policy ON public.exam_student_cases USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.exam_subject_weightings ENABLE ROW LEVEL SECURITY;
CREATE POLICY exam_subject_weightings_tenant_policy ON public.exam_subject_weightings USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.exam_timetable_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY exam_timetable_slots_tenant_policy ON public.exam_timetable_slots USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.facility_issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY facility_issues_tenant_policy ON public.facility_issues USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
CREATE POLICY fee_structures_rls_policy ON public.fee_structures USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.file_objects ENABLE ROW LEVEL SECURITY;
CREATE POLICY file_objects_rls_policy ON public.file_objects USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'support_agent'::text, 'support_lead'::text, 'developer'::text, 'system'::text])))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'support_agent'::text, 'support_lead'::text, 'developer'::text, 'system'::text]))));
ALTER TABLE public.finance_approval_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY finance_approval_requests_rls_policy ON public.finance_approval_requests USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.finance_close_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY finance_close_periods_rls_policy ON public.finance_close_periods USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.finance_fee_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY finance_fee_categories_rls_policy ON public.finance_fee_categories USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.guardian_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY guardian_profiles_rls_policy ON public.guardian_profiles USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.hostel_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY hostel_allocations_tenant_policy ON public.hostel_allocations USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.hostel_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY hostel_audit_logs_tenant_policy ON public.hostel_audit_logs USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.hostel_issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY hostel_issues_tenant_policy ON public.hostel_issues USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.hostel_meal_consumption ENABLE ROW LEVEL SECURITY;
CREATE POLICY hostel_meal_consumption_tenant_policy ON public.hostel_meal_consumption USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.hostel_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY hostel_rooms_tenant_policy ON public.hostel_rooms USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.hostels ENABLE ROW LEVEL SECURITY;
CREATE POLICY hostels_tenant_policy ON public.hostels USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY idempotency_keys_rls_policy ON public.idempotency_keys USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY integration_logs_rls_policy ON public.integration_logs USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY inventory_categories_rls_policy ON public.inventory_categories USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.inventory_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY inventory_incidents_rls_policy ON public.inventory_incidents USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.inventory_item_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY inventory_item_balances_rls_policy ON public.inventory_item_balances USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY inventory_items_rls_policy ON public.inventory_items USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.inventory_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY inventory_locations_rls_policy ON public.inventory_locations USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.inventory_purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY inventory_purchase_orders_rls_policy ON public.inventory_purchase_orders USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.inventory_request_backorders ENABLE ROW LEVEL SECURITY;
CREATE POLICY inventory_request_backorders_rls_policy ON public.inventory_request_backorders USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.inventory_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY inventory_requests_rls_policy ON public.inventory_requests USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.inventory_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY inventory_reservations_rls_policy ON public.inventory_reservations USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.inventory_stock_count_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY inventory_stock_count_snapshots_rls_policy ON public.inventory_stock_count_snapshots USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.inventory_stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY inventory_stock_movements_rls_policy ON public.inventory_stock_movements USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.inventory_suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY inventory_suppliers_rls_policy ON public.inventory_suppliers USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.inventory_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY inventory_transfers_rls_policy ON public.inventory_transfers USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY invoices_rls_policy ON public.invoices USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.iot_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY iot_alerts_tenant_policy ON public.iot_alerts USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.iot_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY iot_audit_logs_tenant_policy ON public.iot_audit_logs USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.iot_device_commands ENABLE ROW LEVEL SECURITY;
CREATE POLICY iot_device_commands_tenant_policy ON public.iot_device_commands USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.iot_device_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY iot_device_credentials_tenant_policy ON public.iot_device_credentials USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.iot_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY iot_devices_tenant_policy ON public.iot_devices USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.iot_gateway_ingestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY iot_gateway_ingestions_tenant_policy ON public.iot_gateway_ingestions USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.iot_telemetry_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY iot_telemetry_readings_tenant_policy ON public.iot_telemetry_readings USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.lab_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY lab_attendance_tenant_policy ON public.lab_attendance USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.lab_breakage_loss_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY lab_breakage_loss_records_tenant_policy ON public.lab_breakage_loss_records USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.lab_departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY lab_departments_tenant_policy ON public.lab_departments USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.lab_equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY lab_equipment_tenant_policy ON public.lab_equipment USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.lab_issue_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY lab_issue_lines_tenant_policy ON public.lab_issue_lines USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.lab_issue_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY lab_issue_records_tenant_policy ON public.lab_issue_records USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.lab_issue_returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY lab_issue_returns_tenant_policy ON public.lab_issue_returns USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.lab_practical_request_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY lab_practical_request_items_tenant_policy ON public.lab_practical_request_items USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.lab_practical_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY lab_practical_requests_tenant_policy ON public.lab_practical_requests USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.lab_safety_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY lab_safety_checks_tenant_policy ON public.lab_safety_checks USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.lab_session_chemical_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY lab_session_chemical_usage_tenant_policy ON public.lab_session_chemical_usage USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.lab_session_equipment_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY lab_session_equipment_usage_tenant_policy ON public.lab_session_equipment_usage USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.lab_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY lab_sessions_tenant_policy ON public.lab_sessions USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.lab_stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY lab_stock_movements_tenant_policy ON public.lab_stock_movements USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.lab_stocktake_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY lab_stocktake_lines_tenant_policy ON public.lab_stocktake_lines USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.lab_stocktakes ENABLE ROW LEVEL SECURITY;
CREATE POLICY lab_stocktakes_tenant_policy ON public.lab_stocktakes USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.lab_storage_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY lab_storage_locations_tenant_policy ON public.lab_storage_locations USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.labs ENABLE ROW LEVEL SECURITY;
CREATE POLICY labs_tenant_policy ON public.labs USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY ledger_entries_rls_policy ON public.ledger_entries USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.library_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY library_audit_logs_rls_policy ON public.library_audit_logs USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.library_borrower_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY library_borrower_limits_rls_policy ON public.library_borrower_limits USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.library_borrowers ENABLE ROW LEVEL SECURITY;
CREATE POLICY library_borrowers_rls_policy ON public.library_borrowers USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.library_catalog_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY library_catalog_items_rls_policy ON public.library_catalog_items USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.library_circulation_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY library_circulation_ledger_rls_policy ON public.library_circulation_ledger USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.library_copies ENABLE ROW LEVEL SECURITY;
CREATE POLICY library_copies_rls_policy ON public.library_copies USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.library_fine_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY library_fine_rules_rls_policy ON public.library_fine_rules USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.library_fines ENABLE ROW LEVEL SECURITY;
CREATE POLICY library_fines_rls_policy ON public.library_fines USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.library_renewals ENABLE ROW LEVEL SECURITY;
CREATE POLICY library_renewals_rls_policy ON public.library_renewals USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.library_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY library_reservations_rls_policy ON public.library_reservations USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.lms_activity_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY lms_activity_events_tenant_policy ON public.lms_activity_events USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.lms_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY lms_assignments_tenant_policy ON public.lms_assignments USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.lms_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY lms_audit_logs_tenant_policy ON public.lms_audit_logs USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.lms_content_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY lms_content_items_tenant_policy ON public.lms_content_items USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.lms_courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY lms_courses_tenant_policy ON public.lms_courses USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.lms_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY lms_submissions_tenant_policy ON public.lms_submissions USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.manual_fee_payment_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY manual_fee_payment_allocations_rls_policy ON public.manual_fee_payment_allocations USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.manual_fee_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY manual_fee_payments_rls_policy ON public.manual_fee_payments USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.meeting_minutes ENABLE ROW LEVEL SECURITY;
CREATE POLICY meeting_minutes_tenant_policy ON public.meeting_minutes USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.module_usage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY module_usage_events_tenant_policy ON public.module_usage_events USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = ANY (ARRAY['system'::text, 'superadmin'::text, 'platform_owner'::text])))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = ANY (ARRAY['system'::text, 'superadmin'::text, 'platform_owner'::text]))));
ALTER TABLE public.monitoring_service_account_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY monitoring_service_account_audit_logs_insert_policy ON public.monitoring_service_account_audit_logs FOR INSERT WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'platform_owner'::text) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
CREATE POLICY monitoring_service_account_audit_logs_select_policy ON public.monitoring_service_account_audit_logs FOR SELECT USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'platform_owner'::text) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.monitoring_service_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY monitoring_service_accounts_manage_policy ON public.monitoring_service_accounts USING (((NULLIF(current_setting('app.role'::text, true), ''::text) = 'platform_owner'::text) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((NULLIF(current_setting('app.role'::text, true), ''::text) = 'platform_owner'::text) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
CREATE POLICY monitoring_service_accounts_select_policy ON public.monitoring_service_accounts FOR SELECT USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'platform_owner'::text) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.mpesa_c2b_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY mpesa_c2b_payments_rls_policy ON public.mpesa_c2b_payments USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.mpesa_callback_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY mpesa_callback_channels_rls_policy ON public.mpesa_callback_channels USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.mpesa_config_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY mpesa_config_audit_logs_rls_policy ON public.mpesa_config_audit_logs USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.mpesa_payload_support_access_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY mpesa_payload_support_access_logs_rls_policy ON public.mpesa_payload_support_access_logs USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.mpesa_payload_vault ENABLE ROW LEVEL SECURITY;
CREATE POLICY mpesa_payload_vault_rls_policy ON public.mpesa_payload_vault USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.mpesa_reconciliation_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY mpesa_reconciliation_batches_rls_policy ON public.mpesa_reconciliation_batches USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.mpesa_reconciliation_discrepancies ENABLE ROW LEVEL SECURITY;
CREATE POLICY mpesa_reconciliation_discrepancies_rls_policy ON public.mpesa_reconciliation_discrepancies USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.mpesa_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY mpesa_transactions_rls_policy ON public.mpesa_transactions USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.mpesa_verification_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY mpesa_verification_jobs_rls_policy ON public.mpesa_verification_jobs USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notifications_rls_policy ON public.notifications USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.offense_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY offense_categories_tenant_policy ON public.offense_categories USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'system'::text])))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'system'::text]))));
ALTER TABLE public.outbox_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY outbox_events_rls_policy ON public.outbox_events USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.parent_acknowledgements ENABLE ROW LEVEL SECURITY;
CREATE POLICY parent_acknowledgements_tenant_policy ON public.parent_acknowledgements USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'system'::text])))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'system'::text]))));
ALTER TABLE public.parent_guardians ENABLE ROW LEVEL SECURITY;
CREATE POLICY parent_guardians_rls_policy ON public.parent_guardians USING ((school_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((school_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.parent_meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY parent_meetings_rls_policy ON public.parent_meetings USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.parent_otp_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY parent_otp_challenges_rls_policy ON public.parent_otp_challenges USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;
CREATE POLICY payment_intents_rls_policy ON public.payment_intents USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY permissions_rls_policy ON public.permissions USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'platform_owner'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'platform_owner'::text)));
ALTER TABLE public.platform_backups ENABLE ROW LEVEL SECURITY;
CREATE POLICY platform_backups_rls_policy ON public.platform_backups USING ((NULLIF(current_setting('app.role'::text, true), ''::text) = 'platform_owner'::text)) WITH CHECK ((NULLIF(current_setting('app.role'::text, true), ''::text) = 'platform_owner'::text));
ALTER TABLE public.platform_broadcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY platform_broadcasts_rls_policy ON public.platform_broadcasts USING ((NULLIF(current_setting('app.role'::text, true), ''::text) = 'platform_owner'::text)) WITH CHECK ((NULLIF(current_setting('app.role'::text, true), ''::text) = 'platform_owner'::text));
ALTER TABLE public.platform_payment_gateways ENABLE ROW LEVEL SECURITY;
CREATE POLICY platform_payment_gateways_rls_policy ON public.platform_payment_gateways USING ((NULLIF(current_setting('app.role'::text, true), ''::text) = 'platform_owner'::text)) WITH CHECK ((NULLIF(current_setting('app.role'::text, true), ''::text) = 'platform_owner'::text));
ALTER TABLE public.platform_security_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY platform_security_policies_rls_policy ON public.platform_security_policies USING ((NULLIF(current_setting('app.role'::text, true), ''::text) = 'platform_owner'::text)) WITH CHECK ((NULLIF(current_setting('app.role'::text, true), ''::text) = 'platform_owner'::text));
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY platform_settings_rls_policy ON public.platform_settings USING ((NULLIF(current_setting('app.role'::text, true), ''::text) = 'platform_owner'::text)) WITH CHECK ((NULLIF(current_setting('app.role'::text, true), ''::text) = 'platform_owner'::text));
ALTER TABLE public.platform_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY platform_templates_rls_policy ON public.platform_templates USING ((NULLIF(current_setting('app.role'::text, true), ''::text) = 'platform_owner'::text)) WITH CHECK ((NULLIF(current_setting('app.role'::text, true), ''::text) = 'platform_owner'::text));
ALTER TABLE public.principal_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY principal_alerts_tenant_policy ON public.principal_alerts USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.principal_dashboard_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY principal_dashboard_snapshots_tenant_policy ON public.principal_dashboard_snapshots USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.procurement_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY procurement_approvals_tenant_policy ON public.procurement_approvals USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.procurement_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY procurement_audit_logs_tenant_policy ON public.procurement_audit_logs USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.procurement_budget_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY procurement_budget_links_tenant_policy ON public.procurement_budget_links USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.procurement_request_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY procurement_request_items_tenant_policy ON public.procurement_request_items USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.procurement_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY procurement_requests_tenant_policy ON public.procurement_requests USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.procurement_suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY procurement_suppliers_tenant_policy ON public.procurement_suppliers USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY purchase_order_items_tenant_policy ON public.purchase_order_items USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY purchase_orders_tenant_policy ON public.purchase_orders USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.report_card_artifacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY report_card_artifacts_tenant_policy ON public.report_card_artifacts USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.report_card_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY report_card_comments_rls_policy ON public.report_card_comments USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.report_card_generation_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY report_card_generation_batches_tenant_policy ON public.report_card_generation_batches USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.report_schedule_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY report_schedule_requests_tenant_policy ON public.report_schedule_requests USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.report_snapshot_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY report_snapshot_audit_logs_rls_policy ON public.report_snapshot_audit_logs USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'support_agent'::text, 'support_lead'::text, 'developer'::text, 'system'::text])))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'support_agent'::text, 'support_lead'::text, 'developer'::text, 'system'::text]))));
ALTER TABLE public.report_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY report_snapshots_rls_policy ON public.report_snapshots USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'support_agent'::text, 'support_lead'::text, 'developer'::text, 'system'::text])))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'support_agent'::text, 'support_lead'::text, 'developer'::text, 'system'::text]))));
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY role_permissions_rls_policy ON public.role_permissions USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'platform_owner'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'platform_owner'::text)));
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY roles_rls_policy ON public.roles USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'platform_owner'::text) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text) OR (COALESCE(NULLIF(current_setting('app.path'::text, true), ''::text), ''::text) ~~ '%/auth/invitations/accept%'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'platform_owner'::text) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text) OR (COALESCE(NULLIF(current_setting('app.path'::text, true), ''::text), ''::text) ~~ '%/auth/invitations/accept%'::text)));
ALTER TABLE public.school_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY school_integrations_rls_policy ON public.school_integrations USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.school_module_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY school_module_access_tenant_policy ON public.school_module_access USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = ANY (ARRAY['system'::text, 'superadmin'::text, 'platform_owner'::text])))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = ANY (ARRAY['system'::text, 'superadmin'::text, 'platform_owner'::text]))));
ALTER TABLE public.school_onboarding_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY school_onboarding_status_rls_policy ON public.school_onboarding_status USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.school_sms_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY school_sms_wallets_rls_policy ON public.school_sms_wallets USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.security_lost_found ENABLE ROW LEVEL SECURITY;
CREATE POLICY security_lost_found_tenant_policy ON public.security_lost_found USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY sms_logs_rls_policy ON public.sms_logs USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.sms_purchase_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY sms_purchase_requests_rls_policy ON public.sms_purchase_requests USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.sms_wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY sms_wallet_transactions_rls_policy ON public.sms_wallet_transactions USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_attendance_rls_policy ON public.staff_attendance USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.staff_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_audit_logs_rls_policy ON public.staff_audit_logs USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.staff_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_contracts_rls_policy ON public.staff_contracts USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.staff_departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_departments_rls_policy ON public.staff_departments USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.staff_disciplinary_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_disciplinary_records_rls_policy ON public.staff_disciplinary_records USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.staff_document_expiry_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_document_expiry_reminders_rls_policy ON public.staff_document_expiry_reminders USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.staff_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_documents_rls_policy ON public.staff_documents USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.staff_job_titles ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_job_titles_rls_policy ON public.staff_job_titles USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.staff_leave_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_leave_balances_rls_policy ON public.staff_leave_balances USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.staff_leave_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_leave_requests_rls_policy ON public.staff_leave_requests USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.staff_payroll_bands ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_payroll_bands_rls_policy ON public.staff_payroll_bands USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.staff_payslips ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_payslips_rls_policy ON public.staff_payslips USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.staff_performance_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_performance_reviews_rls_policy ON public.staff_performance_reviews USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_profiles_rls_policy ON public.staff_profiles USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.staff_salaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_salaries_rls_policy ON public.staff_salaries USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.student_academic_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY student_academic_enrollments_rls_policy ON public.student_academic_enrollments USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.student_academic_lifecycle_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY student_academic_lifecycle_events_rls_policy ON public.student_academic_lifecycle_events USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.student_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY student_allocations_rls_policy ON public.student_allocations USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.student_class_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY student_class_assignments_tenant_policy ON public.student_class_assignments USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.student_fee_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY student_fee_assignments_rls_policy ON public.student_fee_assignments USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.student_fee_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY student_fee_credits_rls_policy ON public.student_fee_credits USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.student_fee_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY student_fee_invoices_rls_policy ON public.student_fee_invoices USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.student_fee_payment_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY student_fee_payment_allocations_rls_policy ON public.student_fee_payment_allocations USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.student_fee_structures ENABLE ROW LEVEL SECURITY;
CREATE POLICY student_fee_structures_rls_policy ON public.student_fee_structures USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.student_guardians ENABLE ROW LEVEL SECURITY;
CREATE POLICY student_guardians_rls_policy ON public.student_guardians USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (COALESCE(NULLIF(current_setting('app.path'::text, true), ''::text), ''::text) ~~ '%/auth/invitations/accept%'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (COALESCE(NULLIF(current_setting('app.path'::text, true), ''::text), ''::text) ~~ '%/auth/invitations/accept%'::text)));
ALTER TABLE public.student_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY student_notes_rls_policy ON public.student_notes USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.student_portal_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY student_portal_access_rls_policy ON public.student_portal_access USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.student_report_card_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY student_report_card_audit_logs_tenant_policy ON public.student_report_card_audit_logs USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.student_report_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY student_report_cards_tenant_policy ON public.student_report_cards USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.student_subject_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY student_subject_enrollments_rls_policy ON public.student_subject_enrollments USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.student_timetable_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY student_timetable_enrollments_rls_policy ON public.student_timetable_enrollments USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.student_transfer_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY student_transfer_records_rls_policy ON public.student_transfer_records USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY students_rls_policy ON public.students USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY subjects_tenant_policy ON public.subjects USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY subscriptions_rls_policy ON public.subscriptions USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'system'::text])))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'system'::text]))));
ALTER TABLE public.supplier_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY supplier_invoices_tenant_policy ON public.supplier_invoices USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.support_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY support_agents_rls_policy ON public.support_agents USING ((current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'support_agent'::text, 'support_lead'::text, 'developer'::text, 'system'::text]))) WITH CHECK ((current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'support_lead'::text, 'system'::text])));
ALTER TABLE public.support_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY support_attachments_rls_policy ON public.support_attachments USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'support_agent'::text, 'support_lead'::text, 'developer'::text, 'system'::text])))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'support_agent'::text, 'support_lead'::text, 'developer'::text, 'system'::text]))));
ALTER TABLE public.support_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY support_components_rls_policy ON public.support_system_components USING (((tenant_id = 'global'::text) OR (tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'support_agent'::text, 'support_lead'::text, 'developer'::text, 'system'::text])))) WITH CHECK ((current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'support_lead'::text, 'system'::text])));
ALTER TABLE public.support_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY support_incidents_rls_policy ON public.support_incidents USING (((tenant_id = 'global'::text) OR (tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'support_agent'::text, 'support_lead'::text, 'developer'::text, 'system'::text])))) WITH CHECK ((current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'support_lead'::text, 'system'::text])));
ALTER TABLE public.support_internal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_kb_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY support_kb_rls_policy ON public.support_kb_articles USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (tenant_id = 'global'::text) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'support_agent'::text, 'support_lead'::text, 'developer'::text, 'system'::text])))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'support_agent'::text, 'support_lead'::text, 'developer'::text, 'system'::text]))));
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY support_messages_rls_policy ON public.support_messages USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'support_agent'::text, 'support_lead'::text, 'developer'::text, 'system'::text])))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'support_agent'::text, 'support_lead'::text, 'developer'::text, 'system'::text]))));
ALTER TABLE public.support_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY support_notifications_rls_policy ON public.support_notifications USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'support_agent'::text, 'support_lead'::text, 'developer'::text, 'system'::text])))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'support_agent'::text, 'support_lead'::text, 'developer'::text, 'system'::text]))));
CREATE POLICY support_private_notes_rls_policy ON public.support_internal_notes USING ((current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'support_agent'::text, 'support_lead'::text, 'developer'::text, 'system'::text]))) WITH CHECK ((current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'support_agent'::text, 'support_lead'::text, 'developer'::text, 'system'::text])));
CREATE POLICY support_reference_rls_policy ON public.support_categories USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (tenant_id = 'global'::text) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'support_agent'::text, 'support_lead'::text, 'developer'::text, 'system'::text])))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'support_agent'::text, 'support_lead'::text, 'developer'::text, 'system'::text]))));
ALTER TABLE public.support_status_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY support_status_logs_rls_policy ON public.support_status_logs USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'support_agent'::text, 'support_lead'::text, 'developer'::text, 'system'::text])))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'support_agent'::text, 'support_lead'::text, 'developer'::text, 'system'::text]))));
ALTER TABLE public.support_status_notification_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY support_status_notification_attempts_rls_policy ON public.support_status_notification_attempts USING (((tenant_id = 'global'::text) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'support_agent'::text, 'support_lead'::text, 'developer'::text, 'system'::text])))) WITH CHECK (((tenant_id = 'global'::text) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'support_agent'::text, 'support_lead'::text, 'developer'::text, 'system'::text]))));
ALTER TABLE public.support_status_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY support_status_subscriptions_rls_policy ON public.support_status_subscriptions USING (((tenant_id = 'global'::text) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'support_agent'::text, 'support_lead'::text, 'developer'::text, 'system'::text])))) WITH CHECK (((tenant_id = 'global'::text) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'support_agent'::text, 'support_lead'::text, 'developer'::text, 'system'::text]))));
ALTER TABLE public.support_status_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY support_status_unsubscribe_tokens_rls_policy ON public.support_status_unsubscribe_tokens USING (((tenant_id = 'global'::text) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'support_agent'::text, 'support_lead'::text, 'developer'::text, 'system'::text])))) WITH CHECK (((tenant_id = 'global'::text) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'support_agent'::text, 'support_lead'::text, 'developer'::text, 'system'::text]))));
ALTER TABLE public.support_system_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY support_tickets_rls_policy ON public.support_tickets USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'support_agent'::text, 'support_lead'::text, 'developer'::text, 'system'::text])))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (current_setting('app.role'::text, true) = ANY (ARRAY['platform_owner'::text, 'superadmin'::text, 'support_agent'::text, 'support_lead'::text, 'developer'::text, 'system'::text]))));
ALTER TABLE public.sync_cursors ENABLE ROW LEVEL SECURITY;
CREATE POLICY sync_cursors_rls_policy ON public.sync_cursors USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.sync_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY sync_devices_rls_policy ON public.sync_devices USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.sync_operation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY sync_operation_logs_insert_policy ON public.sync_operation_logs FOR INSERT WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
CREATE POLICY sync_operation_logs_select_policy ON public.sync_operation_logs FOR SELECT USING ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY tasks_rls_policy ON public.tasks USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.teacher_attendance_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY teacher_attendance_logs_tenant_policy ON public.teacher_attendance_logs USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.teacher_subject_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY teacher_subject_assignments_tenant_policy ON public.teacher_subject_assignments USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.tenant_bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_bank_accounts_rls_policy ON public.tenant_bank_accounts USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.tenant_domains ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_domains_rls_policy ON public.tenant_domains USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'platform_owner'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'platform_owner'::text)));
ALTER TABLE public.tenant_financial_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_financial_accounts_rls_policy ON public.tenant_financial_accounts USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.tenant_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_memberships_rls_policy ON public.tenant_memberships USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'platform_owner'::text) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text) OR (COALESCE(NULLIF(current_setting('app.path'::text, true), ''::text), ''::text) ~~ '%/auth/invitations/accept%'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'platform_owner'::text) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text) OR (COALESCE(NULLIF(current_setting('app.path'::text, true), ''::text), ''::text) ~~ '%/auth/invitations/accept%'::text)));
ALTER TABLE public.tenant_mpesa_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_mpesa_configs_rls_policy ON public.tenant_mpesa_configs USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.tenant_payment_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_payment_channels_rls_policy ON public.tenant_payment_channels USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenants_rls_policy ON public.tenants USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'platform_owner'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'platform_owner'::text)));
ALTER TABLE public.timetable_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY timetable_audit_logs_rls_policy ON public.timetable_audit_logs USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.timetable_common_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY timetable_common_blocks_rls_policy ON public.timetable_common_blocks USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.timetable_configurations ENABLE ROW LEVEL SECURITY;
CREATE POLICY timetable_configurations_rls_policy ON public.timetable_configurations USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.timetable_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY timetable_days_rls_policy ON public.timetable_days USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.timetable_generation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY timetable_generation_runs_rls_policy ON public.timetable_generation_runs USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.timetable_period_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY timetable_period_definitions_rls_policy ON public.timetable_period_definitions USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.timetable_relief_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY timetable_relief_assignments_rls_policy ON public.timetable_relief_assignments USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.timetable_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY timetable_resources_rls_policy ON public.timetable_resources USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.timetable_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY timetable_slots_rls_policy ON public.timetable_slots USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.timetable_subject_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY timetable_subject_requirements_rls_policy ON public.timetable_subject_requirements USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.timetable_teacher_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY timetable_teacher_availability_rls_policy ON public.timetable_teacher_availability USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.timetable_unscheduled_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY timetable_unscheduled_requirements_rls_policy ON public.timetable_unscheduled_requirements USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.timetable_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY timetable_versions_rls_policy ON public.timetable_versions USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY transactions_rls_policy ON public.transactions USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.transport_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY transport_alerts_tenant_policy ON public.transport_alerts USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.transport_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY transport_audit_logs_tenant_policy ON public.transport_audit_logs USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.transport_drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY transport_drivers_tenant_policy ON public.transport_drivers USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.transport_manifest_students ENABLE ROW LEVEL SECURITY;
CREATE POLICY transport_manifest_students_tenant_policy ON public.transport_manifest_students USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.transport_manifests ENABLE ROW LEVEL SECURITY;
CREATE POLICY transport_manifests_tenant_policy ON public.transport_manifests USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.transport_route_stops ENABLE ROW LEVEL SECURITY;
CREATE POLICY transport_route_stops_tenant_policy ON public.transport_route_stops USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.transport_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY transport_routes_tenant_policy ON public.transport_routes USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.transport_trip_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY transport_trip_events_tenant_policy ON public.transport_trip_events USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.transport_trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY transport_trips_tenant_policy ON public.transport_trips USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.transport_vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY transport_vehicles_tenant_policy ON public.transport_vehicles USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.usage_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY usage_records_insert_policy ON public.usage_records FOR INSERT WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
CREATE POLICY usage_records_select_policy ON public.usage_records FOR SELECT USING ((tenant_id = current_setting('app.tenant_id'::text, true)));
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_roles_rls_policy ON public.user_roles USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'platform_owner'::text) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'platform_owner'::text) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_delete_policy ON public.users FOR DELETE USING (((tenant_id = 'global'::text) AND ((id)::text = NULLIF(current_setting('app.user_id'::text, true), ''::text))));
CREATE POLICY users_insert_policy ON public.users FOR INSERT WITH CHECK (((tenant_id = 'global'::text) OR (tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'platform_owner'::text) OR ((COALESCE(NULLIF(current_setting('app.user_id'::text, true), ''::text), 'anonymous'::text) = 'anonymous'::text) AND (COALESCE(NULLIF(current_setting('app.path'::text, true), ''::text), ''::text) ~~ '%/auth/invitations/accept%'::text))));
CREATE POLICY users_select_policy ON public.users FOR SELECT USING ((((tenant_id = 'global'::text) AND ((id)::text = NULLIF(current_setting('app.user_id'::text, true), ''::text))) OR (tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'platform_owner'::text) OR ((COALESCE(NULLIF(current_setting('app.user_id'::text, true), ''::text), 'anonymous'::text) = 'anonymous'::text) AND (COALESCE(NULLIF(current_setting('app.path'::text, true), ''::text), ''::text) ~~ '%/auth/invitations/accept%'::text)) OR ((COALESCE(NULLIF(current_setting('app.user_id'::text, true), ''::text), 'anonymous'::text) = 'anonymous'::text) AND (COALESCE(NULLIF(current_setting('app.path'::text, true), ''::text), ''::text) ~~ '%/auth/email-verification/verify%'::text))));
CREATE POLICY users_update_policy ON public.users FOR UPDATE USING ((((tenant_id = 'global'::text) AND ((id)::text = NULLIF(current_setting('app.user_id'::text, true), ''::text))) OR (tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'platform_owner'::text) OR ((COALESCE(NULLIF(current_setting('app.user_id'::text, true), ''::text), 'anonymous'::text) = 'anonymous'::text) AND (COALESCE(NULLIF(current_setting('app.path'::text, true), ''::text), ''::text) ~~ '%/auth/invitations/accept%'::text)) OR ((COALESCE(NULLIF(current_setting('app.user_id'::text, true), ''::text), 'anonymous'::text) = 'anonymous'::text) AND (COALESCE(NULLIF(current_setting('app.path'::text, true), ''::text), ''::text) ~~ '%/auth/email-verification/verify%'::text)))) WITH CHECK ((((tenant_id = 'global'::text) AND ((id)::text = NULLIF(current_setting('app.user_id'::text, true), ''::text))) OR (tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'platform_owner'::text) OR ((COALESCE(NULLIF(current_setting('app.user_id'::text, true), ''::text), 'anonymous'::text) = 'anonymous'::text) AND (COALESCE(NULLIF(current_setting('app.path'::text, true), ''::text), ''::text) ~~ '%/auth/invitations/accept%'::text)) OR ((COALESCE(NULLIF(current_setting('app.user_id'::text, true), ''::text), 'anonymous'::text) = 'anonymous'::text) AND (COALESCE(NULLIF(current_setting('app.path'::text, true), ''::text), ''::text) ~~ '%/auth/email-verification/verify%'::text))));
ALTER TABLE public.vehicle_fuel_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY vehicle_fuel_logs_tenant_policy ON public.vehicle_fuel_logs USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.vehicle_service_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY vehicle_service_logs_tenant_policy ON public.vehicle_service_logs USING (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text))) WITH CHECK (((tenant_id = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.role'::text, true), ''::text) = 'system'::text)));
ALTER TABLE public.workflow_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY workflow_events_rls_policy ON public.workflow_events USING ((tenant_id = current_setting('app.tenant_id'::text, true))) WITH CHECK ((tenant_id = current_setting('app.tenant_id'::text, true)));
