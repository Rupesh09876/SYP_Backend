require('dotenv').config();
const bcrypt = require('bcryptjs');
const { db } = require('./config/db');
const { usersTable } = require('./config/schema');
const { eq } = require('drizzle-orm');

(async () => {
  try {
    const email = 'admin@hams.com';
    const password = 'Admin@123';

    // check if admin already exists
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));

    if (existing.length > 0) {
      console.log('Admin already exists:', email);
      process.exit(0);
    }

    const password_hash = await bcrypt.hash(password, 12);

    const [admin] = await db.insert(usersTable).values({
      first_name: 'System',
      last_name: 'Administrator',
      email,
      password_hash,
      role: 'admin',
      phone: '+9779800000000',
    }).returning();

    console.log('Admin created successfully!');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(admin);
    process.exit(0);
  } catch (err) {
    console.error('Error creating admin:', err);
    process.exit(1);
  }
})();
