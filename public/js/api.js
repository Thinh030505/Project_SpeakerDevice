const CART_SESSION_KEY = 'soundhouse_cart_session';
const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

const cleanToken = (value) => String(value || '').replace(/[\r\n\t]/g, '').trim();

const ensureCartSession = () => {
    let sessionId = window.localStorage.getItem(CART_SESSION_KEY);
    if (!sessionId) {
        sessionId = `cart_${crypto.randomUUID()}`;
        window.localStorage.setItem(CART_SESSION_KEY, sessionId);
    }
    return sessionId;
};

const getAuthHeaders = () => {
    const headers = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Cart-Session': ensureCartSession()
    };
    const accessToken = cleanToken(window.localStorage.getItem(ACCESS_TOKEN_KEY));
    if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
    }
    return headers;
};

let refreshPromise = null;

const parseJsonResponse = async (response) => response.json().catch(() => ({}));

const emitApiEvent = (name, detail = {}) => {
    window.dispatchEvent(new CustomEvent(name, { detail }));
};

const getErrorMessage = (payload = {}) => {
    if (Array.isArray(payload.errors) && payload.errors.length) {
        return payload.errors[0]?.message || payload.errors[0]?.msg || payload.message;
    }
    return payload.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.';
};

export const API = {
    getCartSession() {
        return ensureCartSession();
    },
    setCartSession(sessionId) {
        if (sessionId) {
            window.localStorage.setItem(CART_SESSION_KEY, sessionId);
        }
    },
    async request(path, options = {}, retryOnAuthError = true) {
        const headers = {
            ...getAuthHeaders(),
            ...(options.headers || {})
        };

        if (options.body instanceof FormData) {
            delete headers['Content-Type'];
        }

        const response = await fetch(`/api${path}`, {
            ...options,
            headers
        });

        const data = await parseJsonResponse(response);
        if (data?.data?.sessionId) {
            this.setCartSession(data.data.sessionId);
        }

        if (response.status === 401 && retryOnAuthError && AuthStorage.getRefreshToken()) {
            const refreshed = await AuthStorage.refreshAccessToken();
            if (refreshed) {
                return this.request(path, options, false);
            }
        }

        if (!response.ok) {
            const error = new Error(getErrorMessage(data));
            error.response = response;
            error.payload = data;
            if (response.status === 401) {
                emitApiEvent('api:unauthorized', { path, data });
            }
            if (response.status === 403) {
                emitApiEvent('api:forbidden', { path, data });
            }
            if (response.status === 429) {
                emitApiEvent('api:rate-limited', { path, data });
            }
            if (response.status >= 500) {
                emitApiEvent('api:server-error', { path, data });
            }
            throw error;
        }

        return data;
    },
    cart: {
        get: () => API.request('/cart', { method: 'GET' }),
        add: (payload) => API.request('/cart', { method: 'POST', body: JSON.stringify(payload) }),
        update: (itemId, payload) => API.request(`/cart/${itemId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
        remove: (itemId) => API.request(`/cart/${itemId}`, { method: 'DELETE' }),
        clear: () => API.request('/cart', { method: 'DELETE' }),
        promo: (code) => API.request('/cart/promo', { method: 'POST', body: JSON.stringify({ code }) })
    },
    orders: {
        create: (payload) => API.request('/orders', { method: 'POST', body: JSON.stringify(payload) }),
        list: () => API.request('/orders', { method: 'GET' }),
        detail: (id) => API.request(`/orders/${id}`, { method: 'GET' }),
        cancel: (id) => API.request(`/orders/${id}/cancel`, { method: 'POST' }),
        adminList: (query = '') => API.request(`/orders/admin/all${query ? `?${query}` : ''}`, { method: 'GET' }),
        updateStatus: (id, orderStatus) => API.request(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ orderStatus }) }),
        updatePayment: (id, paymentStatus) => API.request(`/orders/${id}/payment`, { method: 'PATCH', body: JSON.stringify({ paymentStatus }) })
    },
    auth: {
        logout: (refreshToken) => API.request('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }, false),
        refreshToken: (refreshToken) => API.request('/auth/refresh-token', { method: 'POST', body: JSON.stringify({ refreshToken }) }, false)
    },
    users: {
        profile: () => API.request('/users/profile', { method: 'GET' }),
        updateProfile: (payload) => API.request('/users/profile', { method: 'PUT', body: JSON.stringify(payload) }),
        addresses: {
            list: () => API.request('/users/addresses', { method: 'GET' }),
            create: (payload) => API.request('/users/addresses', { method: 'POST', body: JSON.stringify(payload) }),
            update: (id, payload) => API.request(`/users/addresses/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
            remove: (id) => API.request(`/users/addresses/${id}`, { method: 'DELETE' }),
            setDefault: (id) => API.request(`/users/addresses/${id}/set-default`, { method: 'PUT' })
        }
    },
    engagement: {
        contact: (payload) => API.request('/engagement/contact', { method: 'POST', body: JSON.stringify(payload) }, false),
        newsletter: (payload) => API.request('/engagement/newsletter', { method: 'POST', body: JSON.stringify(payload) }, false)
    },
    reviews: {
        list: (slug) => API.request(`/reviews/product/${encodeURIComponent(slug)}`, { method: 'GET' }, false),
        create: (slug, payload) => API.request(`/reviews/product/${encodeURIComponent(slug)}`, { method: 'POST', body: JSON.stringify(payload) })
    },
    products: {
        list: (query = '') => API.request(`/products${query ? `?${query}` : ''}`, { method: 'GET' }),
        uploadImage(file) {
            const formData = new FormData();
            formData.append('image', file);
            return API.request('/products/upload-image', {
                method: 'POST',
                body: formData,
                headers: {
                    Accept: 'application/json'
                }
            });
        },
        create: (payload) => API.request('/products', { method: 'POST', body: JSON.stringify(payload) }),
        update: (id, payload) => API.request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
        remove: (id) => API.request(`/products/${id}`, { method: 'DELETE' })
    },
    categories: {
        list: (query = '') => API.request(`/categories${query ? `?${query}` : ''}`, { method: 'GET' }),
        create: (payload) => API.request('/categories', { method: 'POST', body: JSON.stringify(payload) }),
        update: (id, payload) => API.request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
        remove: (id) => API.request(`/categories/${id}`, { method: 'DELETE' })
    },
    brands: {
        list: (query = '') => API.request(`/brands${query ? `?${query}` : ''}`, { method: 'GET' }),
        create: (payload) => API.request('/brands', { method: 'POST', body: JSON.stringify(payload) }),
        update: (id, payload) => API.request(`/brands/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
        remove: (id) => API.request(`/brands/${id}`, { method: 'DELETE' })
    },
    admin: {
        dashboard: () => API.request('/admin/dashboard', { method: 'GET' }),
        uploadImage(file, folder = 'admin-images') {
            const formData = new FormData();
            formData.append('image', file);
            formData.append('folder', folder);
            return API.request('/admin/upload-image', {
                method: 'POST',
                body: formData,
                headers: {
                    Accept: 'application/json'
                }
            });
        },
        banners: {
            list: (query = '') => API.request(`/admin/banners${query ? `?${query}` : ''}`, { method: 'GET' }),
            create: (payload) => API.request('/admin/banners', { method: 'POST', body: JSON.stringify(payload) }),
            update: (id, payload) => API.request(`/admin/banners/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
            remove: (id) => API.request(`/admin/banners/${id}`, { method: 'DELETE' })
        },
        reviews: {
            list: (query = '') => API.request(`/admin/reviews${query ? `?${query}` : ''}`, { method: 'GET' }),
            update: (id, payload) => API.request(`/admin/reviews/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
            remove: (id) => API.request(`/admin/reviews/${id}`, { method: 'DELETE' })
        },
        users: {
            list: (query = '') => API.request(`/users/admin/users${query ? `?${query}` : ''}`, { method: 'GET' }),
            update: (id, payload) => API.request(`/users/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
            remove: (id) => API.request(`/users/admin/users/${id}`, { method: 'DELETE' })
        },
        engagement: {
            contacts: {
                list: (query = '') => API.request(`/admin/engagement/contacts${query ? `?${query}` : ''}`, { method: 'GET' }),
                update: (id, payload) => API.request(`/admin/engagement/contacts/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
            },
            newsletter: {
                list: (query = '') => API.request(`/admin/engagement/newsletter${query ? `?${query}` : ''}`, { method: 'GET' }),
                update: (id, payload) => API.request(`/admin/engagement/newsletter/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
            }
        }
    }
};

export const AuthStorage = {
    getAccessToken: () => cleanToken(window.localStorage.getItem(ACCESS_TOKEN_KEY)),
    getRefreshToken: () => cleanToken(window.localStorage.getItem(REFRESH_TOKEN_KEY)),
    setAccessToken(value) {
        const token = cleanToken(value);
        if (token) {
            window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
        }
    },
    setRefreshToken(value) {
        const token = cleanToken(value);
        if (token) {
            window.localStorage.setItem(REFRESH_TOKEN_KEY, token);
        }
    },
    async refreshAccessToken() {
        const refreshToken = this.getRefreshToken();
        if (!refreshToken) {
            return false;
        }

        if (!refreshPromise) {
            refreshPromise = API.auth.refreshToken(refreshToken)
                .then((response) => {
                    const nextAccessToken = response.data?.accessToken;
                    if (!nextAccessToken) {
                        throw new Error('Khong the lam moi phien dang nhap.');
                    }
                    this.setAccessToken(nextAccessToken);
                    return true;
                })
                .catch(() => {
                    this.clear();
                    emitApiEvent('api:unauthorized', { path: '/auth/refresh-token' });
                    return false;
                })
                .finally(() => {
                    refreshPromise = null;
                });
        }

        return refreshPromise;
    },
    async logout() {
        const refreshToken = this.getRefreshToken();
        if (refreshToken) {
            try {
                await API.auth.logout(refreshToken);
            } catch {
                // Ignore logout API errors and clear local state anyway.
            }
        }
        this.clear();
    },
    clear() {
        window.localStorage.removeItem(ACCESS_TOKEN_KEY);
        window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
};
