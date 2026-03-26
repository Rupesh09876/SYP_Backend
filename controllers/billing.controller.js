const { db } = require('../config/db');
const { billsTable, appointmentsTable, usersTable } = require('../config/schema');
const { eq, desc } = require('drizzle-orm');

const KHALTI_SECRET_KEY = process.env.KHALTI_SECRET_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const getBills = async (req, res) => {
    try {
        let bills = [];
        if (req.user.role === 'patient') {
            bills = await db.select()
                .from(billsTable)
                .where(eq(billsTable.patient_id, req.user.id))
                .orderBy(desc(billsTable.created_at));
        } else if (req.user.role === 'admin') {
            bills = await db.select()
                .from(billsTable)
                .orderBy(desc(billsTable.created_at));
        }

        res.json({ success: true, data: bills });
    } catch (err) {
        console.error('Get bills error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const initiateKhaltiPayment = async (req, res) => {
    try {
        const { bill_id } = req.body;
        if (!bill_id) {
            return res.status(400).json({ success: false, message: 'Missing bill_id' });
        }

        if (!req.user || req.user.role !== 'patient') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const [bill] = await db.select().from(billsTable).where(eq(billsTable.id, parseInt(bill_id)));
        if (!bill) {
            return res.status(404).json({ success: false, message: 'Bill not found' });
        }
        if (bill.status === 'Paid') {
            return res.status(400).json({ success: false, message: 'Bill is already paid' });
        }

        const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user.id));
        
        const amountInPaisa = bill.amount * 100;
        const purchase_order_id = `BILL-${bill.id}-${Date.now()}`;
        const purchase_order_name = `Consultation Bill #${bill.id}`;

        const payload = {
            return_url: `${FRONTEND_URL}/patient/billing`,
            website_url: FRONTEND_URL,
            amount: amountInPaisa,
            purchase_order_id: purchase_order_id,
            purchase_order_name: purchase_order_name,
            customer_info: {
                name: `${user.first_name} ${user.last_name}`,
                email: user.email,
                phone: user.phone || '9800000000'
            }
        };

        const response = await fetch('https://dev.khalti.com/api/v2/epayment/initiate/', {
            method: 'POST',
            headers: {
                'Authorization': `key ${KHALTI_SECRET_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (response.ok) {
            res.json({ success: true, payment_url: data.payment_url, pidx: data.pidx });
        } else {
            console.error('Khalti Init Error:', data);
            res.status(400).json({ success: false, message: data.detail || 'Failed to initiate Khalti payment' });
        }
    } catch (err) {
        console.error('Initiate payment error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const verifyPayment = async (req, res) => {
    try {
        const { pidx, purchase_order_id } = req.body;
        if (!pidx) {
            return res.status(400).json({ success: false, message: 'Missing pidx details' });
        }

        const response = await fetch('https://dev.khalti.com/api/v2/epayment/lookup/', {
            method: 'POST',
            headers: {
                'Authorization': `Key ${KHALTI_SECRET_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ pidx })
        });

        const data = await response.json();

        if (response.ok && data.status === 'Completed') {
            const po_id = data.purchase_order_id || purchase_order_id;
            if (!po_id) {
                return res.status(400).json({ success: false, message: 'Missing purchase order ID' });
            }
            const parts = po_id.split('-');
            const bill_id = parts[1];

            const [updatedBill] = await db.update(billsTable)
                .set({
                    status: 'Paid',
                    transaction_id: data.transaction_id,
                    payment_method: 'Khalti',
                    updated_at: new Date()
                })
                .where(eq(billsTable.id, parseInt(bill_id)))
                .returning();

            res.json({ success: true, data: updatedBill });
        } else {
            res.status(400).json({ success: false, message: 'Payment verification failed or pending', details: data });
        }
    } catch (err) {
        console.error('Verify payment error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = { getBills, initiateKhaltiPayment, verifyPayment };
