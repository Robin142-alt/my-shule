-- AlterTable
ALTER TABLE "admission_applications" ADD COLUMN     "allergies" TEXT,
ADD COLUMN     "birth_certificate_number" TEXT,
ADD COLUMN     "cbc_level" TEXT,
ADD COLUMN     "conditions" TEXT,
ADD COLUMN     "emergency_contact" TEXT,
ADD COLUMN     "kcpe_results" TEXT,
ADD COLUMN     "nationality" TEXT DEFAULT 'Kenyan',
ADD COLUMN     "nemis_upi" TEXT;
