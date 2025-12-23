-- Add business information fields to Organization for 10DLC registration
ALTER TABLE "Organization" ADD COLUMN "legalName" TEXT;
ALTER TABLE "Organization" ADD COLUMN "dbaName" TEXT;
ALTER TABLE "Organization" ADD COLUMN "businessType" TEXT;
ALTER TABLE "Organization" ADD COLUMN "ein" TEXT;
ALTER TABLE "Organization" ADD COLUMN "address" TEXT;
ALTER TABLE "Organization" ADD COLUMN "city" TEXT;
ALTER TABLE "Organization" ADD COLUMN "state" TEXT;
ALTER TABLE "Organization" ADD COLUMN "zip" TEXT;
ALTER TABLE "Organization" ADD COLUMN "country" TEXT DEFAULT 'United States';
ALTER TABLE "Organization" ADD COLUMN "website" TEXT;
ALTER TABLE "Organization" ADD COLUMN "contactName" TEXT;
ALTER TABLE "Organization" ADD COLUMN "contactEmail" TEXT;
ALTER TABLE "Organization" ADD COLUMN "contactPhone" TEXT;
ALTER TABLE "Organization" ADD COLUMN "businessDescription" TEXT;
ALTER TABLE "Organization" ADD COLUMN "dlcBrandRegistered" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Organization" ADD COLUMN "dlcCampaignRegistered" BOOLEAN NOT NULL DEFAULT false;
