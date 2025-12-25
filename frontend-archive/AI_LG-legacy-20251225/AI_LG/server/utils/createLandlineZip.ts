const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

/**
 * Create a ZIP file containing landline data as CSV
 * @param {Array} landlines Array of landline records
 * @param {string} outputPath Absolute path where ZIP should be saved
 * @returns {Promise<string>} Path to created ZIP file
 */
async function createLandlineZip(landlines, outputPath) {
  return new Promise((resolve, reject) => {
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Create ZIP archive
    const archive = archiver.create('zip', { zlib: { level: 9 } });
    const output = fs.createWriteStream(outputPath);

    output.on('close', () => {
      resolve(outputPath);
    });

    archive.on('error', (error) => {
      reject(error);
    });

    output.on('error', (error) => {
      reject(error);
    });

    archive.pipe(output);

    // Generate CSV content
    const csvContent = generateLandlineCSV(landlines);

    // Add CSV to archive
    archive.append(csvContent, { name: 'landlines.csv' });

    // Finalize archive
    archive.finalize();
  });
}

/**
 * Generate CSV content from landline records
 */
function generateLandlineCSV(landlines) {
  if (!landlines || landlines.length === 0) {
    return 'phone,phone_type,carrier,country,is_valid\n';
  }

  // CSV Headers
  const headers = ['phone', 'phone_type', 'carrier', 'country', 'is_valid'];
  const rows = [headers.map(escapeCSVField).join(',')];

  // Data rows
  for (const record of landlines) {
    const row = [
      record.phone,
      record.phone_type || '',
      record.carrier || '',
      record.country || '',
      record.is_valid ? 'true' : 'false',
    ];
    rows.push(row.map(escapeCSVField).join(','));
  }

  return rows.join('\n') + '\n';
}

/**
 * Escape CSV field values (handle quotes, commas, newlines)
 */
function escapeCSVField(field) {
  if (field === null || field === undefined) {
    return '';
  }

  let str = String(field);

  // If field contains comma, quote, or newline, wrap in quotes and escape inner quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    str = '"' + str.replace(/"/g, '""') + '"';
  }

  return str;
}

module.exports = {
  createLandlineZip,
};
