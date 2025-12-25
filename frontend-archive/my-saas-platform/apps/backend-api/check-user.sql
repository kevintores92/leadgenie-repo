-- Check total users
SELECT COUNT(*) as total_users FROM "User";

-- Check for specific user
SELECT id, username, email, "createdAt" FROM "User" WHERE email = 'kmvirtualreassist@gmail.com' LIMIT 1;

-- Check upload jobs
SELECT id, "organizationId", "originalFilename", status, "totalRows", "mobileCount", "landlineCount", "createdAt" FROM "UploadJob" ORDER BY "createdAt" DESC LIMIT 5;
