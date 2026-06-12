-- AlterTable
ALTER TABLE "classes" ADD COLUMN     "academic_level_id" TEXT;

-- CreateTable
CREATE TABLE "academic_levels" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "system_type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "audit_log_reference" UUID,

    CONSTRAINT "academic_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_class_assignments" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "class_section_id" TEXT NOT NULL,
    "stream_id" TEXT,
    "academic_level_id" TEXT NOT NULL,
    "academic_year_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "assigned_by_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "audit_log_reference" UUID,

    CONSTRAINT "student_class_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_card_comments" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "academic_term_id" TEXT NOT NULL,
    "class_section_id" TEXT NOT NULL,
    "academic_comment" TEXT,
    "behaviour_comment" TEXT,
    "attendance_comment" TEXT,
    "improvement_advice" TEXT,
    "final_comment" TEXT NOT NULL,
    "comment_status" TEXT NOT NULL DEFAULT 'draft',
    "created_by_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_card_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_notes" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "note_type" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'private',
    "description" TEXT NOT NULL,
    "follow_up_date" DATE,
    "created_by_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parent_meetings" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "guardian_id" TEXT,
    "reason" TEXT NOT NULL,
    "meeting_type" TEXT NOT NULL,
    "meeting_date" DATE NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "notes" TEXT,
    "created_by_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parent_meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_requests" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "student_id" TEXT,
    "request_type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "target_role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "created_by_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_audit_logs" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID,
    "action" TEXT NOT NULL,
    "actor_user_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academic_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academics_grading_systems" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academics_grading_systems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academics_attendance_settings" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academics_attendance_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academics_assignments" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "due_date" TIMESTAMP(3),
    "class_section_id" TEXT,
    "created_by_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academics_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academics_resources" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "class_section_id" TEXT,
    "created_by_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academics_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academics_lesson_logs" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "class_section_id" TEXT,
    "created_by_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academics_lesson_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academics_class_teachers" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "academic_year_id" TEXT NOT NULL,
    "class_section_id" TEXT NOT NULL,
    "teacher_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academics_class_teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academics_report_card_settings" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "grading_system_id" UUID,
    "show_rank" BOOLEAN NOT NULL DEFAULT false,
    "show_attendance" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academics_report_card_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "academic_levels_school_id_order_index_idx" ON "academic_levels"("school_id", "order_index");

-- CreateIndex
CREATE UNIQUE INDEX "academic_levels_school_id_id_key" ON "academic_levels"("school_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "academic_levels_school_id_order_index_key" ON "academic_levels"("school_id", "order_index");

-- CreateIndex
CREATE UNIQUE INDEX "student_class_assignments_school_id_id_key" ON "student_class_assignments"("school_id", "id");

-- CreateIndex
CREATE INDEX "report_card_comments_school_id_academic_term_id_class_secti_idx" ON "report_card_comments"("school_id", "academic_term_id", "class_section_id");

-- CreateIndex
CREATE UNIQUE INDEX "report_card_comments_school_id_id_key" ON "report_card_comments"("school_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "student_notes_school_id_id_key" ON "student_notes"("school_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "parent_meetings_school_id_id_key" ON "parent_meetings"("school_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "class_requests_school_id_id_key" ON "class_requests"("school_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "academics_grading_systems_school_id_name_key" ON "academics_grading_systems"("school_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "academics_attendance_settings_school_id_name_key" ON "academics_attendance_settings"("school_id", "name");

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_academic_level_id_fkey" FOREIGN KEY ("academic_level_id") REFERENCES "academic_levels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_levels" ADD CONSTRAINT "academic_levels_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_class_assignments" ADD CONSTRAINT "student_class_assignments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_class_assignments" ADD CONSTRAINT "student_class_assignments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_class_assignments" ADD CONSTRAINT "student_class_assignments_class_section_id_fkey" FOREIGN KEY ("class_section_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_class_assignments" ADD CONSTRAINT "student_class_assignments_stream_id_fkey" FOREIGN KEY ("stream_id") REFERENCES "streams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_class_assignments" ADD CONSTRAINT "student_class_assignments_academic_level_id_fkey" FOREIGN KEY ("academic_level_id") REFERENCES "academic_levels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_class_assignments" ADD CONSTRAINT "student_class_assignments_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_card_comments" ADD CONSTRAINT "report_card_comments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_card_comments" ADD CONSTRAINT "report_card_comments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_card_comments" ADD CONSTRAINT "report_card_comments_academic_term_id_fkey" FOREIGN KEY ("academic_term_id") REFERENCES "terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_card_comments" ADD CONSTRAINT "report_card_comments_class_section_id_fkey" FOREIGN KEY ("class_section_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_notes" ADD CONSTRAINT "student_notes_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_notes" ADD CONSTRAINT "student_notes_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_meetings" ADD CONSTRAINT "parent_meetings_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_meetings" ADD CONSTRAINT "parent_meetings_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_requests" ADD CONSTRAINT "class_requests_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_requests" ADD CONSTRAINT "class_requests_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_audit_logs" ADD CONSTRAINT "academic_audit_logs_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academics_grading_systems" ADD CONSTRAINT "academics_grading_systems_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academics_attendance_settings" ADD CONSTRAINT "academics_attendance_settings_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academics_assignments" ADD CONSTRAINT "academics_assignments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academics_assignments" ADD CONSTRAINT "academics_assignments_class_section_id_fkey" FOREIGN KEY ("class_section_id") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academics_resources" ADD CONSTRAINT "academics_resources_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academics_resources" ADD CONSTRAINT "academics_resources_class_section_id_fkey" FOREIGN KEY ("class_section_id") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academics_lesson_logs" ADD CONSTRAINT "academics_lesson_logs_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academics_lesson_logs" ADD CONSTRAINT "academics_lesson_logs_class_section_id_fkey" FOREIGN KEY ("class_section_id") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academics_class_teachers" ADD CONSTRAINT "academics_class_teachers_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academics_class_teachers" ADD CONSTRAINT "academics_class_teachers_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academics_class_teachers" ADD CONSTRAINT "academics_class_teachers_class_section_id_fkey" FOREIGN KEY ("class_section_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academics_report_card_settings" ADD CONSTRAINT "academics_report_card_settings_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
