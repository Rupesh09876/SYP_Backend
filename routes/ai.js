const express = require('express');
const router = express.Router();
const axios = require('axios');
const { authenticateToken } = require('../middleware/auth');

// New diagnostic route
router.get('/health', (req, res) => res.json({ ok: true, msg: 'AI Service is Routeable' }));

router.post('/chat', authenticateToken, async (req, res) => {
    console.log(`--- AI Proxy Request: POST /chat from ${req.user?.role} (ID: ${req.user?.id}) ---`);
    console.log('Headers:', req.headers['authorization']?.substring(0, 15) + '...');
    
    // Feature gate: AI Assistant is premium-only for patients
    if (req.user.role === 'patient' && req.user.subscription_tier !== 'premium') {
        console.warn(`AI Proxy: Access denied for non-premium patient ${req.user.id}`);
        return res.status(403).json({ 
            error: 'AI Health Assistant is a Premium feature. Please upgrade your subscription to use it.' 
        });
    }

    try {
        const { contents, system_instruction, model = 'gemini-1.5-flash' } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;
        
        console.log('Model:', model);
        console.log('Content Count:', contents?.length);
        if (contents?.length > 0) {
            console.log('Last Message:', contents[contents.length-1].parts[0].text.substring(0, 50) + '...');
        }

        if (!apiKey) {
            console.error('AI Proxy: Missing GEMINI_API_KEY in environment');
            return res.status(500).json({ error: 'AI Service is temporarily unavailable (Missing credentials).' });
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        console.log(`AI Proxy: Calling Gemini API for ${model}...`);
        
        try {
            const response = await axios.post(url, {
                contents,
                system_instruction,
                generationConfig: req.body.generationConfig || { maxOutputTokens: 1024, temperature: 0.7 }
            }, { 
                timeout: 15000,
                headers: { 'Content-Type': 'application/json' }
            });

            console.log('AI Proxy: Gemini API Success');
            return res.json(response.data);
        } catch (axiosError) {
            const status = axiosError.response?.status || 500;
            const googleError = axiosError.response?.data?.error;
            
            console.error('AI Proxy: Gemini API Call Failed!');
            console.error('Status Code:', status);
            console.error('Google Error Payload:', JSON.stringify(googleError, null, 2));

            let message = 'Error communicating with AI service';
            if (status === 403) {
                message = 'AI Service Access Denied. This may be due to regional restrictions or invalid API configuration.';
            } else if (googleError?.message) {
                message = googleError.message;
            } else if (axiosError.message) {
                message = axiosError.message;
            }

            return res.status(status).json({ error: message });
        }
    } catch (criticalError) {
        console.error('AI Proxy Critical Error:', criticalError.message);
        return res.status(500).json({ error: 'Internal AI Proxy error' });
    }
});

module.exports = router;
