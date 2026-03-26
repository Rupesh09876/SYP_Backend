const bcrypt = require('bcryptjs');
const { db } = require('../config/db');
const { doctorsTable } = require('../config/schema');
const { eq } = require('drizzle-orm');

const createDoctor = async (req, res) => {
  try {
    const { first_name, last_name, email, password, phone, address, category } = req.body;

    if (!first_name || !last_name || !email || !password || !category) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const existingDoctor = await db.select().from(doctorsTable).where(eq(doctorsTable.email, email));
    if (existingDoctor.length) {
      return res.status(409).json({ success: false, message: 'Doctor with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const [newDoctor] = await db.insert(doctorsTable).values({
      first_name,
      last_name,
      email,
      password_hash: hashedPassword,
      phone,
      address,
      category
    }).returning();

    // Notify the doctor (Welcome message)
    try {
      const { notificationsTable } = require('../config/schema');
      await db.insert(notificationsTable).values({
        user_id: newDoctor.id,
        user_role: 'doctor',
        title: 'Welcome to MediCare',
        message: `Welcome Dr. ${first_name} ${last_name}! Your account has been created successfully. You can now manage your appointments and patients.`,
        type: 'info',
        related_id: newDoctor.id
      });
    } catch (notifierErr) {
      console.error('Failed to send doctor welcome notification:', notifierErr);
    }

    res.status(201).json({ success: true, data: newDoctor });
  } catch (err) {
    console.error('Create doctor error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getDoctors = async (req, res) => {
  try {
    const doctors = await db.select().from(doctorsTable);
    res.json({ success: true, data: doctors });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const updateDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, phone, address, category } = req.body;

    const [updatedDoctor] = await db.update(doctorsTable)
      .set({ first_name, last_name, phone, address, category, updated_at: new Date() })
      .where(eq(doctorsTable.id, parseInt(id)))
      .returning();

    if (!updatedDoctor) return res.status(404).json({ success: false, message: 'Doctor not found' });

    res.json({ success: true, data: updatedDoctor });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const deleteDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(doctorsTable).where(eq(doctorsTable.id, parseInt(id)));
    res.json({ success: true, message: 'Doctor deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = { createDoctor, getDoctors, updateDoctor, deleteDoctor };
