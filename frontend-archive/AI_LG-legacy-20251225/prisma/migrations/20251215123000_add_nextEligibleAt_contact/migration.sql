-- Add nextEligibleAt to Contact
ALTER TABLE IF EXISTS "Contact" ADD COLUMN IF NOT EXISTS "nextEligibleAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS idx_contact_nextEligibleAt ON "Contact" ("nextEligibleAt");
