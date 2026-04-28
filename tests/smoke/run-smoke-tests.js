import assert from 'node:assert/strict';
import http from 'node:http';

process.env.NODE_ENV = 'test';
process.env.SKIP_EXTERNAL_SERVICES = 'true';
process.env.SKIP_EMAIL_VERIFY = 'true';

const { default: app } = await import('../../src/app.js');

const createServer = () => {
    const server = http.createServer(app);

    return new Promise((resolve) => {
        server.listen(0, '127.0.0.1', () => {
            const address = server.address();
            resolve({
                server,
                baseUrl: `http://127.0.0.1:${address.port}`
            });
        });
    });
};

const runCheck = async (name, fn) => {
    try {
        await fn();
        console.log(`PASS ${name}`);
    } catch (error) {
        console.error(`FAIL ${name}`);
        throw error;
    }
};

const withServer = async (fn) => {
    const { server, baseUrl } = await createServer();

    try {
        await fn(baseUrl);
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }
};

await runCheck('health endpoint responds successfully in smoke mode', async () => {
    await withServer(async (baseUrl) => {
        const response = await fetch(`${baseUrl}/health`);
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.equal(body.success, true);
        assert.equal(body.data.database.skipped, true);
    });
});

await runCheck('api health endpoint responds successfully', async () => {
    await withServer(async (baseUrl) => {
        const response = await fetch(`${baseUrl}/api/health`);
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.equal(body.success, true);
    });
});

await runCheck('web pages render html successfully', async () => {
    await withServer(async (baseUrl) => {
        for (const path of ['/', '/login', '/forgot-password', '/reset-password', '/cart', '/category/test-slug', '/products/demo']) {
            const response = await fetch(`${baseUrl}${path}`);
            const html = await response.text();

            assert.equal(response.status, 200, `Expected 200 for ${path}`);
            assert.match(html, /<html/i);
        }
    });
});

await runCheck('auth forgot/reset validation returns json errors consistently', async () => {
    await withServer(async (baseUrl) => {
        const forgotResponse = await fetch(`${baseUrl}/api/auth/forgot-password`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: 'invalid-email' })
        });
        const forgotBody = await forgotResponse.json();

        assert.equal(forgotResponse.status, 400);
        assert.equal(forgotBody.success, false);
        assert.equal(forgotBody.message, 'Dữ liệu không hợp lệ.');

        const resetResponse = await fetch(`${baseUrl}/api/auth/reset-password/test-token`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                password: 'Password1',
                passwordConfirm: 'Password2'
            })
        });
        const resetBody = await resetResponse.json();

        assert.equal(resetResponse.status, 400);
        assert.equal(resetBody.success, false);
        assert.equal(resetBody.message, 'Dữ liệu không hợp lệ.');
    });
});

await runCheck('engagement endpoints accept contact and newsletter submissions', async () => {
    await withServer(async (baseUrl) => {
        const contactResponse = await fetch(`${baseUrl}/api/engagement/contact`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: 'Nguyen Van A',
                email: 'nguyenvana@example.com',
                subject: 'Can tu van loa',
                message: 'Toi can tu van cho phong khach.'
            })
        });
        const contactBody = await contactResponse.json();

        assert.equal(contactResponse.status, 201);
        assert.equal(contactBody.success, true);

        const newsletterResponse = await fetch(`${baseUrl}/api/engagement/newsletter`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'newsletter@example.com'
            })
        });
        const newsletterBody = await newsletterResponse.json();

        assert.equal(newsletterResponse.status, 200);
        assert.equal(newsletterBody.success, true);
    });
});

await runCheck('web 404 renders html while api 404 returns json', async () => {
    await withServer(async (baseUrl) => {
        const webResponse = await fetch(`${baseUrl}/missing-page`, {
            headers: { Accept: 'text/html' }
        });
        const webHtml = await webResponse.text();

        assert.equal(webResponse.status, 404);
        assert.match(webHtml, /SoundHouse Error/i);

        const apiResponse = await fetch(`${baseUrl}/api/missing-route`, {
            headers: { Accept: 'application/json' }
        });
        const apiBody = await apiResponse.json();

        assert.equal(apiResponse.status, 404);
        assert.equal(apiBody.success, false);
        assert.equal(apiBody.message, 'Route not found');
    });
});
