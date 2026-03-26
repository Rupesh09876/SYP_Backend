const jwt = require('jsonwebtoken');
const { db } = require('../config/db');
const { usersTable, doctorsTable } = require('../config/schema');
const { eq } = require('drizzle-orm');

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access token required'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        let authUser = null;

        if (decoded.role === 'doctor') {
            const doctors = await db.select({
                id: doctorsTable.id,
                email: doctorsTable.email,
                first_name: doctorsTable.first_name,
                last_name: doctorsTable.last_name,
                phone: doctorsTable.phone
            }).from(doctorsTable).where(eq(doctorsTable.id, decoded.userId));

            if (doctors.length > 0) {
                authUser = { ...doctors[0], role: 'doctor' };
            }
        } else {
            const users = await db.select({
                id: usersTable.id,
                email: usersTable.email,
                role: usersTable.role,
                first_name: usersTable.first_name,
                last_name: usersTable.last_name,
                phone: usersTable.phone
            }).from(usersTable).where(eq(usersTable.id, decoded.userId));

            if (users.length > 0) {
                authUser = users[0];
            }
        }

        if (!authUser) {
            return res.status(401).json({
                success: false,
                message: 'User not found or inactive'
            });
        }

        req.user = authUser;
        next();
    } catch (error) {
        return res.status(403).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
};

const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied: Insufficient permissions'
            });
        }
        next();
    };
};

module.exports = { authenticateToken, authorizeRoles };