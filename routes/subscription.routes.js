const express = require('express');
const router = express.Router();
const { initiateSubscriptionPayment, verifySubscriptionPayment } = require('../controllers/subscription.controller');
const { authenticateToken } = require('../middleware/auth');

router.post('/initiate', authenticateToken, initiateSubscriptionPayment);
router.post('/verify', authenticateToken, verifySubscriptionPayment);

module.exports = router;
