const fs = require('fs');
const path = require('path');
const parse = require('csv-parse/sync');
const xlsx = require('xlsx');

/**
 * Detect phone column by header name
 * Looks for common phone column headers
 */
function detectPhoneColumn(headers) {
  const phonePatterns = [
    /^phone$/i,
    /^phone_number$/i,
    /^phonenumber$/i,
    /^mobile$/i,
    /^cell$/i,
    /^cellphone$/i,
    /^telephone$/i,
    /^tel$/i,
    /^number$/i,
  ];

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i].trim().toLowerCase();
    if (phonePatterns.some(pattern => pattern.test(header))) {
      return i;
    }
  }

  return null;
}

/**
 * Parse CSV file and return array of objects
 */
function parseCSV(filePath) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = parse.parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });

    return records;
  } catch (error) {
    throw new Error(`Failed to parse CSV: ${error.message}`);
  }
}

/**
 * Parse XLSX file and return array of objects
 */
function parseXLSX(filePath) {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      throw new Error('No sheets found in XLSX file');
    }

    const worksheet = workbook.Sheets[sheetName];
    const records = xlsx.utils.sheet_to_json(worksheet, {
      defval: '',
      blankrows: false,
    });

    return records;
  } catch (error) {
    throw new Error(`Failed to parse XLSX: ${error.message}`);
  }
}

/**
 * Parse upload file (CSV or XLSX)
 * Returns array of rows with phone, firstName, lastName, and other fields
 */
async function parseUploadFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const ext = path.extname(filePath).toLowerCase();
    let records;

    if (ext === '.csv') {
      records = parseCSV(filePath);
    } else if (['.xlsx', '.xls'].includes(ext)) {
      records = parseXLSX(filePath);
    } else {
      throw new Error(`Unsupported file format: ${ext}`);
    }

    if (!records || records.length === 0) {
      throw new Error('File is empty or contains no valid data');
    }

    // Get headers from first record
    const headers = Object.keys(records[0]);
    const phoneColumnIndex = detectPhoneColumn(headers);

    if (phoneColumnIndex === null) {
      throw new Error('No phone column detected. Expected columns: phone, phone_number, mobile, cell, telephone, etc.');
    }

    const phoneColumn = headers[phoneColumnIndex];

    // Extract and normalize rows
    const rows = records
      .map((record, index) => {
        const phone = (record[phoneColumn] || '').toString().trim();

        if (!phone) {
          return null; // Skip empty phones
        }

        return {
          phone,
          firstName: (record.firstName || record.first_name || record.fname || record.FirstName || '').toString().trim() || 'N/A',
          lastName: (record.lastName || record.last_name || record.lname || record.LastName || '').toString().trim() || '',
          originalRecord: record, // Store full record for reference
        };
      })
      .filter(r => r !== null);

    console.log(`[parseUploadFile] Parsed ${rows.length} valid rows from ${records.length} total rows`);

    return rows;
  } catch (error) {
    throw new Error(`File parsing error: ${error.message}`);
  }
}

module.exports = {
  parseUploadFile,
  parseCSV,
  parseXLSX,
  detectPhoneColumn,
};
