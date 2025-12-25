const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { Writable } = require('stream');

/**
 * Create a ZIP file containing landline CSV
 * Returns the path to the created ZIP file
 */
async function createLandlineZip(landlineRows, jobId, exportPath) {
  return new Promise(async (resolve, reject) => {
    try {
      // Ensure export directory exists
      if (!fs.existsSync(exportPath)) {
        fs.mkdirSync(exportPath, { recursive: true });
      }

      const zipFilePath = path.join(exportPath, `landlines-${jobId}.zip`);
      const csvFileName = `landlines-${jobId}.csv`;

      // Create write stream for ZIP
      const output = fs.createWriteStream(zipFilePath);

      // Create archiver
      const archive = archiver('zip', {
        zlib: { level: 9 }, // Maximum compression
      });

      // Handle errors
      output.on('error', (err) => {
        reject(new Error(`Failed to write ZIP file: ${err.message}`));
      });

      archive.on('error', (err) => {
        reject(new Error(`Failed to create ZIP: ${err.message}`));
      });

      // Pipe archive to output
      archive.pipe(output);

      // Create CSV content from landline rows
      const csvContent = createLandlineCSV(landlineRows);

      // Add CSV to archive
      archive.append(csvContent, { name: csvFileName });

      // Finalize archive
      archive.finalize();

      // Resolve when finished
      output.on('close', () => {
        console.log(`[createLandlineZip] Created ZIP: ${zipFilePath} (${archive.pointer()} bytes)`);
        resolve(zipFilePath);
      });
    } catch (error) {
      reject(new Error(`ZIP creation error: ${error.message}`));
    }
  });
}

/**
 * Create CSV content for landline numbers
 * Format: phone, phone_type, carrier, country, is_valid
 */
function createLandlineCSV(landlineRows) {
  const headers = ['phone', 'phone_type', 'carrier', 'country', 'is_valid'];
  const csvLines = [headers.join(',')];

  for (const row of landlineRows) {
    const values = [
      `"${(row.phone || '').replace(/"/g, '""')}"`, // Escape quotes
      row.phone_type || 'landline',
      `"${(row.carrier || '').replace(/"/g, '""')}"`,
      row.country || '',
      row.is_valid ? 'true' : 'false',
    ];
    csvLines.push(values.join(','));
  }

  return csvLines.join('\n');
}

/**
 * Clean up old ZIP files (older than specified days)
 */
async function cleanupOldZips(exportPath, maxAgeDays = 30) {
  try {
    if (!fs.existsSync(exportPath)) {
      return;
    }

    const now = Date.now();
    const maxAge = maxAgeDays * 24 * 60 * 60 * 1000;

    const files = fs.readdirSync(exportPath);

    for (const file of files) {
      if (!file.endsWith('.zip')) {
        continue;
      }

      const filePath = path.join(exportPath, file);
      const stat = fs.statSync(filePath);
      const age = now - stat.mtimeMs;

      if (age > maxAge) {
        fs.unlinkSync(filePath);
        console.log(`[cleanupOldZips] Deleted old ZIP: ${file}`);
      }
    }
  } catch (error) {
    console.error('[cleanupOldZips] Error:', error.message);
  }
}

module.exports = {
  createLandlineZip,
  createLandlineCSV,
  cleanupOldZips,
};
