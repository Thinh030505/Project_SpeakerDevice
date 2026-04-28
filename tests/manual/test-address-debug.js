import fetch from 'node-fetch';

async function testDebug() {
    console.log('🔍 Debug Address API...\n');

    const timestamp = Date.now();
    const testUser = {
        username: 'debug' + timestamp,
        email: 'debug' + timestamp + '@example.com',
        password: 'Password123'
    };

    try {
        // Register
        const registerRes = await fetch('http://localhost:3000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testUser)
        });
        const registerData = await registerRes.json();
        const token = registerData.data.accessToken;
        console.log('✅ Registered');

        // Create address
        const address = {
            fullName: 'Test User',
            phone: '0901234567',
            address: '123 Test Street Test Ward',
            ward: 'Test Ward',
            district: 'Test District',
            city: 'Test City'
        };

        const createRes = await fetch('http://localhost:3000/api/users/addresses', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(address)
        });
        const createData = await createRes.json();
        const addressId = createData.data.address._id;
        console.log('✅ Created address:', addressId);

        // Get by ID
        console.log('\n🔍 Testing GET by ID...');
        const getRes = await fetch(`http://localhost:3000/api/users/addresses/${addressId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Status:', getRes.status);
        const getData = await getRes.json();
        console.log('Response:', JSON.stringify(getData, null, 2));

        // Set default
        console.log('\n🌟 Testing SET DEFAULT...');
        const setDefaultRes = await fetch(`http://localhost:3000/api/users/addresses/${addressId}/set-default`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Status:', setDefaultRes.status);
        const setDefaultData = await setDefaultRes.json();
        console.log('Response:', JSON.stringify(setDefaultData, null, 2));

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    }
}

testDebug();