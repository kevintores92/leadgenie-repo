const express = require('express');
const router = express.Router();

// Verification endpoints removed. This router intentionally provides no
// verification routes to avoid crashes when external services are not configured.

// Lightweight health endpoint for verification route
router.get('/ping', (req, res) => res.json({ ok: true, verification: 'disabled' }));

module.exports = router;
