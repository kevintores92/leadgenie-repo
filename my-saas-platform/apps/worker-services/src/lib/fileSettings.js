const fs = require('fs');
const path = require('path');

const FILE = path.resolve(__dirname, '../../../../apps/backend-api/data/settings.json');

function readSettings() {
  try {
    const raw = fs.readFileSync(FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

module.exports = { readSettings };
