function collapseWhitespace(s) {
  return String(s).replace(/\s+/g, ' ').trim();
}

function normalizeZip(zip) {
  const z = collapseWhitespace(zip || '');
  // Keep 5 digits if present, preserve ZIP+4 if valid
  const m = z.match(/^(\d{5})(?:-(\d{4}))?$/);
  if (!m) return z;
  return m[2] ? `${m[1]}-${m[2]}` : m[1];
}

function normalizeState(state) {
  const s = collapseWhitespace(state || '');
  if (s.length === 2) return s.toUpperCase();
  return s;
}

/**
 * Light address normalization.
 * This is not USPS/CASS; it just standardizes whitespace and casing.
 */
function normalizeAddress(address) {
  if (!address) return '';
  return collapseWhitespace(address);
}

module.exports = {
  normalizeAddress,
  normalizeZip,
  normalizeState,
};
