-- CreateEnum
CREATE TYPE "UploadJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "UploadJob" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "mobileCount" INTEGER NOT NULL DEFAULT 0,
    "landlineCount" INTEGER NOT NULL DEFAULT 0,
    "status" "UploadJobStatus" NOT NULL DEFAULT 'QUEUED',
    "zipPath" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UploadJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhoneValidationCache" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "phoneType" TEXT,
    "carrier" TEXT,
    "country" TEXT,
    "isValid" BOOLEAN NOT NULL DEFAULT false,
    "lastCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhoneValidationCache_pkey" PRIMARY KEY ("id")
);

-- AddFields to Contact
ALTER TABLE "Contact" ADD COLUMN "phoneType" TEXT;
ALTER TABLE "Contact" ADD COLUMN "carrier" TEXT;
ALTER TABLE "Contact" ADD COLUMN "country" TEXT;
ALTER TABLE "Contact" ADD COLUMN "isPhoneValid" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "UploadJob" ADD CONSTRAINT "UploadJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "PhoneValidationCache_phone_key" ON "PhoneValidationCache"("phone");
CREATE INDEX "PhoneValidationCache_phone_idx" ON "PhoneValidationCache"("phone");
CREATE INDEX "UploadJob_organizationId_idx" ON "UploadJob"("organizationId");
CREATE INDEX "UploadJob_status_idx" ON "UploadJob"("status");
