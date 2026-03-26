const { db } = require('../config/db');
const { medicalReportsTable, appointmentsTable, notificationsTable, usersTable } = require('../config/schema');
const { eq, desc } = require('drizzle-orm');
const { sendSMS, sendEmail } = require('../services/notification.service');

const createReport = async (req, res) => {
    try {
        const { appointment_id, patient_id, title, diagnosis, prescription, notes, follow_up_date } = req.body;

        // We assume the user creates it (req.user) is a doctor
        const doctor_id = req.user.id;

        if (!appointment_id || !patient_id || !title || !diagnosis) {
            return res.status(400).json({ success: false, message: 'Missing required report fields' });
        }

        const [newReport] = await db.insert(medicalReportsTable).values({
            appointment_id: parseInt(appointment_id),
            doctor_id,
            patient_id: parseInt(patient_id),
            title,
            diagnosis,
            prescription,
            notes,
            follow_up_date: follow_up_date ? new Date(follow_up_date) : null
        }).returning();

        // Mark the appointment as completed automatically
        await db.update(appointmentsTable)
            .set({ status: 'Completed', updated_at: new Date() })
            .where(eq(appointmentsTable.id, parseInt(appointment_id)));

        // Notify the patient
        await db.insert(notificationsTable).values({
            user_id: patient_id,
            user_role: 'patient',
            title: 'New Medical Report',
            message: `Your medical report "${title}" is ready and your appointment has been marked as Completed.`,
            type: 'report',
            related_id: newReport.id
        });

        // 3.5 External Notifications (SMS/Email)
        const [patient] = await db.select().from(usersTable).where(eq(usersTable.id, parseInt(patient_id)));
        if (patient) {
            const msg = `MediCare: Your medical report for "${title}" is now available. Log in to your portal to view it.`;
            const subject = `New Medical Report Available - ${title}`;
            const emailHtml = `
                <div style="font-family: sans-serif; padding: 20px; color: #333; border: 1px solid #eee; border-radius: 12px;">
                    <h2 style="color: #3b5bdb;">Hospital Report Notification</h2>
                    <p>Dear ${patient.first_name},</p>
                    <p>Your medical report for <strong>${title}</strong> has been uploaded by your doctor.</p>
                    <p>You can now view, download, or share this report via your patient dashboard.</p>
                    <div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                        <strong>Diagnosis Summary:</strong><br/>
                        ${diagnosis.substring(0, 100)}${diagnosis.length > 100 ? '...' : ''}
                    </div>
                </div>
            `;
            if (patient.phone) await sendSMS(patient.phone, msg);
            if (patient.email) await sendEmail(patient.email, subject, msg, emailHtml);
        }

        // 4. GENERATE BILL
        const { billsTable } = require('../config/schema');
        const [appointment] = await db.select().from(appointmentsTable).where(eq(appointmentsTable.id, parseInt(appointment_id)));
        const fee = appointment?.fee || 500;

        await db.insert(billsTable).values({
            appointment_id: parseInt(appointment_id),
            patient_id: parseInt(patient_id),
            amount: fee,
            services: `Consultation: ${title}`,
            status: 'Pending'
        });

        res.status(201).json({ success: true, data: newReport });
    } catch (err) {
        console.error('Create report error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const getReports = async (req, res) => {
    try {
        let reports = [];

        // Patient can see their own reports
        if (req.user.role === 'patient') {
            const dbReports = await db.select()
                .from(medicalReportsTable)
                .where(eq(medicalReportsTable.patient_id, req.user.id))
                .orderBy(desc(medicalReportsTable.created_at));

            // Merge with doctor info
            const { doctorsTable } = require('../config/schema');
            const allDoctors = await db.select().from(doctorsTable);
            const docMap = {};
            allDoctors.forEach(d => docMap[d.id] = `Dr. ${d.first_name} ${d.last_name}`);

            reports = dbReports.map(r => ({ ...r, doctor_name: docMap[r.doctor_id] || `Doctor #${r.doctor_id}` }));
        }
        // Doctor can see reports they wrote
        else if (req.user.role === 'doctor') {
            const dbReports = await db.select()
                .from(medicalReportsTable)
                .where(eq(medicalReportsTable.doctor_id, req.user.id))
                .orderBy(desc(medicalReportsTable.created_at));

            const { usersTable } = require('../config/schema');
            const allPatients = await db.select().from(usersTable).where(eq(usersTable.role, 'patient'));
            const pMap = {};
            allPatients.forEach(p => pMap[p.id] = `${p.first_name} ${p.last_name}`);

            reports = dbReports.map(r => ({ ...r, patient_name: pMap[r.patient_id] || `Patient #${r.patient_id}` }));
        }
        // Admin can see everything
        else if (req.user.role === 'admin') {
            reports = await db.select()
                .from(medicalReportsTable)
                .orderBy(desc(medicalReportsTable.created_at));
        }

        res.json({ success: true, data: reports });
    } catch (err) {
        console.error('Get reports error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const getPublicReport = async (req, res) => {
    try {
        const { id } = req.params;
        const { token } = req.query;

        if (!token) return res.status(401).json({ success: false, message: 'Missing secure token' });

        const [report] = await db.select()
            .from(medicalReportsTable)
            .where(eq(medicalReportsTable.id, parseInt(id)));

        if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

        // Validate Token and Expiry
        const now = new Date();
        const dbExpiresAt = report.token_expires_at ? new Date(report.token_expires_at) : null;
        
        console.log(`[Diagnostic] Public Access Attempt - ID: ${id}`);
        console.log(`[Diagnostic] Token Match: ${report.secure_token === token}`);
        console.log(`[Diagnostic] Now: ${now.toISOString()}`);
        console.log(`[Diagnostic] DB Expiry: ${dbExpiresAt ? dbExpiresAt.toISOString() : 'None'}`);

        if (report.secure_token !== token || (dbExpiresAt && now > dbExpiresAt)) {
            console.warn(`[Diagnostic] Access Forbidden: Token Mismatch or Expired`);
            return res.status(403).json({ success: false, message: 'This secure link has expired or is invalid' });
        }

        // Enforce view limit
        const maxViews = report.max_views || 8;
        const currentViews = report.view_count || 0;
        if (currentViews >= maxViews) {
            return res.status(403).json({ success: false, message: `This report has reached the maximum number of views (${maxViews}). Ask the patient to generate a new link.` });
        }

        // Increment view count
        await db.update(medicalReportsTable)
            .set({ view_count: currentViews + 1 })
            .where(eq(medicalReportsTable.id, parseInt(id)));

        // Merge with doctor info
        const { doctorsTable } = require('../config/schema');
        const [doctor] = await db.select().from(doctorsTable).where(eq(doctorsTable.id, report.doctor_id));
        const doctor_name = doctor ? `Dr. ${doctor.first_name} ${doctor.last_name}` : `Doctor #${report.doctor_id}`;

        res.json({ success: true, data: { ...report, doctor_name, view_count: currentViews + 1, max_views: maxViews } });
    } catch (err) {
        console.error('Public report error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const getShareToken = async (req, res) => {
    try {
        const { id } = req.params;

        // Verify premium subscription server-side
        if (req.user.role === 'patient') {
            const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user.id));
            if (!user || user.subscription_tier !== 'premium') {
                return res.status(403).json({ success: false, message: 'Secure QR sharing is a Premium Feature. Please upgrade your plan.' });
            }
        }

        // Check if report exists and belongs to user
        const [report] = await db.select().from(medicalReportsTable).where(eq(medicalReportsTable.id, parseInt(id)));
        if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

        if (req.user.role === 'patient' && report.patient_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        // Generate a 24-hour token and reset view count to 0 (fresh share)
        const crypto = require('crypto');
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        await db.update(medicalReportsTable)
            .set({
                secure_token: token,
                token_expires_at: expiresAt,
                view_count: 0,   // Reset views on each new share
                max_views: 8     // max 8 viewers (min 4 guaranteed)
            })
            .where(eq(medicalReportsTable.id, parseInt(id)));

        res.json({ success: true, data: { token, expires_at: expiresAt, max_views: 8 } });
    } catch (err) {
        console.error('Get share token error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = { createReport, getReports, getPublicReport, getShareToken };
