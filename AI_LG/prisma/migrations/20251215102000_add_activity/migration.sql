-- Create Activity table
CREATE TABLE IF NOT EXISTS "Activity" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" TEXT NOT NULL,
  "userId" TEXT,
  "type" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "meta" JSONB,
  "createdAt" TIMESTAMP(3) DEFAULT now()
);

ALTER TABLE IF EXISTS "Activity" ADD CONSTRAINT fk_activity_organization FOREIGN KEY ("organizationId") REFERENCES "Organization" (id) ON DELETE CASCADE;
