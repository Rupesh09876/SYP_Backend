const { db } = require('../config/db');
const { usersTable } = require('../config/schema');
const { eq } = require('drizzle-orm');

const KHALTI_SECRET_KEY = process.env.KHALTI_SECRET_KEY;
const FRONTEND_URL = (process.env.FRONTEND_URL && process.env.FRONTEND_URL !== '*')
    ? process.env.FRONTEND_URL
    : 'http://localhost:5173';
const KHALTI_BASE = 'https://dev.khalti.com';

const initiateSubscriptionPayment = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'patient') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        // SANDBOX MODE: Skip real API and return a mock redirect
        if (process.env.KHALTI_SANDBOX === 'true') {
            const mockPidx = `MOCK-${req.user.id}-${Date.now()}`;
            const mockPaymentUrl = `${FRONTEND_URL}/patient/subscription?mock_pidx=${mockPidx}&mock_payment=true`;
            return res.json({ success: true, payment_url: mockPaymentUrl, pidx: mockPidx });
        }

        // LIVE/TEST MODE: Call Khalti API
        const baseFrontend = req.headers.origin || FRONTEND_URL;
        const payload = {
            return_url: `${baseFrontend}/patient/subscription`,
            website_url: baseFrontend,
            amount: 10000, // Rs. 100 in paisa
            purchase_order_id: `SUB-${req.user.id}-${Date.now()}`,
            purchase_order_name: `Premium Subscription - ${req.user.email}`,
            customer_info: {
                name: `${req.user.first_name} ${req.user.last_name}`,
                email: req.user.email,
                phone: req.user.phone || '9851000000'
            }
        };

        const response = await fetch(`${KHALTI_BASE}/api/v2/epayment/initiate/`, {
            method: 'POST',
            headers: {
                'Authorization': `Key ${KHALTI_SECRET_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            return res.json({ success: true, payment_url: data.payment_url, pidx: data.pidx });
        } else {
            console.error('[Khalti] Initiation Error:', JSON.stringify(data, null, 2));
            return res.status(400).json({ success: false, message: data.detail || 'Payment initiation failed', details: data });
        }
    } catch (err) {
        console.error('[Khalti] Initiate exception:', err.message);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const verifySubscriptionPayment = async (req, res) => {
    try {
        const { pidx } = req.body;
        if (!pidx) {
            return res.status(400).json({ success: false, message: 'Missing pidx' });
        }

        // SANDBOX MODE: Activate directly if pidx is a mock token
        if (pidx.startsWith('MOCK-')) {
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 30);
            const [updatedUser] = await db.update(usersTable)
                .set({ subscription_tier: 'premium', subscription_expiry: expiryDate, updated_at: new Date() })
                .where(eq(usersTable.id, req.user.id))
                .returning();
            if (!updatedUser) {
                return res.status(500).json({ success: false, message: 'Failed to update user subscription' });
            }
            const { password_hash, ...userOut } = updatedUser;
            return res.json({ success: true, user: userOut });
        }

        // LIVE/TEST MODE: Verify with Khalti
        const response = await fetch(`${KHALTI_BASE}/api/v2/epayment/lookup/`, {
            method: 'POST',
            headers: {
                'Authorization': `Key ${KHALTI_SECRET_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ pidx })
        });

        const data = await response.json();

        if (response.ok && data.status === 'Completed') {
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 30);
            const [updatedUser] = await db.update(usersTable)
                .set({ subscription_tier: 'premium', subscription_expiry: expiryDate, updated_at: new Date() })
                .where(eq(usersTable.id, req.user.id))
                .returning();
            const { password_hash, ...userOut } = updatedUser;
            try {
                const { notificationsTable, billsTable } = require('../config/schema');
                await db.insert(notificationsTable).values({
                    user_id: req.user.id,
                    user_role: 'patient',
                    title: 'Premium Subscription Activated 🎉',
                    message: `Congratulations! Your Premium subscription is now active until ${expiryDate.toLocaleDateString()}.`,
                    type: 'subscription'
                });
                
                await db.insert(billsTable).values({
                    appointment_id: 0, // Dummy ID for subscriptions
                    patient_id: req.user.id,
                    amount: 100, // NPR 100
                    services: 'Premium Subscription (1 Month)',
                    status: 'Paid',
                    payment_method: 'Khalti',
                    transaction_id: data.transaction_id || `KHALTI-${Date.now()}`
                });
            } catch (_) {}
            return res.json({ success: true, user: userOut });
        } else {
            return res.status(400).json({ success: false, message: 'Payment verification failed', details: data });
        }
    } catch (err) {
        console.error('[Khalti] Verify exception:', err.message);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = { initiateSubscriptionPayment, verifySubscriptionPayment };
