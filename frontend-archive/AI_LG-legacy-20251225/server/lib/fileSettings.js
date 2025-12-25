const fs = require('fs');
const path = require('path');

const FILE = path.resolve(__dirname, '../../data/settings.json');

function readSettings() {
  try {
    const raw = fs.readFileSync(FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

function writeSettings(obj) {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(obj, null, 2));
    return true;
  } catch (e) {
    console.error('writeSettings error', e);
    return false;
  }
}

module.exports = { readSettings, writeSettings };
