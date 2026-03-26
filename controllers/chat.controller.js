const { db } = require('../config/db');
const { messagesTable, usersTable, doctorsTable, notificationsTable } = require('../config/schema');
const { eq, or, and, desc, inArray } = require('drizzle-orm');
const { sendEmail } = require('../services/notification.service');

// Send Message
const sendMessage = async (req, res) => {
    try {
        const { receiver_id, content } = req.body;
        const sender_id = req.user.id;
        const sender_role = req.user.role;

        if (!receiver_id || !content) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        // Determine receiver role
        // If sender is doctor, receiver is patient (user)
        // If sender is patient, receiver is doctor
        const receiver_role = sender_role === 'doctor' ? 'patient' : 'doctor';

        const [newMessage] = await db.insert(messagesTable)
            .values({ 
                sender_id, 
                sender_role,
                receiver_id: parseInt(receiver_id), 
                receiver_role,
                content 
            })
            .returning();

        // In-app notification to receiver
        try {
            let senderName = `${req.user.first_name} ${req.user.last_name}`;
            if (sender_role === 'doctor') senderName = `Dr. ${senderName}`;

            let receiverEmail = null;
            if (receiver_role === 'doctor') {
                const [doctor] = await db.select().from(doctorsTable).where(eq(doctorsTable.id, parseInt(receiver_id)));
                receiverEmail = doctor?.email;
            } else {
                const [user] = await db.select().from(usersTable).where(eq(usersTable.id, parseInt(receiver_id)));
                receiverEmail = user?.email;
            }

            await db.insert(notificationsTable).values({
                user_id: parseInt(receiver_id),
                user_role: receiver_role,
                title: 'New Message',
                message: `${senderName} sent you a message: "${content.substring(0, 80)}${content.length > 80 ? '...' : ''}"`,
                type: 'chat',
                related_id: newMessage.id
            });

            if (receiverEmail) {
                const emailHtml = `<div style="font-family:Arial,sans-serif;padding:20px;color:#333"><h2 style="color:#3b5bdb">New Message from ${senderName}</h2><p>${content}</p><p style="font-size:12px;color:#868e96">Log in to MediCare to reply.</p></div>`;
                await sendEmail(receiverEmail, `New message from ${senderName}`, content, emailHtml).catch(() => {});
            }
        } catch (notifErr) {
            console.error('Chat notification error:', notifErr);
        }

        res.status(201).json({ success: true, data: newMessage });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Get Messages between two users
const getMessages = async (req, res) => {
    try {
        const other_id = parseInt(req.params.other_id);
        const user_id = req.user.id;
        const user_role = req.user.role;
        const other_role = user_role === 'doctor' ? 'patient' : 'doctor';

        const messages = await db.select().from(messagesTable)
            .where(or(
                and(
                    eq(messagesTable.sender_id, user_id), 
                    eq(messagesTable.sender_role, user_role),
                    eq(messagesTable.receiver_id, other_id),
                    eq(messagesTable.receiver_role, other_role)
                ),
                and(
                    eq(messagesTable.sender_id, other_id), 
                    eq(messagesTable.sender_role, other_role),
                    eq(messagesTable.receiver_id, user_id),
                    eq(messagesTable.receiver_role, user_role)
                )
            ))
            .orderBy(messagesTable.created_at);

        res.json({ success: true, data: messages });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Get list of contacts with active chats
const getChatList = async (req, res) => {
    try {
        const user_id = req.user.id;
        const user_role = req.user.role;
        const other_role = user_role === 'doctor' ? 'patient' : 'doctor';

        const sent = await db.select({ id: messagesTable.receiver_id })
            .from(messagesTable)
            .where(and(
                eq(messagesTable.sender_id, user_id),
                eq(messagesTable.sender_role, user_role)
            ));
        
        const received = await db.select({ id: messagesTable.sender_id })
            .from(messagesTable)
            .where(and(
                eq(messagesTable.receiver_id, user_id),
                eq(messagesTable.receiver_role, user_role)
            ));

        const uniqueIds = [...new Set([...sent.map(m => m.id), ...received.map(m => m.id)])];
        
        if (uniqueIds.length === 0) return res.json({ success: true, data: [] });

        let contacts = [];
        if (user_role === 'doctor') {
            contacts = await db.select({
                id: usersTable.id,
                first_name: usersTable.first_name,
                last_name: usersTable.last_name,
                email: usersTable.email,
                role: usersTable.role,
                subscription_tier: usersTable.subscription_tier
            }).from(usersTable).where(inArray(usersTable.id, uniqueIds));
        } else {
            contacts = await db.select({
                id: doctorsTable.id,
                first_name: doctorsTable.first_name,
                last_name: doctorsTable.last_name,
                email: doctorsTable.email,
                category: doctorsTable.category
            }).from(doctorsTable).where(inArray(doctorsTable.id, uniqueIds));
        }

        res.json({ success: true, data: contacts });
    } catch (err) {
        console.error('getChatList error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const initiateCall = async (req, res) => {
    try {
        const { receiver_id, roomID, isVideo } = req.body;
        const sender_id = req.user.id;
        const sender_role = req.user.role;
        const receiver_role = sender_role === 'doctor' ? 'patient' : 'doctor';

        let senderName = `${req.user.first_name} ${req.user.last_name}`;
        if (sender_role === 'doctor') senderName = `Dr. ${senderName}`;

        const callData = JSON.stringify({
            roomID,
            isVideo,
            type: 'call_initiation',
            senderName
        });

        console.log('Initiating call signaling:', { receiver_id, roomID, isVideo, senderName });

        const [notif] = await db.insert(notificationsTable).values({
            user_id: parseInt(receiver_id),
            user_role: receiver_role,
            title: 'Incoming Call',
            message: callData,
            type: 'call',
            is_read: false
        }).returning();

        console.log('Call notification created:', notif.id);

        res.json({ success: true, message: 'Call initiated', notificationId: notif.id });
    } catch (err) {
        console.error('CRITICAL: Initiate call error:', err);
        res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
    }
};

module.exports = { sendMessage, getMessages, getChatList, initiateCall };
