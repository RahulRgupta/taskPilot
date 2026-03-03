-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "isVerified" BOOLEAN NOT NULL DEFAULT false;

-- Existing organizations (created by admin) are considered verified
UPDATE "Organization" SET "isVerified" = true WHERE "isVerified" = false;
