import fetch from 'node-fetch';

async function testValidators() {
    console.log('🧪 Testing Validators...\n');

    const timestamp = Date.now();
    const testUser = {
        username: 'validatortest' + timestamp,
        email: 'validatortest' + timestamp + '@example.com',
        password: 'password123'
    };

    let accessToken = null;

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
            console.log('✅ User registered successfully');
            accessToken = registerData.data.accessToken;
        } else {
            console.log('❌ Registration failed:', registerData.message);
            return;
        }

        // 2. Test Address Validation - Valid Data
        console.log('\n2. ✅ Testing address validation with VALID data...');
        const validAddress = {
            fullName: 'Nguyễn Văn Test',
            phone: '0901234567',
            address: '123 Đường Test, Khu phố 1, Phường Test',
            ward: 'Phường Bến Nghé',
            district: 'Quận 1',
            city: 'TP. Hồ Chí Minh',
            note: 'Giao hàng giờ hành chính',
            isDefault: true
        };

        const validRes = await fetch('http://localhost:3000/api/users/addresses', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(validAddress)
        });
        const validData = await validRes.json();

        if (validData.success) {
            console.log('✅ Valid address accepted');
            console.log(`   🆔 Address ID: ${validData.data.address._id}`);
        } else {
            console.log('❌ Valid address rejected:', validData.message);
        }

        // 3. Test Address Validation - Invalid Data
        console.log('\n3. ❌ Testing address validation with INVALID data...');
        const invalidAddresses = [
            {
                data: {
                    fullName: 'A', // Too short
                    phone: '123', // Invalid phone
                    address: 'Short', // Too short
                    ward: '', // Empty
                    district: '', // Empty
                    city: '' // Empty
                },
                description: 'All fields invalid'
            },
            {
                data: {
                    fullName: 'Test User 123', // Contains numbers
                    phone: '0901234567',
                    address: '123 Test Street, Test Ward',
                    ward: 'Test Ward',
                    district: 'Test District',
                    city: 'Test City'
                },
                description: 'Full name contains numbers'
            },
            {
                data: {
                    fullName: 'Test User',
                    phone: '1234567890', // Invalid Vietnam phone
                    address: '123 Test Street, Test Ward',
                    ward: 'Test Ward',
                    district: 'Test District',
                    city: 'Test City'
                },
                description: 'Invalid Vietnam phone number'
            },
            {
                data: {
                    fullName: 'Test User',
                    phone: '0901234567',
                    address: 'Short', // Too short (less than 10 chars)
                    ward: 'Test Ward',
                    district: 'Test District',
                    city: 'Test City'
                },
                description: 'Address too short'
            }
        ];

        for (let i = 0; i < invalidAddresses.length; i++) {
            const test = invalidAddresses[i];
            console.log(`\n   Testing: ${test.description}`);

            const invalidRes = await fetch('http://localhost:3000/api/users/addresses', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(test.data)
            });
            const invalidData = await invalidRes.json();

            if (!invalidData.success) {
                console.log('   ✅ Correctly rejected invalid data');
                console.log('   📝 Validation errors:');
                if (invalidData.errors) {
                    invalidData.errors.forEach(error => {
                        console.log(`      - ${error.field}: ${error.message}`);
                    });
                }
            } else {
                console.log('   ❌ Should have rejected invalid data');
            }
        }

        // 4. Test Phone Number Validation
        console.log('\n4. 📱 Testing phone number validation...');
        const phoneTests = [
            { phone: '0901234567', valid: true, desc: 'Standard mobile' },
            { phone: '+84901234567', valid: true, desc: 'With country code' },
            { phone: '0987654321', valid: true, desc: 'Different mobile prefix' },
            { phone: '0123456789', valid: true, desc: 'Landline' },
            { phone: '090-123-4567', valid: true, desc: 'With dashes' },
            { phone: '090 123 4567', valid: true, desc: 'With spaces' },
            { phone: '1234567890', valid: false, desc: 'Invalid prefix' },
            { phone: '090123456', valid: false, desc: 'Too short' },
            { phone: '09012345678', valid: false, desc: 'Too long' },
            { phone: '+1234567890', valid: false, desc: 'Non-Vietnam country code' },
            { phone: '0801234567', valid: false, desc: 'Invalid Vietnam prefix' }
        ];

        for (const test of phoneTests) {
            const testAddress = {
                fullName: 'Test User',
                phone: test.phone,
                address: '123 Test Street, Test Ward',
                ward: 'Test Ward',
                district: 'Test District',
                city: 'Test City'
            };

            const phoneRes = await fetch('http://localhost:3000/api/users/addresses', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(testAddress)
            });
            const phoneData = await phoneRes.json();

            const result = phoneData.success === test.valid ? '✅' : '❌';
            console.log(`   ${result} ${test.phone} (${test.desc}): ${test.valid ? 'Valid' : 'Invalid'}`);

            if (!test.valid && phoneData.success) {
                console.log(`      ❌ Should have been rejected`);
            } else if (test.valid && !phoneData.success) {
                console.log(`      ❌ Should have been accepted`);
                if (phoneData.errors) {
                    phoneData.errors.forEach(error => {
                        if (error.field === 'phone') {
                            console.log(`         Error: ${error.message}`);
                        }
                    });
                }
            }
        }

        // 5. Test Profile Update Validation
        console.log('\n5. 👤 Testing profile update validation...');
        const profileTests = [
            {
                data: { firstName: 'Nguyễn', lastName: 'Văn A' },
                valid: true,
                desc: 'Valid Vietnamese names'
            },
            {
                data: { firstName: 'John123', lastName: 'Doe' },
                valid: false,
                desc: 'Name with numbers'
            },
            {
                data: { phone: '0901234567' },
                valid: true,
                desc: 'Valid phone'
            },
            {
                data: { phone: '123456' },
                valid: false,
                desc: 'Invalid phone'
            },
            {
                data: { dateOfBirth: '1990-01-01' },
                valid: true,
                desc: 'Valid date of birth'
            },
            {
                data: { dateOfBirth: '2020-01-01' },
                valid: false,
                desc: 'Too young (under 13)'
            }
        ];

        for (const test of profileTests) {
            const profileRes = await fetch('http://localhost:3000/api/users/profile', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(test.data)
            });
            const profileData = await profileRes.json();

            const result = profileData.success === test.valid ? '✅' : '❌';
            console.log(`   ${result} ${test.desc}: ${test.valid ? 'Valid' : 'Invalid'}`);

            if (!test.valid && profileData.success) {
                console.log(`      ❌ Should have been rejected`);
            } else if (test.valid && !profileData.success) {
                console.log(`      ❌ Should have been accepted`);
                if (profileData.errors) {
                    profileData.errors.forEach(error => {
                        console.log(`         ${error.field}: ${error.message}`);
                    });
                }
            }
        }

    } catch (error) {
        console.error('❌ Test error:', error.message);
    }

    console.log('\n🏁 Validator Tests Completed!');
}

testValidators();