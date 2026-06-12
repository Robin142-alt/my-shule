-- AlterTable
ALTER TABLE "students" ADD COLUMN     "created_by_user_id" TEXT,
ADD COLUMN     "metadata" JSONB DEFAULT '{}',
ADD COLUMN     "primary_guardian_name" TEXT,
ADD COLUMN     "primary_guardian_phone" TEXT,
ADD COLUMN     "updated_by_user_id" TEXT;
