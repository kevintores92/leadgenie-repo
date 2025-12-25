const { adjustToBusinessHoursDelay } = require('../src/campaignSender');

function test(tz, ts = Date.now()){
  const next = adjustToBusinessHoursDelay(ts, tz);
  console.log(`TZ=${tz} now=${new Date(ts).toISOString()} -> next=${new Date(next).toISOString()}`);
}

// Example zones
[ 'America/Los_Angeles', 'America/New_York', 'Europe/London', 'UTC' ].forEach(tz => test(tz));
