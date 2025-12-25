This migration drops legacy `dailyLimit` and `monthlyLimit` columns from the `Organization` table.

To apply locally:

1. Ensure `DATABASE_URL` points to your dev database.
2. Run `npx prisma migrate dev --name drop-legacy-limits` or `npx prisma migrate deploy` in CI.

Note: the SQL uses `DROP COLUMN IF EXISTS` so it is safe to run even if the columns were already removed.