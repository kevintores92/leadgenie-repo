import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import * as path from 'path';
import * as fs from 'fs';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

// Initialize Redis for BullMQ
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

// Create queue for phone scrub jobs
const phoneScrubQueue = new Queue('phone-scrub', {
  connection: redisConfig,
});

/**
 * POST /upload/phone-scrub
 * Handle file upload and queue phone validation job
 */
export async function uploadPhoneScrub(req: Request, res: Response) {
  try {
    // Get user from auth middleware
    const userId = (req as any).user?.id;
    const orgId = (req as any).user?.orgId;

    if (!userId || !orgId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Validate file type
    const allowedExtensions = ['.csv', '.xlsx', '.xls'];
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    if (!allowedExtensions.includes(fileExt)) {
      // Clean up file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: `Invalid file type. Supported: CSV, XLSX, XLS`,
      });
    }

    // Check file size (max 50MB by default)
    const maxSizeMB = parseInt(process.env.MAX_UPLOAD_SIZE_MB || '50');
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (req.file.size > maxSizeBytes) {
      fs.unlinkSync(req.file.path);
      return res.status(413).json({
        error: `File too large. Maximum size: ${maxSizeMB}MB`,
      });
    }

    // Optional: mapping + brandId (multipart fields)
    let mapping: Record<string, string> | null = null;
    if ((req as any).body?.mapping) {
      try {
        mapping = JSON.parse((req as any).body.mapping);
      } catch {
        return res.status(400).json({ error: 'Invalid mapping JSON' });
      }
    }
    const brandId = (req as any).body?.brandId ? String((req as any).body.brandId) : null;

    // Create upload job record
    const jobId = uuidv4();
    const uploadJob = await prisma.uploadJob.create({
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
  } catch (error: any) {
    console.error('Upload error:', error);
    return res.status(500).json({
      error: 'Upload failed',
      message: error.message,
    });
  }
}

/**
 * GET /upload/:jobId/status
 * Get job status and counts
 */
export async function getUploadStatus(req: Request, res: Response) {
  try {
    const { jobId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get job from database
    const job = await prisma.uploadJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Verify user owns this job
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.orgId !== job.organizationId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Build response
    const response: any = {
      jobId,
      status: job.status.toLowerCase(),
      total: job.totalRows,
      mobile: job.mobileCount,
      landline: job.landlineCount,
    };

    // Add download URL if completed
    if (job.status === 'COMPLETED' && job.zipPath) {
      response.downloadUrl = `/upload/${jobId}/download`;
    }

    // Add error message if failed
    if (job.status === 'FAILED' && job.errorMessage) {
      response.error = job.errorMessage;
    }

    return res.json(response);
  } catch (error: any) {
    console.error('Status check error:', error);
    return res.status(500).json({
      error: 'Status check failed',
      message: error.message,
    });
  }
}

/**
 * GET /upload/:jobId/download
 * Download ZIP file with landline data
 */
export async function downloadZip(req: Request, res: Response) {
  try {
    const { jobId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get job from database
    const job = await prisma.uploadJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Verify user owns this job
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.orgId !== job.organizationId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Check if job is completed
    if (job.status !== 'COMPLETED') {
      return res.status(400).json({
        error: 'Job not completed',
        status: job.status.toLowerCase(),
      });
    }

    // Check if ZIP exists
    if (!job.zipPath || !fs.existsSync(job.zipPath)) {
      return res.status(404).json({ error: 'ZIP file not found' });
    }

    // Send file
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
  } catch (error: any) {
    console.error('Download error:', error);
    return res.status(500).json({
      error: 'Download failed',
      message: error.message,
    });
  }
}
