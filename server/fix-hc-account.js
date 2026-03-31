const db = require('./config/db');
const bcrypt = require('bcryptjs');

async function fixHCAccount() {
    try {
        console.log('Fixing HC account...');

        // Find HC user
        const [hcUsers] = await db.query('SELECT * FROM users WHERE role = ?', ['hc']);

        if (hcUsers.length === 0) {
            console.log('No HC user found in the database.');
            process.exit(1);
        }

        console.log(`Found ${hcUsers.length} HC user(s):`);
        hcUsers.forEach(user => {
            console.log(`  - ${user.full_name} (${user.email})`);
        });

        // Reset password for all HC users to a known value
        const newPassword = 'HC@2024';
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        for (const user of hcUsers) {
            await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id]);
            console.log(`✓ Password reset for ${user.full_name} (${user.email})`);
        }

        console.log('\n===========================================');
        console.log('HC Account(s) Fixed Successfully!');
        console.log('===========================================');
        console.log('Login credentials:');
        hcUsers.forEach(user => {
            console.log(`  Email: ${user.email}`);
        });
        console.log(`  Password: ${newPassword}`);
        console.log('===========================================\n');

        process.exit(0);
    } catch (err) {
        console.error('Failed to fix HC account:', err);
        process.exit(1);
    }
}

fixHCAccount();
