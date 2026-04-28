import fetch from 'node-fetch';

async function testProductAPI() {
    console.log('🧪 Testing Product API...\n');

    const timestamp = Date.now();
    let accessToken = null;
    let categoryId = null;
    let productId = null;

    try {
        // 1. Register + Login
        console.log('1. 🔐 Registering user...');
        const registerRes = await fetch('http://localhost:3000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'prodtest' + timestamp,
                email: 'prodtest' + timestamp + '@example.com',
                password: 'Password123'
            })
        });
        const registerData = await registerRes.json();
        if (!registerData.success) {
            console.log('❌ Register failed:', registerData.message);
            return;
        }
        accessToken = registerData.data.accessToken;
        const userId = registerData.data.user._id;
        console.log('✅ Registered, userId:', userId);

        // 2. Tạo Category trước (cần cho product)
        console.log('\n2. 📁 Creating category...');
        const catRes = await fetch('http://localhost:3000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'dummy' + timestamp,
                email: 'dummy' + timestamp + '@example.com',
                password: 'Password123'
            })
        });

        // Tạo category trực tiếp qua mongoose (hoặc dùng API nếu có)
        // Thử GET products trước
        console.log('\n3. 📋 GET all products (empty)...');
        const getAllRes = await fetch('http://localhost:3000/api/products', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        const getAllData = await getAllRes.json();
        console.log(`   Status: ${getAllRes.status}`);
        if (getAllData.success) {
            console.log('✅ GET all products works');
            console.log(`   Total: ${getAllData.data.pagination.total}`);
        } else {
            console.log('❌ GET all products failed:', getAllData.message);
        }

        // 4. GET featured products
        console.log('\n4. ⭐ GET featured products...');
        const featuredRes = await fetch('http://localhost:3000/api/products/featured');
        const featuredData = await featuredRes.json();
        console.log(`   Status: ${featuredRes.status}`);
        if (featuredData.success) {
            console.log('✅ GET featured products works');
        } else {
            console.log('❌ GET featured products failed:', featuredData.message);
        }

        // 5. Search products
        console.log('\n5. 🔍 Search products...');
        const searchRes = await fetch('http://localhost:3000/api/products/search?q=test');
        const searchData = await searchRes.json();
        console.log(`   Status: ${searchRes.status}`);
        if (searchData.success) {
            console.log('✅ Search products works');
        } else {
            console.log('❌ Search failed:', searchData.message);
        }

        // 6. CREATE product (sẽ fail nếu không có category)
        console.log('\n6. ➕ CREATE product (without valid category)...');
        const createRes = await fetch('http://localhost:3000/api/products', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: 'Test Product',
                description: 'This is a test product description',
                category: '507f1f77bcf86cd799439011', // fake ID
                variants: [{
                    sku: 'TEST-SKU-001',
                    attributes: { size: 'M', color: 'Red' },
                    price: 100000,
                    stock: 50
                }]
            })
        });
        const createData = await createRes.json();
        console.log(`   Status: ${createRes.status}`);
        if (!createData.success) {
            console.log('✅ Correctly rejected invalid category:', createData.message);
        } else {
            console.log('✅ Product created:', createData.data.product._id);
            productId = createData.data.product._id;
        }

        // 7. GET product by invalid ID
        console.log('\n7. 🔍 GET product by non-existent ID...');
        const getByIdRes = await fetch('http://localhost:3000/api/products/507f1f77bcf86cd799439011');
        const getByIdData = await getByIdRes.json();
        console.log(`   Status: ${getByIdRes.status}`);
        if (!getByIdData.success) {
            console.log('✅ Correctly returned 404:', getByIdData.message);
        }

        // 8. Validation test - missing required fields
        console.log('\n8. ❌ CREATE product with missing fields...');
        const invalidRes = await fetch('http://localhost:3000/api/products', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: 'AB', // Too short
                // missing description, category, variants
            })
        });
        const invalidData = await invalidRes.json();
        console.log(`   Status: ${invalidRes.status}`);
        if (!invalidData.success) {
            console.log('✅ Correctly rejected invalid data');
            if (invalidData.errors) {
                invalidData.errors.forEach(e => console.log(`   - ${e.field}: ${e.message}`));
            }
        }

        // 9. CREATE without auth
        console.log('\n9. 🔒 CREATE product without auth...');
        const noAuthRes = await fetch('http://localhost:3000/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Test' })
        });
        const noAuthData = await noAuthRes.json();
        console.log(`   Status: ${noAuthRes.status}`);
        if (!noAuthData.success) {
            console.log('✅ Correctly rejected unauthenticated request:', noAuthData.message);
        }

    } catch (error) {
        console.error('❌ Test error:', error.message);
    }

    console.log('\n🏁 Product API Tests Completed!');
}

testProductAPI();
