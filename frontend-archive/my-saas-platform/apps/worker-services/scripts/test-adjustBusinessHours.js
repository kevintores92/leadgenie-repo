// Lightweight test harness for business-hours adjustment (no project deps)
function adjustToBusinessHoursDelay(timestampMs, timeZone) {
  const dt = new Date(timestampMs);
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false }).formatToParts(dt);
  const map = {};
  for (const p of parts) map[p.type] = p.value;
  const hour = Number(map.hour);
  const minute = Number(map.minute);
  const second = Number(map.second);

  if (hour >= 7 && hour < 19) return timestampMs;

  let addDays = 0;
  if (hour >= 19) addDays = 1;

  const base = new Date(dt.getTime() + addDays * 24 * 60 * 60 * 1000);
  const parts2 = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false }).formatToParts(base);
  const map2 = {};
  for (const p of parts2) map2[p.type] = p.value;
  const y = Number(map2.year);
  const m = Number(map2.month);
  const d = Number(map2.day);

  const fallback = Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), 7, 0, 0);
  if (isNaN(fallback)) return timestampMs + addDays * 24 * 60 * 60 * 1000;
  return fallback;
}

function test(tz, ts = Date.now()){
  const next = adjustToBusinessHoursDelay(ts, tz);
  console.log(`TZ=${tz} now=${new Date(ts).toISOString()} -> next=${new Date(next).toISOString()}`);
}

[ 'America/Los_Angeles', 'America/New_York', 'Europe/London', 'UTC' ].forEach(tz => test(tz));
