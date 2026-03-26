const express = require('express');
const router = express.Router();
const { sendMessage, getMessages, getChatList, initiateCall } = require('../controllers/chat.controller');
const { authenticateToken } = require('../middleware/auth');

router.post('/send', authenticateToken, sendMessage);
router.post('/call/initiate', authenticateToken, initiateCall);
router.get('/history/:other_id', authenticateToken, getMessages);
router.get('/list', authenticateToken, getChatList);

module.exports = router;
