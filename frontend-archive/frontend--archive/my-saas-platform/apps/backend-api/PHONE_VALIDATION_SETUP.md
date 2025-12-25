# Phone Validation System - Setup & Deployment Guide

## Quick Start

### 1. Environment Variables
Verify `.env` contains:
```dotenv
PHONE_CHECK_API_KEY=6945da43532a712bf81292cb-ec89fc7ca008
PHONE_CHECK_BASE_URL=https://phone-check.app/open-api
UPLOAD_STORAGE_PATH=storage/uploads
EXPORT_STORAGE_PATH=storage/exports
MAX_UPLOAD_SIZE_MB=50
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
DATABASE_URL=postgresql://...
JWT_SECRET=...
```

### 2. Dependencies
All required packages already installed in `package.json`:
- `@prisma/client` - Database ORM
- `bullmq` - Job queue
- `archiver` - ZIP file creation
- `axios` - HTTP requests
- `csv-parse` - CSV parsing
- `xlsx` - Excel parsing
- `libphonenumber-js` - Phone normalization
- `multer` - File uploads
- `ioredis` - Redis client

### 3. Start Services

#### Development (Local)
```bash
# Terminal 1: Redis (if not running)
redis-server

# Terminal 2: Backend API
cd my-saas-platform/apps/backend-api
npm install
npm start
# API runs on http://localhost:4000

# Terminal 3: Phone Scrub Worker
npm run worker:phone-scrub
# Worker processes background jobs
```

#### Production (Railway/Docker)
The system includes two separate containers:

1. **Main API Container** (`backend-api` service)
   - Runs: `npm start`
   - Exposes: Port 4000
   - Role: Accepts uploads, serves status & download endpoints

2. **Worker Container** (separate service)
   - Runs: `npm run worker:phone-scrub`
   - Role: Processes jobs from queue
   - Scaling: Can run multiple workers for higher throughput

Both containers connect to:
- Same PostgreSQL database
- Same Redis instance

## File Structure

```
my-saas-platform/apps/backend-api/
├── routes/
│   └── upload.js                    # Upload, status, download routes
├── src/
│   ├── services/
│   │   └── phoneCheck.service.js   # Phone validation API & caching
│   ├── utils/
│   │   ├── parseFile.js             # CSV/XLSX parsing
│   │   ├── normalizePhone.js        # E.164 normalization
│   │   └── createLandlineZip.js    # ZIP creation
│   └── workers/
│       └── phone-scrub-worker.js   # Background job processor
├── prisma/
│   └── schema.prisma                # Database schema (models included)
├── storage/
│   ├── uploads/                     # Temporary uploaded files
│   └── exports/                     # Persistent landline ZIPs
├── .env                             # Configuration with API key
├── package.json                     # Dependencies & scripts
└── PHONE_VALIDATION_IMPLEMENTATION.md  # Full documentation
```

## API Testing

### Using cURL

#### 1. Upload File
```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X POST http://localhost:4000/upload/phone-scrub \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.csv"

# Response:
# {
#   "jobId": "abc123def456",
#   "status": "queued"
# }
```

#### 2. Check Status
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/upload/abc123def456/status

# Response (processing):
# {
#   "jobId": "abc123def456",
#   "status": "processing",
#   "total": 1000,
#   "mobile": 0,
#   "landline": 0
# }

# Response (completed):
# {
#   "jobId": "abc123def456",
#   "status": "completed",
#   "total": 1000,
#   "mobile": 620,
#   "landline": 280,
#   "downloadUrl": "/upload/abc123def456/download"
# }
```

#### 3. Download Landline ZIP
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/upload/abc123def456/download \
  -o landlines.zip

# Extract and view
unzip -p landlines.zip | head -10
```

### Using JavaScript/Fetch

```javascript
const token = localStorage.getItem('authToken');
const file = document.getElementById('fileInput').files[0];

// 1. Upload
const formData = new FormData();
formData.append('file', file);

const uploadRes = await fetch('/upload/phone-scrub', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});

const { jobId, status } = await uploadRes.json();
console.log('Job ID:', jobId);

// 2. Poll status
let job = { status: 'processing' };
while (job.status === 'processing' || job.status === 'queued') {
  job = await fetch(`/upload/${jobId}/status`, {
    headers: { 'Authorization': `Bearer ${token}` }
  }).then(r => r.json());
  
  console.log(`Status: ${job.status} (${job.mobile}/${job.total} mobile)`);
  await new Promise(r => setTimeout(r, 2000)); // Poll every 2s
}

// 3. Download when complete
if (job.status === 'completed') {
  const downloadRes = await fetch(job.downloadUrl, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const blob = await downloadRes.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `landlines-${jobId}.zip`;
  a.click();
}
```

## Test Files

### Sample CSV (test.csv)
```
firstName,lastName,phone
John,Doe,202-555-0101
Jane,Smith,(202) 555-0102
Bob,Johnson,+12025550103
```

### Sample XLSX
Create in Excel:
- Column A: firstName
- Column B: lastName
- Column C: phone

## Monitoring

### Check API Health
```bash
curl http://localhost:4000/
# Response: { "ok": true }
```

### Check Worker Health
Look for in logs:
```
[Phone Scrub Worker] Ready to process jobs
[Phone Scrub Worker] Starting...
```

### Monitor Redis Queue
```bash
redis-cli
> KEYS phone-scrub:*
> QUEUE phone-scrub
> ZRANGE phone-scrub:active 0 -1
```

### Monitor Database
```bash
psql $DATABASE_URL

-- Check upload jobs
SELECT id, status, total_rows, mobile_count, landline_count 
FROM "UploadJob" 
ORDER BY created_at DESC LIMIT 10;

-- Check contacts added
SELECT COUNT(*) as total, COUNT(CASE WHEN "phoneType" = 'mobile' THEN 1 END) as mobile
FROM "Contact"
WHERE "createdAt" > NOW() - INTERVAL '1 hour';

-- Check cache
SELECT COUNT(*) as cached_numbers FROM "PhoneValidationCache";
```

## Performance Optimization

### For High Volume

1. **Increase Worker Concurrency**
   In `src/workers/phone-scrub-worker.js`:
   ```javascript
   concurrency: 4, // Process 4 jobs simultaneously
   ```

2. **Increase Batch Size**
   In `src/services/phoneCheck.service.js`:
   ```javascript
   const BATCH_SIZE = 500; // API supports up to 500
   ```

3. **Database Connection Pool**
   In `src/utils/prisma.ts`:
   ```javascript
   connection: {
     max: 50,
     timeout: 30000,
   }
   ```

4. **Increase Redis Memory**
   For Railway: Set memory plan to minimum 512MB

### Monitoring Metrics
- Jobs/hour: Check BullMQ queue depth
- Cache hit rate: Monitor API calls vs cache hits
- Average processing time: Check job execution time
- Storage usage: Monitor `storage/uploads` and `storage/exports`

## Troubleshooting

### Worker Not Processing

**Symptom:** Jobs stay in "queued" state

**Check:**
```bash
# 1. Worker running?
ps aux | grep phone-scrub-worker

# 2. Redis accessible?
redis-cli ping
# Should return PONG

# 3. Worker logs?
npm run worker:phone-scrub
# Look for "[Phone Scrub Worker] Ready to process jobs"

# 4. Queue has jobs?
redis-cli LLEN phone-scrub:_default:6379:jobs:
```

**Solution:**
```bash
# Restart worker
npm run worker:phone-scrub

# Or if using PM2
pm2 restart phone-scrub-worker
```

### API Key Not Working

**Symptom:** Jobs fail with "Phone validation API failed"

**Check:**
```bash
# 1. API key set?
echo $PHONE_CHECK_API_KEY

# 2. API key valid?
curl -X POST https://phone-check.app/open-api/check/v1/validate \
  -H "Authorization: Bearer 6945da43532a712bf81292cb-ec89fc7ca008" \
  -H "Content-Type: application/json" \
  -d '{"phone_numbers":["+12025550101"]}'
```

**Solution:**
- Check API key in `.env`
- Verify API key hasn't been revoked
- Check phone-check.app account quota

### File Upload Fails

**Symptom:** 413 Payload Too Large

**Solution:**
```dotenv
MAX_UPLOAD_SIZE_MB=100  # Increase limit
```

**Symptom:** Invalid file type error

**Solution:**
- Ensure file is .csv or .xlsx
- Check file extension, not just name

### Contacts Not Appearing

**Symptom:** Mobile count shows results, but no contacts in database

**Check:**
1. Job status is "COMPLETED"
2. Organization ID is correct
3. Check database:
```bash
SELECT * FROM "Contact" 
WHERE "organizationId" = 'org-xxx' 
AND "createdAt" > NOW() - INTERVAL '1 hour';
```

**Solution:**
- Contacts have unique constraint on (brandId, phone)
- If uploading same numbers to same org, they're skipped
- Try with different data or organization

## Deployment to Railway

### 1. Create Backend Service
- Name: `backend-api`
- Repository: GitHub repo
- Root: `my-saas-platform/apps/backend-api`
- Build command: `npm install && npx prisma migrate deploy`
- Start command: `npm start`

### 2. Create Worker Service
- Name: `phone-scrub-worker`
- Repository: Same GitHub repo
- Root: `my-saas-platform/apps/backend-api`
- Build command: `npm install`
- Start command: `npm run worker:phone-scrub`

### 3. Environment Variables
Set in Railway dashboard for both services:
```
DATABASE_URL=postgresql://...
JWT_SECRET=...
PHONE_CHECK_API_KEY=...
REDIS_URL=redis://...
NODE_ENV=production
```

### 4. Shared Services
Both services must connect to same:
- PostgreSQL database
- Redis instance
- Volume for storage (optional, use S3 for production)

## Security Considerations

1. **API Key Management**
   - Never commit `.env` to Git
   - Use Railway secrets for production
   - Rotate API key if exposed

2. **File Upload Security**
   - Max size: 50MB
   - Allowed formats: CSV, XLSX only
   - Cleaned up after processing
   - Authenticate all endpoints

3. **JWT Token**
   - Required for all endpoints
   - Verify orgId matches
   - 30-day expiration

4. **Database Access**
   - Contacts scoped to organization
   - Only authenticated users can access
   - Unique constraint prevents duplicates

## Maintenance

### Cleanup Tasks

**Daily:**
```bash
# Delete old uploads (> 1 hour old)
find storage/uploads -type f -mtime +0 -delete
```

**Weekly:**
```bash
# Delete old exports (> 30 days old)
find storage/exports -type f -mtime +30 -delete

# Prune old cache entries
DELETE FROM "PhoneValidationCache" 
WHERE "lastCheckedAt" < NOW() - INTERVAL '90 days';
```

## Support

For issues:
1. Check logs: API (`npm start`) and Worker (`npm run worker:phone-scrub`)
2. Verify database connection and Redis
3. Review PHONE_VALIDATION_IMPLEMENTATION.md
4. Check phone-check.app API status
