const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../config/db');
const { doctorsTable } = require('../config/schema');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const adminAuth = [authenticateToken, authorizeRoles('admin')];

// POST / — Create a doctor (admin only)
router.post('/', ...adminAuth, async (req, res) => {
  try {
    const { first_name, last_name, email, password, phone, address, category } = req.body;

    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({ success: false, message: 'first_name, last_name, email, and password are required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [newDoctor] = await db.insert(doctorsTable).values({
      first_name,
      last_name,
      email,
      password_hash: hashedPassword,
      phone: phone || null,
      address: address || null,
      category: category || null,
    }).returning();

    const { password_hash, ...doctorOut } = newDoctor;
    res.status(201).json({ success: true, data: doctorOut });
  } catch (err) {
    console.error('Create doctor error:', err);
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: 'A doctor with this email already exists' });
    }
    res.status(500).json({ success: false, message: 'Failed to add doctor' });
  }
});

// GET / — List all doctors (admin, doctor, or patient)
router.get('/', authenticateToken, authorizeRoles('admin', 'doctor', 'patient'), async (req, res) => {
  try {
    const doctors = await db.select().from(doctorsTable);
    res.json({ success: true, data: doctors });
  } catch (err) {
    console.error('List doctors error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch doctors' });
  }
});

// PUT /:id — Update a doctor (admin only)
router.put('/:id', ...adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, email, phone, address, category, password } = req.body;
    const { eq } = require('drizzle-orm');

    const updates = {};
    if (first_name) updates.first_name = first_name;
    if (last_name) updates.last_name = last_name;
    if (email) updates.email = email;
    if (phone) updates.phone = phone;
    if (address) updates.address = address;
    if (category) updates.category = category;
    if (password) updates.password_hash = await bcrypt.hash(password, 10);

    const [updated] = await db.update(doctorsTable)
      .set(updates)
      .where(eq(doctorsTable.id, parseInt(id)))
      .returning();

    if (!updated) return res.status(404).json({ success: false, message: 'Doctor not found' });

    const { password_hash, ...doctorOut } = updated;
    res.json({ success: true, data: doctorOut });
  } catch (err) {
    console.error('Update doctor error:', err);
    res.status(500).json({ success: false, message: 'Failed to update doctor' });
  }
});

// DELETE /:id — Delete a doctor (admin only)
router.delete('/:id', ...adminAuth, async (req, res) => {
  try {
    const { eq } = require('drizzle-orm');
    const [deleted] = await db.delete(doctorsTable)
      .where(eq(doctorsTable.id, parseInt(req.params.id)))
      .returning();

    if (!deleted) return res.status(404).json({ success: false, message: 'Doctor not found' });

    res.json({ success: true, message: 'Doctor deleted successfully' });
  } catch (err) {
    console.error('Delete doctor error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete doctor' });
  }
});

module.exports = router;