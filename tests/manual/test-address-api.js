import fetch from 'node-fetch';

// Test toàn bộ API address CRUD
async function testAddressAPI() {
    console.log('🧪 Testing Address API (CRUD)...\n');

    const timestamp = Date.now();
    const testUser = {
        username: 'addresstest' + timestamp,
        email: 'addresstest' + timestamp + '@example.com',
        password: 'password123'
    };

    let accessToken = null;
    let createdAddressId = null;

    try {
        // Bước 1: Đăng ký user mới
        console.log('1. 📝 Registering new user...');
        const registerResponse = await fetch('http://localhost:3000/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testUser)
        });

        const registerData = await registerResponse.json();

        if (registerData.success) {
            console.log('✅ Registration successful');
            accessToken = registerData.data.accessToken;
        } else {
            console.log('❌ Registration failed:', registerData.message);
            return;
        }

        // Bước 2: Test GET addresses (empty list)
        console.log('\n2. 📋 Testing get addresses (empty list)...');
        const getResponse1 = await fetch('http://localhost:3000/api/users/addresses', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            }
        });

        const getData1 = await getResponse1.json();

        if (getData1.success) {
            console.log('✅ Get addresses successful');
            console.log(`   📊 Address count: ${getData1.data.addresses.length}`);
            if (getData1.data.addresses.length === 0) {
                console.log('   ✅ Correctly returned empty list');
            }
        } else {
            console.log('❌ Get addresses failed:', getData1.message);
        }

        // Bước 3: Test CREATE address với dữ liệu hợp lệ
        console.log('\n3. ➕ Testing create address with valid data...');
        const addressData1 = {
            fullName: 'Nguyễn Văn A',
            phone: '0901234567',
            address: '123 Đường ABC, Khu phố 1',
            ward: 'Phường Bến Nghé',
            district: 'Quận 1',
            city: 'TP. Hồ Chí Minh',
            isDefault: true,
            note: 'Giao hàng giờ hành chính'
        };

        const createResponse1 = await fetch('http://localhost:3000/api/users/addresses', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(addressData1)
        });

        const createData1 = await createResponse1.json();

        if (createData1.success) {
            console.log('✅ Create address successful');
            console.log(`   🆔 Address ID: ${createData1.data.address._id}`);
            console.log(`   👤 Full Name: ${createData1.data.address.fullName}`);
            console.log(`   📱 Phone: ${createData1.data.address.phone}`);
            console.log(`   🏠 Address: ${createData1.data.address.address}`);
            console.log(`   🌟 Is Default: ${createData1.data.address.isDefault}`);
            createdAddressId = createData1.data.address._id;
        } else {
            console.log('❌ Create address failed:', createData1.message);
            if (createData1.errors) {
                createData1.errors.forEach(error => {
                    console.log(`   📝 Error: ${error.message}`);
                });
            }
        }

        // Bước 4: Test CREATE address thứ 2 (không default)
        console.log('\n4. ➕ Testing create second address...');
        const addressData2 = {
            fullName: 'Nguyễn Văn B',
            phone: '+84987654321',
            address: '456 Đường XYZ, Khu phố 2',
            ward: 'Phường Đa Kao',
            district: 'Quận 1',
            city: 'TP. Hồ Chí Minh',
            isDefault: false,
            note: 'Giao hàng buổi tối'
        };

        const createResponse2 = await fetch('http://localhost:3000/api/users/addresses', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(addressData2)
        });

        const createData2 = await createResponse2.json();

        if (createData2.success) {
            console.log('✅ Create second address successful');
            console.log(`   🆔 Address ID: ${createData2.data.address._id}`);
            console.log(`   👤 Full Name: ${createData2.data.address.fullName}`);
            console.log(`   🌟 Is Default: ${createData2.data.address.isDefault}`);
        } else {
            console.log('❌ Create second address failed:', createData2.message);
        }

        // Bước 5: Test GET addresses (should have 2 addresses)
        console.log('\n5. 📋 Testing get addresses (should have 2)...');
        const getResponse2 = await fetch('http://localhost:3000/api/users/addresses', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            }
        });

        const getData2 = await getResponse2.json();

        if (getData2.success) {
            console.log('✅ Get addresses successful');
            console.log(`   📊 Address count: ${getData2.data.addresses.length}`);

            getData2.data.addresses.forEach((addr, index) => {
                console.log(`   ${index + 1}. ${addr.fullName} - ${addr.address} (Default: ${addr.isDefault})`);
            });
        } else {
            console.log('❌ Get addresses failed:', getData2.message);
        }

        // Bước 6: Test CREATE address với dữ liệu không hợp lệ
        console.log('\n6. ❌ Testing create address with invalid data...');
        const invalidAddressData = {
            fullName: 'A', // Too short
            phone: '123', // Invalid phone
            address: '', // Empty address
            // Missing required fields
        };

        const createResponse3 = await fetch('http://localhost:3000/api/users/addresses', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(invalidAddressData)
        });

        const createData3 = await createResponse3.json();

        if (!createData3.success) {
            console.log('✅ Correctly rejected invalid data');
            if (createData3.errors) {
                console.log('   📝 Validation errors:');
                createData3.errors.forEach(error => {
                    console.log(`      - ${error.message}`);
                });
            }
        } else {
            console.log('❌ Should have rejected invalid data');
        }

        // Bước 7: Test DELETE address
        if (createdAddressId) {
            console.log('\n7. 🗑️  Testing delete address...');
            const deleteResponse = await fetch(`http://localhost:3000/api/users/addresses/${createdAddressId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                }
            });

            const deleteData = await deleteResponse.json();

            if (deleteData.success) {
                console.log('✅ Delete address successful');
                console.log(`   📝 Message: ${deleteData.message}`);
            } else {
                console.log('❌ Delete address failed:', deleteData.message);
            }
        }

        // Bước 8: Test GET addresses after delete
        console.log('\n8. 📋 Testing get addresses after delete...');
        const getResponse3 = await fetch('http://localhost:3000/api/users/addresses', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            }
        });

        const getData3 = await getResponse3.json();

        if (getData3.success) {
            console.log('✅ Get addresses after delete successful');
            console.log(`   📊 Address count: ${getData3.data.addresses.length}`);

            getData3.data.addresses.forEach((addr, index) => {
                console.log(`   ${index + 1}. ${addr.fullName} - ${addr.address}`);
            });
        } else {
            console.log('❌ Get addresses after delete failed:', getData3.message);
        }

        // Bước 9: Test DELETE non-existent address
        console.log('\n9. 👻 Testing delete non-existent address...');
        const fakeId = '507f1f77bcf86cd799439011'; // Valid ObjectId format
        const deleteResponse2 = await fetch(`http://localhost:3000/api/users/addresses/${fakeId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            }
        });

        const deleteData2 = await deleteResponse2.json();

        if (!deleteData2.success) {
            console.log('✅ Correctly rejected non-existent address');
            console.log(`   📝 Error: ${deleteData2.message}`);
        } else {
            console.log('❌ Should have rejected non-existent address');
        }

        // Bước 10: Test API without authentication
        console.log('\n10. 🔒 Testing API without authentication...');
        const noAuthResponse = await fetch('http://localhost:3000/api/users/addresses', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        const noAuthData = await noAuthResponse.json();

        if (!noAuthData.success) {
            console.log('✅ Correctly rejected request without auth');
            console.log(`   📝 Error: ${noAuthData.message}`);
        } else {
            console.log('❌ Should have rejected request without auth');
        }

    } catch (error) {
        console.error('❌ Test error:', error.message);
    }

    console.log('\n🏁 Address API Tests Completed!');
}

testAddressAPI();