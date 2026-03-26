require('dotenv').config();
const { db } = require('./config/db');

(async () => {
    try {
        console.log('Adding availability column to doctors table...');
        
        await db.execute(`
            ALTER TABLE doctors 
            ADD COLUMN IF NOT EXISTS availability JSONB DEFAULT '{"days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "startTime": "09:00", "endTime": "17:00"}'::jsonb;
        `);
        
        console.log('Migration complete without data loss!');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
})();
