# Phone List Validation & Scrubbing Implementation

## Overview

This system provides complete phone number validation and scrubbing for CSV/XLSX uploads using the phone-check.app Open API. The system normalizes phone numbers, validates them against the phone-check.app API with caching, and splits results into mobile contacts and landline exports.

## Architecture

### Components

1. **Upload Routes** (`routes/upload.js`)
   - `POST /upload/phone-scrub` - Accept file upload
   - `GET /upload/:jobId/status` - Check job progress
   - `GET /upload/:jobId/download` - Download landline ZIP

2. **Phone Check Service** (`src/services/phoneCheck.service.js`)
   - Batch API calls to phone-check.app
   - Caching layer for validated numbers
   - Retry logic with exponential backoff
   - Concurrent request management

3. **Phone Scrub Worker** (`src/workers/phone-scrub-worker.js`)
   - Background job processor using BullMQ
   - Parses uploaded files (CSV/XLSX)
   - Normalizes phone numbers to E.164
   - Validates via API with cache lookup
   - Inserts mobile contacts to database
   - Generates ZIP for landlines
   - Handles failures gracefully

4. **Utilities**
   - `parseFile.js` - CSV/XLSX parsing with phone column detection
   - `normalizePhone.js` - E.164 normalization using libphonenumber-js
   - `createLandlineZip.js` - ZIP file creation with CSV export

5. **Database Models** (Prisma)
   - `UploadJob` - Tracks upload status and results
   - `Contact` - Validated mobile numbers
   - `PhoneValidationCache` - Cached validation results

## Flow

```
User uploads file
        ↓
POST /upload/phone-scrub (authenticated)
        ↓
Validate file type and create UploadJob record
        ↓
Queue background job to BullMQ
        ↓
Return { jobId, status: "queued" } immediately
        ↓
Worker processes:
  ├─ Parse CSV/XLSX
  ├─ Normalize to E.164
  ├─ Check cache
  ├─ Batch validate uncached numbers via API
  ├─ Split mobile/landline
  ├─ Insert mobile contacts
  ├─ Generate landline ZIP
  └─ Update UploadJob status
        ↓
Frontend polls GET /upload/:jobId/status
        ↓
User downloads ZIP via GET /upload/:jobId/download
```

## API Endpoints

### Upload File
```
POST /upload/phone-scrub
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data

Request body:
- file: <CSV or XLSX file>

Response (202 Accepted):
{
  "jobId": "uuid-123",
  "status": "queued"
}
```

### Check Status
```
GET /upload/:jobId/status
Authorization: Bearer <jwt_token>

Response (200 OK):
{
  "jobId": "uuid-123",
  "status": "completed",
  "total": 1000,
  "mobile": 620,
  "landline": 280,
  "downloadUrl": "/upload/uuid-123/download"
}

Response (on processing):
{
  "jobId": "uuid-123",
  "status": "processing",
  "total": 1000,
  "mobile": 0,
  "landline": 0
}
```

### Download Landline ZIP
```
GET /upload/:jobId/download
Authorization: Bearer <jwt_token>

Response:
- Content-Type: application/zip
- File: landlines-{jobId}.zip
- Contains: CSV with columns [phone, phone_type, carrier, country, is_valid]
```

## File Parsing

### Supported Formats
- CSV (.csv)
- Excel (.xlsx, .xls)

### Phone Column Detection
Auto-detects phone column by header name:
- `phone`, `phone_number`, `phonenumber`
- `mobile`, `cell`, `cellphone`
- `telephone`, `tel`
- `number`

### Data Handling
- Skips empty phone numbers
- Trims whitespace
- Extracts firstName, lastName, and preserves original fields
- Stores original record for reference

## Phone Validation

### Normalization (E.164)
Uses `libphonenumber-js` to normalize to E.164 format:
- Input: "(202) 555-0123"
- Output: "+12025550123"

Default country: US (configurable)

### API Validation
Calls phone-check.app with batches of up to 100 numbers:
- Returns: `is_valid`, `phone_type`, `carrier`, `country`
- Phone types: `mobile`, `landline`, `voip`, `unknown`
- Retries: 3 attempts with exponential backoff

### Caching
- Stores validation results in `PhoneValidationCache`
- Checks cache before API call
- Reduces API costs and latency
- Updates on re-validation

## Data Splitting Rules

### Mobile Contacts → Contacts Table
- Criteria: `is_valid === true` AND `phone_type === "mobile"`
- Inserted with:
  - `phone` (E.164)
  - `firstName`, `lastName`
  - `phoneType`, `carrier`, `country`
  - `isPhoneValid` = true
  - Original fields (address, city, state, zip)

### Landlines → ZIP Export
- Criteria: `phone_type === "landline"` (any validity)
- CSV columns: `phone`, `phone_type`, `carrier`, `country`, `is_valid`

### Ignored
- All other types (voip, unknown, invalid)
- Still counted in totals

## Environment Variables

```dotenv
# Phone Validation API
PHONE_CHECK_API_KEY=6945da43532a712bf81292cb-ec89fc7ca008
PHONE_CHECK_BASE_URL=https://phone-check.app/open-api

# File Storage
UPLOAD_STORAGE_PATH=storage/uploads
EXPORT_STORAGE_PATH=storage/exports
MAX_UPLOAD_SIZE_MB=50

# Redis (BullMQ)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TLS=false

# Database
DATABASE_URL=postgresql://...

# Auth
JWT_SECRET=your-secret-key-change-in-production
NODE_ENV=production
```

## Running the System

### Backend API
```bash
cd my-saas-platform/apps/backend-api
npm install
npm start
# Starts API on port 4000
```

### Phone Scrub Worker
```bash
cd my-saas-platform/apps/backend-api
npm run worker:phone-scrub
# Processes background jobs from BullMQ queue
```

### Development
```bash
# Terminal 1: Start API
npm start

# Terminal 2: Start worker
npm run worker:phone-scrub

# Terminal 3: Start Redis (if needed)
redis-server
```

### Production (Railway/Docker)
- API runs in main container: `npm start`
- Worker runs in separate container or process: `npm run worker:phone-scrub`
- Both connect to same Redis and Postgres

## Storage

### Upload Directory
- Location: `storage/uploads/`
- Auto-created on first request
- Temporary files cleaned up after processing
- Max size: 50MB (configurable)

### Export Directory
- Location: `storage/exports/`
- ZIP files named: `landlines-{jobId}.zip`
- Persistent for download
- Cleanup: Manual or automated (30+ days old)

## Error Handling

### File Parsing Errors
- Invalid format → Job fails immediately
- Missing phone column → Job fails with clear message
- Empty file → Job fails

### Validation Errors
- API timeout → Retries 3x with backoff
- Partial failures → Continues processing, logs failures
- Invalid phone → Marked as invalid, not inserted

### Job Failures
- Status updated to `FAILED`
- Error message stored in database
- Uploaded file cleaned up
- User sees error via `/status` endpoint

## Logging

All operations logged with jobId for tracking:
```
[jobId] Parsing file...
[jobId] Parsed 1000 rows
[jobId] Normalizing phone numbers...
[jobId] Valid normalized phones: 985/1000
[jobId] Validating phones (batch processing with cache)...
[jobId] Results split: 620 mobile, 280 landline
[jobId] Inserting 620 mobile contacts...
[jobId] Creating landline ZIP...
[jobId] ZIP created: storage/exports/landlines-jobId.zip
[jobId] Job completed successfully
```

## Performance Considerations

### Batch Processing
- File parsing: Single pass
- API calls: Batches of 100
- Database inserts: Batches of 1000
- Progress: Logged every 100 processed

### Caching
- Reduces API calls by 30-70% on repeat uploads
- Cache hit rate improves over time
- Manual refresh via re-upload

### Async Processing
- Uploads return immediately (202 Accepted)
- Worker processes in background
- Frontend polls for status (recommended: every 2-5 seconds)
- Large files don't block API

## Testing

### Upload Test
```bash
curl -X POST http://localhost:4000/upload/phone-scrub \
  -H "Authorization: Bearer <token>" \
  -F "file=@test.csv"

# Response:
# {"jobId":"uuid-123","status":"queued"}
```

### Status Check
```bash
curl http://localhost:4000/upload/uuid-123/status \
  -H "Authorization: Bearer <token>"

# Response:
# {"jobId":"uuid-123","status":"completed",...}
```

### Download ZIP
```bash
curl http://localhost:4000/upload/uuid-123/download \
  -H "Authorization: Bearer <token>" \
  -o landlines.zip
```

## Troubleshooting

### Worker not processing jobs
1. Check Redis is running: `redis-cli ping`
2. Check worker process: `ps aux | grep phone-scrub-worker`
3. Check logs: Look for `[Phone Scrub Worker]` messages

### API validation failures
1. Check PHONE_CHECK_API_KEY is set
2. Check API rate limits: phone-check.app dashboard
3. Check network connectivity to phone-check.app

### ZIP file not found
1. Check EXPORT_STORAGE_PATH directory exists
2. Check disk space
3. Check job status shows COMPLETED

### Duplicate contacts
1. Contacts have unique constraint on (brandId, phone)
2. Re-uploads with same phone are skipped
3. To re-import: Change phone slightly or use different brand

## Future Enhancements

- Frontend upload UI with progress bar
- Batch re-validation of cached numbers
- Webhook notifications on job completion
- Contact deduplication across uploads
- Landline validation (CNAM lookup)
- Custom phone column mapping
- Email results when complete
