/*
  Warnings:

  - You are about to drop the column `content` on the `academics_lesson_logs` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `academics_lesson_logs` table. All the data in the column will be lost.
  - Added the required column `subject_id` to the `academics_assignments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `teacher_user_id` to the `academics_assignments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `date` to the `academics_lesson_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subject_id` to the `academics_lesson_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `teacher_user_id` to the `academics_lesson_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `topic` to the `academics_lesson_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subject_id` to the `academics_resources` table without a default value. This is not possible if the table is not empty.
  - Added the required column `teacher_user_id` to the `academics_resources` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `academics_resources` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "academics_assignments" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'Draft',
ADD COLUMN     "subject_id" TEXT NOT NULL,
ADD COLUMN     "teacher_user_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "academics_lesson_logs" DROP COLUMN "content",
DROP COLUMN "title",
ADD COLUMN     "date" DATE NOT NULL,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "subject_id" TEXT NOT NULL,
ADD COLUMN     "teacher_user_id" UUID NOT NULL,
ADD COLUMN     "topic" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "academics_resources" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'Draft',
ADD COLUMN     "subject_id" TEXT NOT NULL,
ADD COLUMN     "teacher_user_id" UUID NOT NULL,
ADD COLUMN     "type" TEXT NOT NULL;
