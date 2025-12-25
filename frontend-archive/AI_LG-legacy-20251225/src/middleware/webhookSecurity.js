function webhookLogger(req, res, next) {
  console.log(`[webhook] ${req.method} ${req.originalUrl} - IP:${req.ip}`);
  next();
}

let requestCount = 0;
let windowStart = Date.now();
const LIMIT = 200; // approx per minute

function globalRateLimiter(req, res, next) {
  const now = Date.now();
  if (now - windowStart > 60 * 1000) {
    windowStart = now;
    requestCount = 0;
  }
  requestCount++;
  if (requestCount > LIMIT) {
    res.status(429).json({ error: 'Rate limit exceeded' });
    return;
  }
  next();
}

module.exports = { webhookLogger, globalRateLimiter };
