const axios = require('axios');

async function testHCLogin() {
    try {
        console.log('Testing HC login via API...\n');

        const testCases = [
            { email: 'MLuce@oldmutual.rw', password: 'HC@2024' },
            { email: 'BGerard@oldmutual.rw', password: 'HC@2024' },
            { email: 'mluce@oldmutual.rw', password: 'HC@2024' }, // lowercase
        ];

        for (const testCase of testCases) {
            console.log(`Testing: ${testCase.email} / ${testCase.password}`);
            try {
                const response = await axios.post('http://localhost:5000/api/auth/login', testCase);
                console.log('✓ SUCCESS!');
                console.log('Response:', response.data);
            } catch (error) {
                console.log('✗ FAILED');
                if (error.response) {
                    console.log('Status:', error.response.status);
                    console.log('Error:', error.response.data);
                } else {
                    console.log('Error:', error.message);
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

testHCLogin();
