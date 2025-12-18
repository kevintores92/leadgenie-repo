function hash(input) {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = Math.imul(31, h) + input.charCodeAt(i);
  }
  return Math.abs(h);
}

function selectPhoneNumber(contactId, pool) {
  if (!pool || pool.length === 0) return null;
  const idx = hash(contactId) % pool.length;
  return pool[idx];
}

module.exports = { hash, selectPhoneNumber };
