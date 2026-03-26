const twilio = require('twilio');
const nodemailer = require('nodemailer');
const { Resend } = require('resend');

// Twilio Config
// Supports Account SID + Auth Token OR Account SID + API Key + API Secret
const twilioClient = (process.env.TWILIO_API_KEY && process.env.TWILIO_API_SECRET && process.env.TWILIO_ACCOUNT_SID)
    ? twilio(process.env.TWILIO_API_KEY, process.env.TWILIO_API_SECRET, { accountSid: process.env.TWILIO_ACCOUNT_SID })
    : (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
        ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
        : null);

// Email Config (Nodemailer)
const emailTransporter = process.env.EMAIL_USER && process.env.EMAIL_PASS
    ? nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    })
    : null;

// Email Config (Resend - Modern Alternative)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const sendSMS = async (to, message) => {
    if (!twilioClient) {
        console.log(`[SMS SIMULATION] To: ${to} | Content: ${message}`);
        return { success: true, simulated: true };
    }
    try {
        console.log(`[SMS ATTEMPT] Sending message to ${to}...`);
        const response = await twilioClient.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: to
        });
        console.log(`[SMS SUCCESS] SID: ${response.sid}`);
        return { success: true, sid: response.sid };
    } catch (err) {
        console.error('[SMS ERROR] Twilio failed:', err.message);
        return { success: false, error: err.message };
    }
};

const sendEmail = async (to, subject, text, html) => {
    console.log(`[EMAIL ATTEMPT] Sending to ${to} | Subject: ${subject}`);
    
    // 1. Try Resend first
    if (resend) {
        try {
            const data = await resend.emails.send({
                from: 'MediCare <onboarding@resend.dev>',
                to,
                subject,
                text,
                html: html || `<p>${text}</p>`
            });
            console.log(`[EMAIL SUCCESS] Resend ID: ${data.id}`);
            return { success: true, id: data.id };
        } catch (err) {
            console.error('[EMAIL ERROR] Resend failed:', err.message);
        }
    }

    // 2. Try Nodemailer (SMTP)
    if (emailTransporter) {
        try {
            const info = await emailTransporter.sendMail({
                from: `"MediCare Hospital" <${process.env.EMAIL_USER}>`,
                to,
                subject,
                text,
                html
            });
            console.log(`[EMAIL SUCCESS] Nodemailer MsgID: ${info.messageId}`);
            return { success: true, messageId: info.messageId };
        } catch (err) {
            console.error('[EMAIL ERROR] Nodemailer failed:', err.message);
            return { success: false, error: err.message };
        }
    }

    // 3. Simulation Fallback
    console.log(`[EMAIL SIMULATION] To: ${to} | Subject: ${subject}`);
    return { success: true, simulated: true };
};

module.exports = { sendSMS, sendEmail };
