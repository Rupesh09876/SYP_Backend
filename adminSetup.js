require('dotenv').config();
const bcrypt = require('bcryptjs');
const { db } = require('./config/db');
const { usersTable } = require('./config/schema');
const { eq } = require('drizzle-orm');

const createAdmin = async () => {
  try {
    const adminEmail = 'admin@hams.com';
    const adminPassword = 'Admin@123';

    // Drizzle syntax using eq()
    const existingAdmin = await db.select().from(usersTable).where(eq(usersTable.email, adminEmail));

    if (existingAdmin.length > 0) {
      console.log('Admin already exists');
      return;
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    const [newAdmin] = await db.insert(usersTable).values({
      first_name: 'Admin',
      last_name: 'User',
      email: adminEmail,
      password_hash: hashedPassword,
      role: 'admin'
    }).returning();

    console.log(' Default admin created successfully!');
    console.log(' Email:', newAdmin.email);
    console.log(' Password:', adminPassword);
  } catch (err) {
    console.error(' Error creating admin:', err);
  } finally {
    process.exit();
  }
};

createAdmin();
