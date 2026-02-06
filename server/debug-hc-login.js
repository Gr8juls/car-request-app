const db = require('./config/db');
const bcrypt = require('bcryptjs');

async function debugHCLogin() {
    try {
        console.log('Debugging HC login issue...\n');

        // Get HC user details
        const [hcUsers] = await db.query('SELECT id, full_name, email, password, role FROM users WHERE role = ?', ['hc']);

        if (hcUsers.length === 0) {
            console.log('No HC users found!');
            process.exit(1);
        }

        console.log(`Found ${hcUsers.length} HC user(s):\n`);

        for (const user of hcUsers) {
            console.log(`User: ${user.full_name} (${user.email})`);
            console.log(`Role: ${user.role}`);
            console.log(`Password hash (first 50 chars): ${user.password.substring(0, 50)}...\n`);

            // Test password comparison
            const testPassword = 'HC@2024';
            const isMatch = await bcrypt.compare(testPassword, user.password);
            console.log(`Testing password "${testPassword}": ${isMatch ? '✓ MATCH' : '✗ NO MATCH'}`);

            // Try common passwords
            const commonPasswords = ['password123', 'Password123', 'hc@2024', 'HC2024'];
            for (const pwd of commonPasswords) {
                const match = await bcrypt.compare(pwd, user.password);
                if (match) {
                    console.log(`  ✓ Found matching password: "${pwd}"`);
                }
            }
            console.log('');
        }

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

debugHCLogin();
