-- Migration: Add CallRecord table for AI voice calls

CREATE TABLE IF NOT EXISTS "CallRecord" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "vapiCallId" TEXT UNIQUE,
  "contactId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "direction" TEXT NOT NULL, -- INBOUND or OUTBOUND
  "status" TEXT NOT NULL, -- QUEUED, RINGING, IN_PROGRESS, COMPLETED, FAILED, NO_ANSWER
  "callType" TEXT, -- COLD, WARM, HOT_FOLLOWUP
  "fromNumber" TEXT,
  "toNumber" TEXT NOT NULL,
  "duration" INTEGER, -- in seconds
  "transcript" TEXT,
  "recordingUrl" TEXT,
  "summary" TEXT,
  "cost" DOUBLE PRECISION,
  "endedReason" TEXT,
  "failureReason" TEXT,
  "startedAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "CallRecord_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE,
  CONSTRAINT "CallRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE
);

CREATE INDEX "CallRecord_contactId_idx" ON "CallRecord"("contactId");
CREATE INDEX "CallRecord_organizationId_idx" ON "CallRecord"("organizationId");
CREATE INDEX "CallRecord_vapiCallId_idx" ON "CallRecord"("vapiCallId");
CREATE INDEX "CallRecord_status_idx" ON "CallRecord"("status");

-- Add call tracking fields to Contact table
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "lastCallAt" TIMESTAMP(3);
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "callCount" INTEGER DEFAULT 0;
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "callbackTime" TEXT;

-- Add Activity table if not exists (for appointment scheduling)
CREATE TABLE IF NOT EXISTS "Activity" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "organizationId" TEXT NOT NULL,
  "contactId" TEXT,
  "type" TEXT NOT NULL, -- CALL_SCHEDULED, APPOINTMENT_SCHEDULED, NOTE, etc.
  "description" TEXT NOT NULL,
  "notes" TEXT,
  "scheduledFor" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "Activity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE,
  CONSTRAINT "Activity_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL
);

CREATE INDEX "Activity_organizationId_idx" ON "Activity"("organizationId");
CREATE INDEX "Activity_contactId_idx" ON "Activity"("contactId");
CREATE INDEX "Activity_scheduledFor_idx" ON "Activity"("scheduledFor");
