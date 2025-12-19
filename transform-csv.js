const fs = require('fs');
const path = require('path');

// Simple CSV parser and writer
function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        cell += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      row.push(cell.trim());
      cell = '';
    } else if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (cell.trim() || row.length > 0) {
        row.push(cell.trim());
        rows.push(row);
        row = [];
        cell = '';
      }
      if (char === '\r' && nextChar === '\n') i++;
    } else {
      cell += char;
    }
  }

  if (cell.trim() || row.length > 0) {
    row.push(cell.trim());
    rows.push(row);
  }

  return rows;
}

function writeCSV(rows) {
  return rows
    .map(row =>
      row
        .map(cell => {
          if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        })
        .join(',')
    )
    .join('\n');
}

// Main transformation
const inputPath = path.join(__dirname, 'my-saas-platform', 'Property Export High+Equity-contact-append.csv');
const outputPath = path.join(__dirname, 'my-saas-platform', 'Property Export High+Equity-contact-append-SPLIT.csv');

try {
  console.log('📥 Reading CSV file...');
  const content = fs.readFileSync(inputPath, 'utf-8');
  const rows = parseCSV(content);
  
  const headers = rows[0];
  console.log(`✓ Found ${headers.length} columns and ${rows.length - 1} data rows`);

  // Create column index map
  const colIndex = {};
  headers.forEach((h, i) => {
    colIndex[h] = i;
  });

  // New headers
  const newHeaders = [
    'First Name',
    'Last Name',
    'Address',
    'City',
    'State',
    'Zip',
    'Mailing Address',
    'Mailing Unit #',
    'Mailing City',
    'Mailing State',
    'Mailing Zip',
    'Phone',
    'County',
    'Property Type',
    'Bedrooms',
    'Bathrooms',
    'Est. Value',
    'Est. Equity',
  ];

  // Transform data rows
  const newRows = [newHeaders];
  for (let i = 1; i < rows.length; i++) {
    const oldRow = rows[i];
    const newRow = [
      oldRow[colIndex['Owner 1 First Name']] || '',
      oldRow[colIndex['Owner 1 Last Name']] || '',
      oldRow[colIndex['Address']] || '',
      oldRow[colIndex['City']] || '',
      oldRow[colIndex['State']] || '',
      oldRow[colIndex['Zip']] || '',
      oldRow[colIndex['Mailing Address']] || '',
      oldRow[colIndex['Mailing Unit #']] || '',
      oldRow[colIndex['Mailing City']] || '',
      oldRow[colIndex['Mailing State']] || '',
      oldRow[colIndex['Mailing Zip']] || '',
      oldRow[colIndex['Mobile Phone']] || '',
      oldRow[colIndex['County']] || '',
      oldRow[colIndex['Property Type']] || '',
      oldRow[colIndex['Bedrooms']] || '',
      oldRow[colIndex['Total Bathrooms']] || '',
      oldRow[colIndex['Est. Value']] || '',
      oldRow[colIndex['Est. Equity']] || '',
    ];
    newRows.push(newRow);
  }

  // Write output
  console.log('📝 Writing new CSV...');
  const output = writeCSV(newRows);
  fs.writeFileSync(outputPath, output, 'utf-8');

  console.log(`✅ Success!`);
  console.log(`📊 Transformed ${newRows.length - 1} rows`);
  console.log(`📋 New columns: ${newHeaders.length}`);
  console.log(`📁 Output: ${outputPath}`);
  console.log('\n🎯 Columns:');
  newHeaders.forEach(h => console.log(`  - ${h}`));
} catch (e) {
  console.error('❌ Error:', e.message);
  process.exit(1);
}
