const db = require('./config/db');

async function switchRoles() {
    try {
        console.log('Starting role switch migration...');

        // IDs from research: Chantal = 53, Admin = 54
        const CHANTAL_ID = 53;
        const ADMIN_ID = 54;

        // 1. Update Chantal Habiyakare to Managing Director
        await db.query(`
            UPDATE users 
            SET manager_level = 'md'
            WHERE id = ?
        `, [CHANTAL_ID]);
        console.log('Updated Chantal Habiyakare (ID 53) to Managing Director level.');

        // 2. Update Admin to Line Manager level in Risk and Compliance
        await db.query(`
            UPDATE users 
            SET manager_level = 'sub_department', department_id = 1, sub_department_id = 1
            WHERE id = ?
        `, [ADMIN_ID]);
        console.log('Updated Admin (ID 54) to Line Manager level in Risk and Compliance.');

        // 3. Update management assignments
        // Admin becomes manager for Risk and Compliance sub-dept 1
        await db.query(`
            UPDATE sub_departments 
            SET manager_id = ? 
            WHERE id = 1
        `, [ADMIN_ID]);
        console.log('Admin (ID 54) assigned as Manager for Risk and Compliance sub-department.');

        // Chantal is no longer the sub-dept manager for Executive (id 11) as she is now MD
        await db.query(`
            UPDATE sub_departments 
            SET manager_id = NULL 
            WHERE id = 11
        `, []);
        console.log('Cleared Chantal as manager for Executive sub-department (id 11).');

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

switchRoles();
