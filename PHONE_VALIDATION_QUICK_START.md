# Phone Validation - Quick Start Checklist

## Pre-Flight Setup (5 minutes)

- [ ] Get phone-check.app API key from https://phone-check.app
- [ ] Set `PHONE_CHECK_API_KEY` in `.env`
- [ ] Verify Redis is running on localhost:6379
- [ ] Verify PostgreSQL is running

## Installation (2 minutes)

```bash
cd my-saas-platform/apps/backend-api

# Install new packages
npm install

# Create storage directories
mkdir -p storage/uploads storage/exports
```

## Database Setup (1 minute)

```bash
# Run migration (adds UploadJob, PhoneValidationCache, Contact fields)
npx prisma migrate dev

# Regenerate Prisma Client
npx prisma generate
```

## Start Services (2 minutes)

**Terminal 1:**
```bash
npm start
# ✓ Backend API listening on 4000
```

**Terminal 2:**
```bash
npm run worker:phone-scrub
# ✓ Phone Scrub Worker is ready to process jobs
```

## Test Upload (1 minute)

```bash
# Create test file
cat > test.csv << 'EOF'
firstName,lastName,phone
John,Doe,201-555-0123
Jane,Smith,+1 (555) 987-6543
EOF

# Replace {jwt_token} with valid token
curl -X POST http://localhost:4000/upload/phone-scrub \
  -H "Authorization: Bearer {jwt_token}" \
  -F "file=@test.csv"

# Response:
# {
#   "jobId": "550e8400-e29b-41d4-a716-446655440000",
#   "status": "queued"
# }
```

## Check Status (1 minute)

```bash
# Replace {jobId} with actual job ID
curl http://localhost:4000/upload/{jobId}/status \
  -H "Authorization: Bearer {jwt_token}"

# Response while processing:
# {
#   "jobId": "550e8400-e29b-41d4-a716-446655440000",
#   "status": "processing",
#   "total": 2,
#   "mobile": 1,
#   "landline": 0
# }

# Response when complete:
# {
#   "jobId": "550e8400-e29b-41d4-a716-446655440000",
#   "status": "completed",
#   "total": 2,
#   "mobile": 2,
#   "landline": 0,
#   "downloadUrl": "/upload/{jobId}/download"
# }
```

## Download Results (1 minute)

```bash
# When status is "completed"
curl http://localhost:4000/upload/{jobId}/download \
  -H "Authorization: Bearer {jwt_token}" \
  -o landlines.zip

# If landlines exist, ZIP will contain landlines.csv
```

## Check Inserted Contacts

```bash
# View newly imported mobile contacts
sqlite3 leadgenie.db << 'EOF'
SELECT phone, phoneType, carrier FROM "Contact" 
WHERE "isPhoneValid" = true 
AND "createdAt" > datetime('now', '-1 minute')
LIMIT 5;
EOF
```

## Common Issues & Fixes

| Problem | Solution |
|---------|----------|
| "Missing or invalid authorization header" | Pass `-H "Authorization: Bearer {token}"` |
| "PHONE_CHECK_API_KEY not set" | Check .env file has `PHONE_CHECK_API_KEY=...` |
| "Redis connection refused" | Start Redis: `redis-server` |
| "Worker not processing" | Check both Terminals, restart worker if needed |
| "Job stays in 'queued'" | Check worker Terminal for errors |
| "API returns 404 for landlines" | Job must be COMPLETED and have ZIP path |

## Next Steps

1. **Update Frontend** to call these endpoints
   - POST /upload/phone-scrub for file upload
   - GET /upload/:jobId/status for progress
   - GET /upload/:jobId/download for ZIP

2. **Add Job Notifications**
   - Webhook when job completes
   - Email delivery of ZIP

3. **Create Contact Bulk Actions**
   - Update imported contacts with tags
   - Add to campaigns
   - Assign to phone numbers

4. **Monitor & Optimize**
   - Track API usage per upload
   - Monitor cache hit rate
   - Profile slow uploads

## Documentation

- **Full Guide**: [PHONE_VALIDATION_GUIDE.md](./my-saas-platform/apps/backend-api/PHONE_VALIDATION_GUIDE.md)
- **Implementation Details**: [PHONE_VALIDATION_IMPLEMENTATION.md](./PHONE_VALIDATION_IMPLEMENTATION.md)

## Files Modified/Created

### New Files
- `src/utils/normalizePhone.ts` - Phone normalization
- `src/utils/parseFile.ts` - File parsing
- `src/utils/createLandlineZip.ts` - ZIP creation
- `src/services/phoneCheck.service.ts` - API service
- `src/workers/phone-scrub-worker.js` - Job processor
- `src/middleware/auth.ts` - Authentication
- `routes/upload.js` - Upload endpoints
- `PHONE_VALIDATION_GUIDE.md` - Full documentation

### Modified Files
- `package.json` - Added dependencies & scripts
- `.env.example` - Added env vars
- `prisma/schema.prisma` - Added models
- `src/app.js` - Added upload routes
- `prisma/migrations/` - Added migration

## Support

- See error logs in Terminal output
- Check database: `sqlite3 leadgenie.db "SELECT * FROM UploadJob;"`
- Verify file was parsed: Check storage/uploads/ is empty after job
- Check ZIP created: ls -lah storage/exports/
