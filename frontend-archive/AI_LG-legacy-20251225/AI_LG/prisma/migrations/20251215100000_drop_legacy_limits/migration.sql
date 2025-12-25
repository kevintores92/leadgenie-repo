-- Drop legacy daily/monthly limit columns safely if they exist
ALTER TABLE "Organization" DROP COLUMN IF EXISTS "dailyLimit";
ALTER TABLE "Organization" DROP COLUMN IF EXISTS "monthlyLimit";
