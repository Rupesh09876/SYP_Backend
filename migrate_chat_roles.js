require('dotenv').config();
const { db } = require('./config/db');

(async () => {
    try {
        console.log('Adding sender_role and receiver_role to messages table...');
        
        // Add columns if they don't exist
        await db.execute(`
            ALTER TABLE messages 
            ADD COLUMN IF NOT EXISTS sender_role VARCHAR(20),
            ADD COLUMN IF NOT EXISTS receiver_role VARCHAR(20);
        `);

        // Update existing messages to have default roles 
        // We assume sender_id in users table means patient, doctor_id in doctors table means doctor.
        // But since they overlap, this is tricky. 
        // For existing messages, we might just mark them as 'unknown' or try to guess.
        // Let's just set them to a default or leave null for now, and handle nulls in the controller.
        
        console.log('Migration complete!');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
})();
