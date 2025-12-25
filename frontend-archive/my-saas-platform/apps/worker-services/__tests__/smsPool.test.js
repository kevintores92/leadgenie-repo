const { hash, selectPhoneNumber } = require('../src/lib/smsPool');

test('hash is deterministic and non-negative', () => {
  const a = hash('contact-1');
  const b = hash('contact-1');
  expect(typeof a).toBe('number');
  expect(a).toBe(b);
  expect(a).toBeGreaterThanOrEqual(0);
});

test('selectPhoneNumber picks same index for same contact', () => {
  const pool = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const first = selectPhoneNumber('contact-ABC', pool);
  const second = selectPhoneNumber('contact-ABC', pool);
  expect(first).toEqual(second);
});
