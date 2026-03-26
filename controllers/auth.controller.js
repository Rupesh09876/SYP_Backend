const bcrypt = require('bcryptjs');
const { db } = require('../config/db');
const { usersTable, doctorsTable } = require('../config/schema');
const { eq } = require('drizzle-orm');
const { generateToken } = require('../utils/jwt');
const {
    validateEmail,
    validateNepaliPhone,
    validatePassword,
    validateName,
    validateRole,
    formatPhoneNumber
} = require('../utils/validation');

const register = async (req, res) => {
    try {
        const { email, password, role, first_name, last_name, phone } = req.body;

        if (!email || !password || !role || !first_name || !last_name) {
            return res.status(400).json({ success: false, message: 'All fields are required (email, password, role, first_name, last_name)' });
        }
        if (!validateEmail(email)) return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
        if (!validateRole(role)) return res.status(400).json({ success: false, message: 'Invalid role. Must be admin, doctor, or patient' });
        if (!validateName(first_name) || !validateName(last_name))
            return res.status(400).json({ success: false, message: 'Names must be between 2 and 100 characters' });
        if (!validatePassword(password))
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });

        let formattedPhone = null;
        if (phone) {
            formattedPhone = formatPhoneNumber(phone);
            if (!validateNepaliPhone(formattedPhone))
                return res.status(400).json({ success: false, message: 'Phone must be a valid Nepali number (+9779XXXXXXXXX)' });
        }

        const existingUsers = await db.select().from(usersTable).where(eq(usersTable.email, email));
        if (existingUsers.length > 0) return res.status(409).json({ success: false, message: 'User with this email already exists' });

        if (formattedPhone) {
            const existingPhones = await db.select().from(usersTable).where(eq(usersTable.phone, formattedPhone));
            if (existingPhones.length > 0) return res.status(409).json({ success: false, message: 'User with this phone number already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const [newUser] = await db.insert(usersTable).values({
            email, password_hash: hashedPassword, role, first_name, last_name, phone: formattedPhone
        }).returning();

        // Notify admins about new registration
        try {
            const admins = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.role, 'admin'));
            const { notificationsTable } = require('../config/schema');
            for (const admin of admins) {
                await db.insert(notificationsTable).values({
                    user_id: admin.id,
                    user_role: 'admin',
                    title: 'New User Registered',
                    message: `A new ${role}, ${first_name} ${last_name}, has registered in the system.`,
                    type: 'info',
                    related_id: newUser.id
                });
            }
        } catch (notifierErr) {
            console.error('Failed to send admin notification:', notifierErr);
        }

        const token = generateToken(newUser.id, newUser.role);
        res.status(201).json({
            success: true, message: 'User registered successfully',
            data: { user: { id: newUser.id, email: newUser.email, role: newUser.role, first_name: newUser.first_name, last_name: newUser.last_name, phone: newUser.phone, created_at: newUser.created_at }, token }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, message: 'Internal server error during registration' });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ success: false, message: 'Email and password are required' });

        // 1. Check usersTable (admin + patient)
        const users = await db.select().from(usersTable).where(eq(usersTable.email, email));
        if (users.length > 0) {
            const user = users[0];
            const isValid = await bcrypt.compare(password, user.password_hash);
            if (!isValid) return res.status(401).json({ success: false, message: 'Invalid email or password' });
            const token = generateToken(user.id, user.role);
            const { password_hash, ...userOut } = user;
            // Send login notification to self
            try {
                const { notificationsTable } = require('../config/schema');
                await db.insert(notificationsTable).values({
                    user_id: user.id, user_role: user.role,
                    title: 'Login Detected',
                    message: `You logged in to MediCare at ${new Date().toLocaleString()}.`,
                    type: 'info'
                });
            } catch (_) {}
            return res.json({ success: true, message: 'Login successful', data: { user: userOut, token } });
        }

        // 2. Check doctorsTable (doctors created by admin)
        const doctors = await db.select().from(doctorsTable).where(eq(doctorsTable.email, email));
        if (doctors.length > 0) {
            const doctor = doctors[0];
            const isValid = await bcrypt.compare(password, doctor.password_hash);
            if (!isValid) return res.status(401).json({ success: false, message: 'Invalid email or password' });
            const token = generateToken(doctor.id, 'doctor');
            const { password_hash, ...doctorOut } = doctor;
            // Send login notification to self
            try {
                const { notificationsTable } = require('../config/schema');
                await db.insert(notificationsTable).values({
                    user_id: doctor.id, user_role: 'doctor',
                    title: 'Login Detected',
                    message: `You logged in to MediCare at ${new Date().toLocaleString()}.`,
                    type: 'info'
                });
            } catch (_) {}
            return res.json({
                success: true, message: 'Login successful',
                data: { user: { ...doctorOut, role: 'doctor' }, token }
            });
        }

        return res.status(401).json({ success: false, message: 'Invalid email or password' });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Internal server error during login' });
    }
};

const getProfile = async (req, res) => {
    try {
        const users = await db.select({
            id: usersTable.id, email: usersTable.email, role: usersTable.role,
            first_name: usersTable.first_name, last_name: usersTable.last_name,
            phone: usersTable.phone, created_at: usersTable.created_at
        }).from(usersTable).where(eq(usersTable.id, req.user.id));

        if (users.length > 0) return res.json({ success: true, data: users[0] });

        // Fall back to doctorsTable
        const doctors = await db.select().from(doctorsTable).where(eq(doctorsTable.id, req.user.id));
        if (doctors.length > 0) {
            const { password_hash, ...doctorOut } = doctors[0];
            return res.json({ success: true, data: { ...doctorOut, role: 'doctor' } });
        }

        return res.status(404).json({ success: false, message: 'User not found' });
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

    const updateProfile = async (req, res) => {
    try {
        const { first_name, last_name, phone, availability } = req.body;
        const userId = req.user.id;

        if (!first_name || !last_name)
            return res.status(400).json({ success: false, message: 'First name and last name are required' });
        if (!validateName(first_name) || !validateName(last_name))
            return res.status(400).json({ success: false, message: 'Names must be between 2 and 100 characters' });

        let formattedPhone = null;
        if (phone) {
            formattedPhone = formatPhoneNumber(phone);
            if (!validateNepaliPhone(formattedPhone))
                return res.status(400).json({ success: false, message: 'Phone must be a valid Nepali number (+9779XXXXXXXXX)' });
            const { and, ne } = require('drizzle-orm');
            const existingPhones = await db.select().from(usersTable).where(
                and(eq(usersTable.phone, formattedPhone), ne(usersTable.id, userId))
            );
            if (existingPhones.length > 0)
                return res.status(409).json({ success: false, message: 'This phone number is already registered with another account' });
        }

        // Try usersTable first
        const usersCheck = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, userId));
        if (usersCheck.length > 0) {
            const [updatedUser] = await db.update(usersTable)
                .set({ first_name, last_name, phone: formattedPhone, updated_at: new Date() })
                .where(eq(usersTable.id, userId)).returning();
            return res.json({
                success: true, message: 'Profile updated successfully',
                data: { id: updatedUser.id, email: updatedUser.email, role: updatedUser.role, first_name: updatedUser.first_name, last_name: updatedUser.last_name, phone: updatedUser.phone, created_at: updatedUser.created_at }
            });
        }

        // Fall back to doctorsTable
        const updateData = { first_name, last_name, phone: formattedPhone };
        if (availability) {
            updateData.availability = availability;
        }

        const [updatedDoctor] = await db.update(doctorsTable)
            .set(updateData)
            .where(eq(doctorsTable.id, userId)).returning();

        if (!updatedDoctor) return res.status(404).json({ success: false, message: 'User not found' });
        const { password_hash, ...doctorOut } = updatedDoctor;
        return res.json({ success: true, message: 'Profile updated successfully', data: { ...doctorOut, role: 'doctor' } });

    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ success: false, message: 'Internal server error during profile update' });
    }
};

module.exports = { register, login, getProfile, updateProfile };