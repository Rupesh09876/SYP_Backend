const express = require('express');
const router = express.Router();
const { getBills, initiateKhaltiPayment, verifyPayment } = require('../controllers/billing.controller');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, getBills);
router.post('/khalti/initiate', authenticateToken, initiateKhaltiPayment);
router.post('/khalti/verify', authenticateToken, verifyPayment);

module.exports = router;
