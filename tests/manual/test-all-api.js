import fetch from 'node-fetch';

const BASE = 'http://localhost:3000/api';
let token = '';
let userId = '';
let productId = '';
let productSlug = '';
let categoryId = '';
let addressId = '';

let passed = 0;
let failed = 0;

// ── helpers ───────────────────────────────────────────────────────────────────

const ok = (label, cond, info = '') => {
    if (cond) { console.log(`  ✅ ${label}${info ? ' | ' + info : ''}`); passed++; }
    else { console.log(`  ❌ ${label}${info ? ' | ' + info : ''}`); failed++; }
};

const get = (path, auth = false) =>
    fetch(`${BASE}${path}`, {
        headers: auth ? { Authorization: `Bearer ${token}` } : {}
    }).then(async r => {
        const text = await r.text();
        try { return JSON.parse(text); }
        catch { return { success: false, message: `HTML response (${r.status}): ${path}` }; }
    });

const post = (path, body, auth = false) =>
    fetch(`${BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body)
    }).then(async r => {
        const text = await r.text();
        try { return JSON.parse(text); }
        catch { return { success: false, message: `HTML response (${r.status}): ${path}` }; }
    });

const put = (path, body, auth = true) =>
    fetch(`${BASE}${path}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body)
    }).then(async r => {
        const text = await r.text();
        try { return JSON.parse(text); }
        catch { return { success: false, message: `HTML response (${r.status}): ${path}` }; }
    });

const del = (path, auth = true) =>
    fetch(`${BASE}${path}`, {
        method: 'DELETE',
        headers: auth ? { Authorization: `Bearer ${token}` } : {}
    }).then(async r => {
        const text = await r.text();
        try { return JSON.parse(text); }
        catch { return { success: false, message: `HTML response (${r.status}): ${path}` }; }
    });

// ── TESTS ─────────────────────────────────────────────────────────────────────

async function testAuth() {
    console.log('\n🔐 AUTH API');
    const ts = Date.now();

    // Register
    const reg = await post('/auth/register', {
        username: `user${ts}`, email: `user${ts}@test.com`, password: 'Test1234'
    });
    ok('Register', reg.success, `user${ts}`);
    ok('Register returns tokens', !!reg.data?.accessToken && !!reg.data?.refreshToken);

    // Register duplicate email
    const regDup = await post('/auth/register', {
        username: `user${ts}x`, email: `user${ts}@test.com`, password: 'Test1234'
    });
    ok('Register duplicate email → 400', !regDup.success);

    // Login with username
    const login = await post('/auth/login', { username: `user${ts}`, password: 'Test1234' });
    ok('Login with username', login.success);
    ok('Login returns accessToken', !!login.data?.accessToken);
    token = login.data.accessToken;
    userId = login.data.user._id;

    // Login with email
    const loginEmail = await post('/auth/login', { username: `user${ts}@test.com`, password: 'Test1234' });
    ok('Login with email', loginEmail.success);

    // Login wrong password
    const loginWrong = await post('/auth/login', { username: `user${ts}`, password: 'wrongpass' });
    ok('Login wrong password → fail', !loginWrong.success);

    // Login missing fields
    const loginMissing = await post('/auth/login', { username: `user${ts}` });
    ok('Login missing password → fail', !loginMissing.success);

    // Refresh token
    const refresh = await post('/auth/refresh-token', { refreshToken: reg.data.refreshToken });
    ok('Refresh token', refresh.success, refresh.data?.accessToken ? 'new token ok' : '');

    // Validate phone
    const vPhone = await post('/auth/validate-phone', { phone: '0901234567' });
    ok('Validate phone valid', vPhone.success, vPhone.data?.formattedPhone);

    const vPhoneInvalid = await post('/auth/validate-phone', { phone: '123' });
    ok('Validate phone invalid → fail', !vPhoneInvalid.success);

    // Admin login for product tests
    const adminLogin = await post('/auth/login', { username: 'admin', password: 'Admin123' });
    ok('Admin login', adminLogin.success);
    if (adminLogin.success) token = adminLogin.data.accessToken;
}

async function testProfile() {
    console.log('\n👤 PROFILE API');

    // Get profile
    const profile = await get('/auth/profile', true);
    ok('Get profile', profile.success, profile.data?.user?.username);

    // Get profile no token
    const noAuth = await get('/auth/profile', false);
    ok('Get profile no token → 401', !noAuth.success);

    // Update profile
    const update = await put('/users/profile', {
        firstName: 'Nguyễn', lastName: 'Admin',
        phone: '0901234567', dateOfBirth: '1990-01-01'
    });
    ok('Update profile', update.success, `${update.data?.user?.profile?.firstName} ${update.data?.user?.profile?.lastName}`);

    // Update invalid phone
    const badPhone = await put('/users/profile', { phone: '123456' });
    ok('Update invalid phone → fail', !badPhone.success);

    // Update invalid name (has numbers)
    const badName = await put('/users/profile', { firstName: 'Test123' });
    ok('Update name with numbers → fail', !badName.success);

    // Change password
    const changePwd = await put('/auth/change-password', {
        currentPassword: 'Admin123', newPassword: 'Admin1234'
    });
    ok('Change password', changePwd.success);

    // Restore password
    await put('/auth/change-password', { currentPassword: 'Admin1234', newPassword: 'Admin123' });

    // Re-login after password change
    const reLogin = await post('/auth/login', { username: 'admin', password: 'Admin123' });
    if (reLogin.success) token = reLogin.data.accessToken;
    ok('Re-login after password restore', reLogin.success);
}

async function testAddress() {
    console.log('\n🏠 ADDRESS API');

    // Get empty list
    const empty = await get('/users/addresses', true);
    ok('Get addresses (empty)', empty.success, `count=${empty.data?.addresses?.length}`);

    // Create address
    const create = await post('/users/addresses', {
        fullName: 'Nguyễn Văn Test',
        phone: '0901234567',
        address: '123 Đường Test Khu Phố 1 Phường Test',
        ward: 'Phường Bến Nghé',
        district: 'Quận 1',
        city: 'TP. Hồ Chí Minh',
        isDefault: true,
        note: 'Giao giờ hành chính'
    }, true);
    ok('Create address', create.success, create.data?.address?._id);
    addressId = create.data?.address?._id;

    // Create second address
    const create2 = await post('/users/addresses', {
        fullName: 'Nguyễn Văn B',
        phone: '0987654321',
        address: '456 Đường Test Khu Phố 2 Phường Test',
        ward: 'Phường Đa Kao',
        district: 'Quận 1',
        city: 'TP. Hồ Chí Minh',
        isDefault: false
    }, true);
    ok('Create second address', create2.success);
    const addressId2 = create2.data?.address?._id;

    // Get all addresses
    const list = await get('/users/addresses', true);
    ok('Get addresses list', list.success, `count=${list.data?.addresses?.length}`);

    // Get by ID
    const byId = await get(`/users/addresses/${addressId}`, true);
    ok('Get address by ID', byId.success, byId.data?.address?.fullName);

    // Update address
    const update = await put(`/users/addresses/${addressId}`, {
        fullName: 'Nguyễn Văn Test Updated',
        phone: '0909999999',
        address: '789 Đường Test Updated Khu Phố 1',
        ward: 'Phường Bến Nghé',
        district: 'Quận 1',
        city: 'TP. Hồ Chí Minh'
    });
    ok('Update address', update.success, update.data?.address?.fullName);

    // Set default
    const setDefault = await put(`/users/addresses/${addressId2}/set-default`);
    ok('Set default address', setDefault.success);

    // Create invalid address
    const invalid = await post('/users/addresses', {
        fullName: 'A', phone: '123', address: 'short'
    }, true);
    ok('Create invalid address → fail', !invalid.success, `errors=${invalid.errors?.length}`);

    // Delete address
    const del1 = await del(`/users/addresses/${addressId}`);
    ok('Delete address', del1.success);

    // Delete non-existent
    const delFake = await del('/users/addresses/507f1f77bcf86cd799439011');
    ok('Delete non-existent → fail', !delFake.success);
}

async function testProducts() {
    console.log('\n📦 PRODUCT API');

    // Get all products
    const all = await get('/products');
    ok('Get all products', all.success, `total=${all.data?.pagination?.total}`);
    categoryId = all.data?.products?.[0]?.category?._id;
    productId = all.data?.products?.[0]?._id;
    productSlug = all.data?.products?.[0]?.slug;

    // Pagination
    const page = await get('/products?page=1&limit=3');
    ok('Pagination limit=3', page.success && page.data?.products?.length <= 3, `got=${page.data?.products?.length}`);

    // Sort price asc
    const sortAsc = await get('/products?sort=price_asc');
    ok('Sort price_asc', sortAsc.success);

    // Filter featured
    const featured = await get('/products?featured=true');
    ok('Filter featured', featured.success, `count=${featured.data?.products?.length}`);

    // Filter inStock
    const inStock = await get('/products?inStock=true');
    ok('Filter inStock', inStock.success);

    // Filter price range
    const priceRange = await get('/products?minPrice=100000&maxPrice=500000');
    ok('Filter price range', priceRange.success);

    // Invalid page
    const badPage = await get('/products?page=0');
    ok('Invalid page=0 → fail', !badPage.success);

    // Invalid maxPrice < minPrice
    const badPrice = await get('/products?minPrice=500000&maxPrice=100000');
    ok('maxPrice < minPrice → fail', !badPrice.success);

    // Get by ID
    const byId = await get(`/products/${productId}`);
    ok('Get product by ID', byId.success, `viewCount=${byId.data?.product?.viewCount}`);
    ok('Related products returned', Array.isArray(byId.data?.relatedProducts));

    // Get by slug
    const bySlug = await get(`/products/slug/${productSlug}`);
    ok('Get product by slug', bySlug.success, bySlug.data?.product?.name);

    // Invalid ID
    const badId = await get('/products/invalid-id-here');
    ok('Invalid product ID → fail', !badId.success);

    // Featured products
    const feat = await get('/products/featured?limit=3');
    ok('Featured products', feat.success, `count=${feat.data?.total}`);

    // Search
    const search = await get('/products/search?q=áo thun');
    ok('Search products', search.success, `total=${search.data?.pagination?.total}`);

    // Search no keyword
    const searchEmpty = await get('/products/search');
    ok('Search no keyword → fail', !searchEmpty.success);

    // Create product (need auth)
    const create = await post('/products', {
        name: 'Áo khoác test API',
        description: 'Mô tả áo khoác test API đầy đủ thông tin cần thiết cho sản phẩm',
        brand: 'Test Brand',
        category: categoryId,
        variants: [
            { attributes: { size: 'M', color: 'Đen' }, price: 450000, stock: 20 },
            { attributes: { size: 'L', color: 'Đen' }, price: 450000, stock: 15 }
        ],
        tags: ['áo khoác', 'test'],
        featured: false,
        status: 'active'
    }, true);
    ok('Create product', create.success, `slug=${create.data?.product?.slug}`);
    ok('Auto-generate slug', !!create.data?.product?.slug);
    ok('Auto-generate variant SKU', !!create.data?.product?.variants?.[0]?.sku);
    const newProductId = create.data?.product?._id;

    // Create duplicate slug (same name)
    const createDup = await post('/products', {
        name: 'Áo khoác test API',
        description: 'Mô tả áo khoác test API đầy đủ thông tin cần thiết cho sản phẩm',
        category: categoryId,
        variants: [{ attributes: { size: 'S' }, price: 200000, stock: 5 }]
    }, true);
    ok('Duplicate name → unique slug', createDup.success && createDup.data?.product?.slug !== create.data?.product?.slug,
        `slug=${createDup.data?.product?.slug}`);
    const dupId = createDup.data?.product?._id;

    // Create missing required fields
    const createBad = await post('/products', { name: 'Test' }, true);
    ok('Create missing fields → fail', !createBad.success);

    // Update product
    if (newProductId) {
        const update = await put(`/products/${newProductId}`, {
            featured: true,
            shortDescription: 'Áo khoác test đã cập nhật'
        });
        ok('Update product', update.success, `featured=${update.data?.product?.featured}`);

        // Update name → slug changes
        const updateName = await put(`/products/${newProductId}`, {
            name: 'Áo khoác test API renamed'
        });
        ok('Update name → new slug', updateName.success && updateName.data?.product?.slug?.includes('renamed'),
            `slug=${updateName.data?.product?.slug}`);

        // Delete product
        const deleted = await del(`/products/${newProductId}`);
        ok('Delete product (soft)', deleted.success);

        // Verify deleted → 404
        const afterDel = await get(`/products/${newProductId}`);
        ok('Deleted product → 404', !afterDel.success);

        // Delete again → fail
        const delAgain = await del(`/products/${newProductId}`);
        ok('Delete already deleted → fail', !delAgain.success);
    }

    // Cleanup dup
    if (dupId) await del(`/products/${dupId}`);
}

async function testLogout() {
    console.log('\n🚪 LOGOUT');
    const loginRes = await post('/auth/login', { username: 'admin', password: 'Admin123' });
    const rt = loginRes.data?.refreshToken;
    const logout = await post('/auth/logout', { refreshToken: rt });
    ok('Logout', logout.success);
}

// ── MAIN ──────────────────────────────────────────────────────────────────────

async function runAll() {
    console.log('🚀 Running full API test suite...');
    console.log(`   Base URL: ${BASE}\n`);

    try {
        await testAuth();
        await testProfile();
        await testAddress();
        await testProducts();
        await testLogout();
    } catch (err) {
        console.error('\n💥 Unexpected error:', err.message);
    }

    console.log(`\n${'─'.repeat(45)}`);
    console.log(`✅ Passed : ${passed}`);
    console.log(`❌ Failed : ${failed}`);
    console.log(`📊 Total  : ${passed + failed}`);
    console.log(`${'─'.repeat(45)}`);
}

runAll();
