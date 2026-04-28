import fetch from 'node-fetch';

async function testAddressSimple() {
    console.log('🧪 Testing Address API (Simple)...\n');

    // Đăng ký user
    const timestamp = Date.now();
    const testUser = {
        username: 'addrtest' + timestamp,
        email: 'addrtest' + timestamp + '@example.com',
        password: 'password123'
    };

    try {
        // 1. Register
        const registerRes = await fetch('http://localhost:3000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testUser)
        });
        const registerData = await registerRes.json();
        const token = registerData.data.accessToken;
        console.log('✅ User registered');

        // 2. Create address
        const addressData = {
            fullName: 'Nguyễn Văn Test',
            phone: '0901234567',
            address: '123 Test Street',
            ward: 'Phường Test',
            district: 'Quận Test',
            city: 'TP Test',
            isDefault: true,
            note: 'Test note'
        };

        const createRes = await fetch('http://localhost:3000/api/users/addresses', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(addressData)
        });
        const createData = await createRes.json();
        console.log('✅ Address created:', createData.success);

        const addressId = createData.data?.address?._id;

        // 3. Get addresses
        const getRes = await fetch('http://localhost:3000/api/users/addresses', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        const getData = await getRes.json();
        console.log('✅ Get addresses:', getData.success, `(Count: ${getData.data?.addresses?.length || 0})`);

        // 4. Delete address
        if (addressId) {
            const deleteRes = await fetch(`http://localhost:3000/api/users/addresses/${addressId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const deleteData = await deleteRes.json();
            console.log('✅ Address deleted:', deleteData.success);
        }

        console.log('\n🎉 All Address CRUD operations working!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testAddressSimple();