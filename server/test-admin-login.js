const axios = require('axios');

async function testAdminLogin() {
    try {
        console.log('Testing Admin Login...');
        const response = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'admin@oldmutual.rw',
            password: 'Admin123'
        });

        console.log('Login Success!');
        console.log('Response:', JSON.stringify(response.data, null, 2));
        process.exit(0);
    } catch (error) {
        console.error('Login Failed:', error.message);
        if (error.response) {
            console.error('Response Data:', error.response.data);
        }
        process.exit(1);
    }
}

testAdminLogin();
