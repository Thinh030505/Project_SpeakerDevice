import fetch from 'node-fetch';

async function testAddressComplete() {
    console.log('🧪 Testing Complete Address CRUD API...\n');

    const timestamp = Date.now();
    const testUser = {
        username: 'addressfull' + timestamp,
        email: 'addressfull' + timestamp + '@example.com',
        password: 'Password123'
    };

    let accessToken = null;
    let addressId1 = null;
    let addressId2 = null;

    try {
        // 1. Register user
        console.log('1. 📝 Registering test user...');
        const registerRes = await fetch('http://localhost:3000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testUser)
        });
        const registerData = await registerRes.json();

        if (registerData.success) {
            console.log('✅ User registered');
            accessToken = registerData.data.accessToken;
        } else {
            console.log('❌ Registration failed');
            return;
        }

        // 2. CREATE - Tạo địa chỉ đầu tiên (default)
        console.log('\n2. ➕ CREATE - Creating first address (default)...');
        const address1 = {
            fullName: 'Nguyễn Văn A',
            phone: '0901234567',
            address: '123 Đường Lê Lợi, Phường Bến Nghé',
            ward: 'Phường Bến Nghé',
            district: 'Quận 1',
            city: 'TP. Hồ Chí Minh',
            isDefault: true,
            note: 'Nhà riêng'
        };

        const createRes1 = await fetch('http://localhost:3000/api/users/addresses', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(address1)
        });
        const createData1 = await createRes1.json();

        if (createData1.success) {
            addressId1 = createData1.data.address._id;
            console.log('✅ First address created');
            console.log(`   🆔 ID: ${addressId1}`);
            console.log(`   👤 Name: ${createData1.data.address.fullName}`);
            console.log(`   🌟 Default: ${createData1.data.address.isDefault}`);
        } else {
            console.log('❌ Failed to create first address');
        }

        // 3. CREATE - Tạo địa chỉ thứ hai
        console.log('\n3. ➕ CREATE - Creating second address...');
        const address2 = {
            fullName: 'Nguyễn Văn B',
            phone: '0987654321',
            address: '456 Đường Nguyễn Huệ, Phường Bến Thành',
            ward: 'Phường Bến Thành',
            district: 'Quận 1',
            city: 'TP. Hồ Chí Minh',
            isDefault: false,
            note: 'Văn phòng'
        };

        const createRes2 = await fetch('http://localhost:3000/api/users/addresses', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(address2)
        });
        const createData2 = await createRes2.json();

        if (createData2.success) {
            addressId2 = createData2.data.address._id;
            console.log('✅ Second address created');
            console.log(`   🆔 ID: ${addressId2}`);
            console.log(`   👤 Name: ${createData2.data.address.fullName}`);
            console.log(`   🌟 Default: ${createData2.data.address.isDefault}`);
        } else {
            console.log('❌ Failed to create second address');
        }

        // 4. READ - Lấy tất cả địa chỉ
        console.log('\n4. 📋 READ - Getting all addresses...');
        const getAllRes = await fetch('http://localhost:3000/api/users/addresses', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        const getAllData = await getAllRes.json();

        if (getAllData.success) {
            console.log('✅ All addresses retrieved');
            console.log(`   📊 Total: ${getAllData.data.total}`);
            getAllData.data.addresses.forEach((addr, index) => {
                console.log(`   ${index + 1}. ${addr.fullName} - ${addr.city} ${addr.isDefault ? '⭐' : ''}`);
            });
        } else {
            console.log('❌ Failed to get addresses');
        }

        // 5. READ - Lấy địa chỉ theo ID
        if (addressId1) {
            console.log('\n5. 🔍 READ - Getting address by ID...');
            const getByIdRes = await fetch(`http://localhost:3000/api/users/addresses/${addressId1}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            const getByIdData = await getByIdRes.json();

            if (getByIdData.success) {
                console.log('✅ Address retrieved by ID');
                console.log(`   👤 Name: ${getByIdData.data.address.fullName}`);
                console.log(`   📱 Phone: ${getByIdData.data.address.phone}`);
                console.log(`   🏠 Address: ${getByIdData.data.address.address}`);
            } else {
                console.log('❌ Failed to get address by ID');
            }
        }

        // 6. UPDATE - Cập nhật địa chỉ
        if (addressId1) {
            console.log('\n6. ✏️  UPDATE - Updating first address...');
            const updateData = {
                fullName: 'Nguyễn Văn A Mới',
                phone: '0909999999',
                address: '789 Đường Lê Lợi Cập Nhật Mới',
                ward: 'Phường Bến Nghé',
                district: 'Quận 1',
                city: 'TP. Hồ Chí Minh',
                note: 'Nhà riêng - Đã cập nhật'
            };

            const updateRes = await fetch(`http://localhost:3000/api/users/addresses/${addressId1}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });
            const updateResult = await updateRes.json();

            if (updateResult.success) {
                console.log('✅ Address updated successfully');
                console.log(`   👤 New Name: ${updateResult.data.address.fullName}`);
                console.log(`   📱 New Phone: ${updateResult.data.address.phone}`);
                console.log(`   📝 Note: ${updateResult.data.address.note}`);
            } else {
                console.log('❌ Failed to update address');
                if (updateResult.errors) {
                    updateResult.errors.forEach(err => {
                        console.log(`   - ${err.field}: ${err.message}`);
                    });
                }
            }
        }

        // 7. SET DEFAULT - Đặt địa chỉ thứ 2 làm mặc định
        if (addressId2) {
            console.log('\n7. 🌟 SET DEFAULT - Setting second address as default...');
            const setDefaultRes = await fetch(`http://localhost:3000/api/users/addresses/${addressId2}/set-default`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            const setDefaultData = await setDefaultRes.json();

            if (setDefaultData.success) {
                console.log('✅ Default address changed');
                if (setDefaultData.data && setDefaultData.data.address) {
                    console.log(`   🌟 New default: ${setDefaultData.data.address.fullName}`);
                    console.log(`   🆔 ID: ${setDefaultData.data.address._id}`);
                } else {
                    console.log('   ⚠️  Response missing address data');
                }
            } else {
                console.log('❌ Failed to set default address');
            }

            // Verify default changed
            const verifyRes = await fetch('http://localhost:3000/api/users/addresses', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            const verifyData = await verifyRes.json();

            if (verifyData.success) {
                console.log('   📋 Verification:');
                verifyData.data.addresses.forEach((addr) => {
                    console.log(`      ${addr.fullName}: Default = ${addr.isDefault}`);
                });
            }
        }

        // 8. DELETE - Xóa địa chỉ không phải default
        if (addressId1) {
            console.log('\n8. 🗑️  DELETE - Deleting first address...');
            const deleteRes = await fetch(`http://localhost:3000/api/users/addresses/${addressId1}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            const deleteData = await deleteRes.json();

            if (deleteData.success) {
                console.log('✅ Address deleted successfully');
            } else {
                console.log('❌ Failed to delete address');
            }
        }

        // 9. Verify after delete
        console.log('\n9. 📋 Verifying addresses after delete...');
        const finalRes = await fetch('http://localhost:3000/api/users/addresses', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        const finalData = await finalRes.json();

        if (finalData.success) {
            console.log('✅ Final address list:');
            console.log(`   📊 Total: ${finalData.data.total}`);
            finalData.data.addresses.forEach((addr, index) => {
                console.log(`   ${index + 1}. ${addr.fullName} - Default: ${addr.isDefault}`);
            });
        }

        // 10. DELETE default address - should auto-set another as default
        if (addressId2) {
            console.log('\n10. 🗑️  DELETE - Deleting default address...');

            // Create one more address first
            const address3 = {
                fullName: 'Nguyễn Văn C',
                phone: '0912345678',
                address: '999 Test Street',
                ward: 'Test Ward',
                district: 'Test District',
                city: 'Test City',
                isDefault: false
            };

            await fetch('http://localhost:3000/api/users/addresses', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(address3)
            });

            // Now delete the default address
            const deleteDefaultRes = await fetch(`http://localhost:3000/api/users/addresses/${addressId2}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            const deleteDefaultData = await deleteDefaultRes.json();

            if (deleteDefaultData.success) {
                console.log('✅ Default address deleted');

                // Check if another address became default
                const checkRes = await fetch('http://localhost:3000/api/users/addresses', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                const checkData = await checkRes.json();

                const hasDefault = checkData.data.addresses.some(addr => addr.isDefault);
                if (hasDefault) {
                    console.log('✅ Another address automatically set as default');
                    const defaultAddr = checkData.data.addresses.find(addr => addr.isDefault);
                    console.log(`   🌟 New default: ${defaultAddr.fullName}`);
                } else {
                    console.log('⚠️  No default address set');
                }
            }
        }

        console.log('\n🎉 All Address CRUD operations completed successfully!');

    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

testAddressComplete();