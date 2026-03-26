const express = require('express');
const router = express.Router();
const axios = require('axios');


router.post('/chat', async (req, res) => {
    console.log('--- AI Proxy Request Received ---');
    try {
        const { contents, system_instruction, model = 'gemini-flash-latest' } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;
        
        console.log('Model:', model);
        console.log('Content Count:', contents?.length);
        if (contents?.length > 0) {
            console.log('Last Message:', contents[contents.length-1].parts[0].text.substring(0, 50) + '...');
        }

        if (!apiKey) {
            console.error('AI Proxy: Missing API Key');
            return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
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
            console.error('AI Proxy: Gemini API Call Failed:', axiosError.response?.data || axiosError.message);
            const status = axiosError.response?.status || 500;
            const message = axiosError.response?.data?.error?.message || axiosError.message || 'Error communicating with AI service';
            return res.status(status).json({ error: message });
        }
    } catch (criticalError) {
        console.error('AI Proxy Critical Error:', criticalError.message);
        return res.status(500).json({ error: 'Internal AI Proxy Error' });
    }
});

module.exports = router;
