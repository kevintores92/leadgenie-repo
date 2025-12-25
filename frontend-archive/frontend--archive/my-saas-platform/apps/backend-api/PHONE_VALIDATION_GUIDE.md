# Phone List Validation & Scrubbing Feature

Complete implementation of phone list validation using phone-check.app API.

## Overview

This feature allows users to:
- Upload CSV/XLSX files containing phone numbers
- Validate numbers in real-time using phone-check.app API
- Split results into mobile (added to Contacts) and landline (exported ZIP)
- Download landline data for review or compliance

## Architecture

### Database Models
- **UploadJob**: Tracks upload status, counts, and ZIP location
- **PhoneValidationCache**: Caches validation results to reduce API calls
- **Contact**: Enhanced with phone validation fields

### Services
- **phoneCheck.service.ts**: API integration with batching and retries
- **normalizePhone.ts**: E.164 phone number normalization
- **parseFile.ts**: CSV/XLSX parsing with auto phone column detection
- **createLandlineZip.ts**: ZIP generation with CSV export

### Workers
- **phoneScrub.worker.ts**: Async job processor for BullMQ
- **phoneScrubWorker.ts**: Standalone worker service

### Controllers & Routes
- **upload.controller.ts**: API endpoints
- **routes/upload.js**: Route registration

## API Endpoints

### 1. Upload File
```
POST /upload/phone-scrub
Content-Type: multipart/form-data
Authorization: Bearer {jwt_token}

Body:
- file: CSV or XLSX file

Response (202 Accepted):
{
  "jobId": "uuid",
  "status": "queued"
}
```

### 2. Get Job Status
```
GET /upload/{jobId}/status
Authorization: Bearer {jwt_token}

Response (200):
{
  "jobId": "uuid",
  "status": "processing|completed|failed",
  "total": 1000,
  "mobile": 620,
  "landline": 280,
  "downloadUrl": "/upload/{jobId}/download"
}
```

### 3. Download Landline ZIP
```
GET /upload/{jobId}/download
Authorization: Bearer {jwt_token}

Response (200):
- ZIP file with landlines.csv inside
```

## Setup

### 1. Environment Variables
Add to `.env`:
```
PHONE_CHECK_API_KEY=your_api_key
PHONE_CHECK_BASE_URL=https://phone-check.app/open-api
REDIS_URL=redis://localhost:6379
UPLOAD_STORAGE_PATH=storage/uploads
EXPORT_STORAGE_PATH=storage/exports
MAX_UPLOAD_SIZE_MB=50
JWT_SECRET=your-secret-key
```

### 2. Install Dependencies
```bash
npm install archiver axios express-fileupload multer phone-number-parser phonenumberutil xlsx uuid
```

### 3. Database Migration
```bash
npx prisma migrate dev --name add_phone_validation
npx prisma generate
```

### 4. Start Services

**API Server:**
```bash
npm start
```

**Phone Scrub Worker:**
```bash
npm run worker:phone-scrub
```

## File Format Requirements

### CSV Format
```
firstName,lastName,phone,propertyAddress,propertyCity
John,Doe,+12015550123,123 Main St,New York
Jane,Smith,(201) 555-0123,456 Oak Ave,Boston
```

### XLSX Format
Same columns, standard Excel format.

### Supported Phone Column Names
- phone
- phone_number
- mobile
- cell
- phone1
- telephone
- primary_phone
- contact_phone

## Data Flow

1. **User uploads file**
   - API validates file type/size
   - Creates UploadJob record
   - Queues async job
   - Returns jobId immediately

2. **Worker processes file**
   - Parses CSV/XLSX
   - Normalizes phone numbers to E.164
   - Validates in batches using API
   - Checks cache first (no duplicate API calls)
   - Splits by phone type
   - Inserts mobile contacts
   - Generates ZIP with landlines

3. **User polls status**
   - Gets real-time progress
   - Downloads ZIP when ready

## Phone Validation Logic

### Normalization
- Converts to E.164 format: +[country][number]
- Removes formatting characters
- Validates length (7-15 digits)
- Infers country code

### API Calls
- Batched requests (100-500 per call)
- Cached results prevent duplicate calls
- Exponential backoff on failures
- Retry up to 3 times

### Data Splitting
```
is_valid && phone_type == "mobile"
  → Insert into Contacts table

phone_type == "landline"
  → Export to landlines.csv → ZIP

Everything else
  → Count but skip
```

## Response Format

### Contact Fields
```javascript
{
  phone: "+12015550123",
  phoneType: "mobile",
  carrier: "AT&T",
  country: "US",
  isPhoneValid: true
}
```

### Landline ZIP Contents
```
landlines.csv
├── phone
├── phone_type
├── carrier
├── country
└── is_valid
```

## Error Handling

### Upload Errors
- Invalid file type → 400
- File too large → 413
- No phone column → Job fails with message

### API Errors
- Network timeout → Retries with backoff
- Invalid API key → Job fails, logs error
- Partial failure → Continues with valid results

### Validation
- Invalid phone format → Logged as skipped
- API down → Returns false, continues
- Cache miss → API call made and cached

## Performance Considerations

### Batch Processing
- Default batch size: 100 phones per API call
- Adjustable via code
- Memory efficient streaming

### Caching
- Prevents duplicate API calls
- Last checked timestamp for freshness
- Database-backed, survives worker restarts

### Concurrency
- 2 workers processing jobs in parallel
- Configurable in phoneScrubWorker.ts
- Redis handles job queue

### Storage
- Uploads: `storage/uploads/` (deleted after processing)
- Exports: `storage/exports/` (retained for download)

## Monitoring & Logging

### Job Logs
```
[jobId] Starting phone scrub job for filename.csv
[jobId] Parsed 1000 rows
[jobId] Normalized phone numbers...
[jobId] Validation complete: 1000 results
[jobId] Results: 620 mobile, 280 landline
[jobId] Job completed successfully
```

### Error Logs
```
[jobId] Job failed: error message
Failed to validate +12015550123: Network timeout
Cache lookup failed for +12015550123: DB error
```

## Testing

### Test Upload
```bash
curl -X POST http://localhost:4000/upload/phone-scrub \
  -H "Authorization: Bearer {token}" \
  -F "file=@test.csv"
```

### Poll Status
```bash
curl http://localhost:4000/upload/{jobId}/status \
  -H "Authorization: Bearer {token}"
```

### Download ZIP
```bash
curl http://localhost:4000/upload/{jobId}/download \
  -H "Authorization: Bearer {token}" \
  -o landlines.zip
```

## Production Deployment

### Railway
- Set env vars in Railway dashboard
- Worker service: separate process
- Redis: Railway PostgreSQL + Managed Redis
- Storage: Use persistent volumes

### Docker
- Build with: `docker build -f Dockerfile .`
- Run worker as separate service
- Mount volumes for storage

### Scaling
- Increase worker concurrency for throughput
- Adjust batch sizes for network
- Monitor Redis connection pool

## Security

### Authentication
- All endpoints require JWT token
- User can only access own jobs
- Job data scoped to organization

### File Upload
- File type validation (CSV/XLSX only)
- Size limits enforced (50MB default)
- Temporary files cleaned up
- Stored outside web root

### API Security
- API key from environment
- No logging of sensitive data
- Phone numbers in cache only
- ZIP download requires auth

## Maintenance

### Database Cleanup
```sql
-- Delete old upload jobs (older than 30 days)
DELETE FROM "UploadJob" WHERE "createdAt" < NOW() - INTERVAL '30 days';

-- Refresh cache (older than 90 days)
DELETE FROM "PhoneValidationCache" WHERE "lastCheckedAt" < NOW() - INTERVAL '90 days';
```

### Storage Cleanup
```bash
# Delete old export files (older than 30 days)
find storage/exports -type f -mtime +30 -delete
```

## Troubleshooting

### Worker Not Processing Jobs
1. Check Redis connection: `redis-cli ping`
2. Check env vars: `PHONE_CHECK_API_KEY`, `REDIS_URL`
3. Check logs: `npm run worker:phone-scrub`
4. Restart worker process

### API Validation Failures
1. Check API key validity
2. Check API rate limits
3. Check network connectivity
4. Verify phone number format

### ZIP Download 404
1. Check job status is COMPLETED
2. Verify ZIP file exists at path
3. Check file permissions
4. Check storage directory exists

### Database Connection Errors
1. Check DATABASE_URL
2. Verify Prisma Client generated
3. Run migrations: `npx prisma migrate dev`
4. Check PostgreSQL is running

## Future Enhancements

- Webhook notifications on job completion
- Async download with email delivery
- Batch re-validation of cached numbers
- DNC list integration
- Phone validation filters/rules UI
- Bulk operation on imported contacts
