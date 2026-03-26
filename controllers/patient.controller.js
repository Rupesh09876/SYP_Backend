const { db } = require('../config/db');
const { usersTable } = require('../config/schema');
const { eq } = require('drizzle-orm');

const getPatients = async (req, res) => {
  try {
    const patients = await db.select().from(usersTable).where(eq(usersTable.role, 'patient'));
    res.json({ success: true, data: patients });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const updatePatient = async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, phone } = req.body;

    const [updatedPatient] = await db.update(usersTable)
      .set({ first_name, last_name, phone, updated_at: new Date() })
      .where(eq(usersTable.id, parseInt(id)))
      .returning();

    if (!updatedPatient) return res.status(404).json({ success: false, message: 'Patient not found' });

    res.json({ success: true, data: updatedPatient });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const deletePatient = async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(usersTable).where(eq(usersTable.id, parseInt(id)));
    res.json({ success: true, message: 'Patient deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = { getPatients, updatePatient, deletePatient };
