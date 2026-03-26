const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const {
    createReport,
    getReports,
    getPublicReport,
    getShareToken
} = require('../controllers/report.controller');

// Authenticated routes
router.post('/', authenticateToken, authorizeRoles('doctor'), createReport);
router.post('/:id/share', authenticateToken, getShareToken);
router.get('/', authenticateToken, authorizeRoles('patient', 'doctor', 'admin'), getReports);

// Public routes (unauthenticated)
router.get('/public/:id', getPublicReport);

module.exports = router;
