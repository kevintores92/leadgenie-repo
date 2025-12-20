const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Queue } = require('bullmq');
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
const prisma = new PrismaClient();

// Configure Redis for BullMQ
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

// Create queue for phone scrub jobs
const phoneScrubQueue = new Queue('phone-scrub', {
  connection: redisConfig,
});

// Configure multer for file uploads
const uploadDir = process.env.UPLOAD_STORAGE_PATH || 'storage/uploads';

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: (parseInt(process.env.MAX_UPLOAD_SIZE_MB || '50') * 1024 * 1024),
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.csv', '.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed: CSV, XLSX, XLS`));
    }
  },
});

/**
 * Verify JWT token
 */
function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * POST /upload/phone-scrub
 */
router.post('/phone-scrub', authenticate, upload.single('file'), async (req, res) => {
  try {
    const userId = req.user?.id;
    const orgId = req.user?.orgId;

    // Optional: mapping + brandId come as multipart fields
    let mapping = null;
    if (req.body?.mapping) {
      try {
        mapping = JSON.parse(req.body.mapping);
      } catch {
        return res.status(400).json({ error: 'Invalid mapping JSON' });
      }
    }
    const brandId = req.body?.brandId ? String(req.body.brandId) : null;

    if (!userId || !orgId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Validate file type
    const allowedExtensions = ['.csv', '.xlsx', '.xls'];
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    if (!allowedExtensions.includes(fileExt)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: `Invalid file type. Supported: CSV, XLSX, XLS` });
    }

    // Create upload job record
    const jobId = uuidv4();
    await prisma.uploadJob.create({
      data: {
        id: jobId,
        organizationId: orgId,
        originalFilename: req.file.originalname,
        status: 'QUEUED',
        totalRows: 0,
        mobileCount: 0,
        landlineCount: 0,
      },
    });

    // Queue the background job
    await phoneScrubQueue.add(
      'process-upload',
      {
        jobId,
        userId,
        orgId,
        filePath: req.file.path,
        filename: req.file.originalname,
        mapping,
        brandId,
        storeUnmappedCustomFields: true,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    );

    // Respond immediately with job ID
    return res.status(202).json({
      jobId,
      status: 'queued',
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({
      error: 'Upload failed',
      message: error.message,
    });
  }
});

/**
 * GET /upload/:jobId/status
 */
router.get('/:jobId/status', authenticate, async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const job = await prisma.uploadJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.orgId !== job.organizationId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const response = {
      jobId,
      status: job.status.toLowerCase(),
      total: job.totalRows,
      mobile: job.mobileCount,
      landline: job.landlineCount,
    };

    if (job.status === 'COMPLETED' && job.zipPath) {
      response.downloadUrl = `/upload/${jobId}/download`;
    }

    if (job.status === 'FAILED' && job.errorMessage) {
      response.error = job.errorMessage;
    }

    return res.json(response);
  } catch (error) {
    console.error('Status check error:', error);
    return res.status(500).json({
      error: 'Status check failed',
      message: error.message,
    });
  }
});

/**
 * GET /upload/:jobId/download
 */
router.get('/:jobId/download', authenticate, async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const job = await prisma.uploadJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.orgId !== job.organizationId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (job.status !== 'COMPLETED') {
      return res.status(400).json({
        error: 'Job not completed',
        status: job.status.toLowerCase(),
      });
    }

    if (!job.zipPath || !fs.existsSync(job.zipPath)) {
      return res.status(404).json({ error: 'ZIP file not found' });
    }

    const filename = `landlines-${jobId}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const fileStream = fs.createReadStream(job.zipPath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('Download stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Download failed' });
      }
    });
  } catch (error) {
    console.error('Download error:', error);
    return res.status(500).json({
      error: 'Download failed',
      message: error.message,
    });
  }
});

// Error handler for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'FILE_TOO_LARGE') {
      return res.status(413).json({
        error: `File too large. Maximum size: ${process.env.MAX_UPLOAD_SIZE_MB || 50}MB`,
      });
    }
  }

  if (error && error.message) {
    return res.status(400).json({ error: error.message });
  }

  next(error);
});

module.exports = router;

