const { db } = require('../config/db');
const { notificationsTable } = require('../config/schema');
const { eq, and, desc } = require('drizzle-orm');

const getNotifications = async (req, res) => {
    try {
        const notifications = await db.select()
            .from(notificationsTable)
            .where(and(
                eq(notificationsTable.user_id, req.user.id),
                eq(notificationsTable.user_role, req.user.role)
            ))
            .orderBy(desc(notificationsTable.created_at));

        res.json({ success: true, data: notifications });
    } catch (err) {
        console.error('Get notifications error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const markAllAsRead = async (req, res) => {
    try {
        await db.update(notificationsTable)
            .set({ is_read: true })
            .where(and(
                eq(notificationsTable.user_id, req.user.id),
                eq(notificationsTable.user_role, req.user.role)
            ));

        res.json({ success: true, message: 'All notifications marked as read' });
    } catch (err) {
        console.error('Mark all read error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;

        await db.update(notificationsTable)
            .set({ is_read: true })
            .where(and(
                eq(notificationsTable.id, parseInt(id)),
                eq(notificationsTable.user_id, req.user.id),
                eq(notificationsTable.user_role, req.user.role)
            ));

        res.json({ success: true, message: 'Notification marked as read' });
    } catch (err) {
        console.error('Mark read error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        await db.delete(notificationsTable)
            .where(and(
                eq(notificationsTable.id, parseInt(id)),
                eq(notificationsTable.user_id, req.user.id)
            ));
        res.json({ success: true, message: 'Notification deleted' });
    } catch (err) {
        console.error('Delete notification error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = { getNotifications, markAllAsRead, markAsRead, deleteNotification };
