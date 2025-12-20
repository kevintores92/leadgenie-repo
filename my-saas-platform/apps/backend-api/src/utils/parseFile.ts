const fs = require('fs');
const path = require('path');
const csv = require('csv-parse');
const XLSX = require('xlsx');

/**
 * Detect phone column header in an array of headers
 * Looks for common phone column names
 */
function detectPhoneColumn(headers) {
  const phonePatterns = [
    /^phone/i,
    /^mobile/i,
    /^cell/i,
    /^phone_number/i,
    /^telephone/i,
    /^ph$/i,
    /^phone1$/i,
    /^primary_phone/i,
    /^contact_phone/i,
  ];

  for (let i = 0; i < headers.length; i++) {
    for (const pattern of phonePatterns) {
      if (pattern.test(headers[i])) {
        return i;
      }
    }
  }

  return -1;
}

/**
 * Parse CSV file and extract phone numbers
 */
async function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    let phoneColumnIndex = -1;
    let headers = [];
    let isFirstRow = true;

    const parser = fs.createReadStream(filePath).pipe(
      csv.parse({
        trim: true,
        skip_empty_lines: true,
      })
    );

    parser.on('readable', function () {
      let record;
      while ((record = parser.read()) !== null) {
        // First row is headers
        if (isFirstRow) {
          headers = record;
          phoneColumnIndex = detectPhoneColumn(headers);
          if (phoneColumnIndex === -1) {
            reject(
              new Error(
                `No phone column detected in CSV. Headers: ${headers.join(', ')}`
              )
            );
            parser.destroy();
            return;
          }
          isFirstRow = false;
          continue;
        }

        // Build row object
        const row = { phone: '' };
        for (let i = 0; i < headers.length; i++) {
          row[headers[i]] = record[i] || '';
        }
        row.phone = record[phoneColumnIndex] || '';

        if (row.phone.trim()) {
          rows.push(row);
        }
      }
    });

    parser.on('error', (error) => {
      reject(error);
    });

    parser.on('end', () => {
      if (rows.length === 0) {
        reject(new Error('CSV file contains no valid data rows'));
      } else {
        resolve(rows);
      }
    });
  });
}

/**
 * Parse XLSX file and extract phone numbers
 */
function parseXLSX(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error('XLSX file contains no sheets');
  }

  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  if (!rows || rows.length === 0) {
    throw new Error('XLSX sheet contains no data rows');
  }

  // Detect phone column
  const firstRow = rows[0];
  const headers = Object.keys(firstRow);
  const phoneColumnIndex = detectPhoneColumn(headers);

  if (phoneColumnIndex === -1) {
    throw new Error(
      `No phone column detected in XLSX. Headers: ${headers.join(', ')}`
    );
  }

  const phoneColumnName = headers[phoneColumnIndex];

  // Transform rows
  const parsedRows = [];
  for (const row of rows) {
    const phone = String(row[phoneColumnName] || '').trim();
    if (phone) {
      const parsedRow = { ...row, phone };
      parsedRows.push(parsedRow);
    }
  }

  if (parsedRows.length === 0) {
    throw new Error('No valid phone numbers found in XLSX file');
  }

  return parsedRows;
}

/**
 * Main file parser - handles CSV and XLSX
 * @param {string} filePath Absolute path to upload file
 * @returns {Promise<Array>} Parsed rows with phone field
 */
async function parseUploadFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.csv') {
    return await parseCSV(filePath);
  } else if (ext === '.xlsx' || ext === '.xls') {
    return parseXLSX(filePath);
  } else {
    throw new Error(
      `Unsupported file format: ${ext}. Supported: CSV, XLSX, XLS`
    );
  }
}

/**
 * Get file extension
 */
function getFileExtension(filePath) {
  return path.extname(filePath).toLowerCase();
}

module.exports = {
  parseUploadFile,
  getFileExtension,
};
