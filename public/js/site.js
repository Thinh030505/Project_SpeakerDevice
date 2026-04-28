import { API, AuthStorage } from './api.js';
import { Loading, PLACEHOLDER_IMAGE, debounce, showToast } from './utils.js';

const updateCartCount = async () => {
    const targets = document.querySelectorAll('[data-cart-count]');
    if (!targets.length) {
        return;
    }

    try {
        const response = await API.cart.get();
        const count = response.data?.cart?.itemCount || 0;
        targets.forEach((target) => {
            target.textContent = count;
        });
    } catch {
        targets.forEach((target) => {
            target.textContent = '0';
        });
    }
};

const initSearch = () => {
    const form = document.querySelector('[data-site-search]');
    if (!form) {
        return;
    }

    const input = form.querySelector('input[name="search"]');
    if (!input) {
        return;
    }

    input.addEventListener('input', debounce(() => {
        input.setAttribute('aria-label', `Tìm kiếm: ${input.value || 'trống'}`);
    }, 150));
};

const initStickyHeader = () => {
    const header = document.querySelector('[data-site-header]');
    if (!header) {
        return;
    }

    const syncHeaderState = () => {
        header.classList.toggle('is-scrolled', window.scrollY > 12);
    };

    syncHeaderState();
    window.addEventListener('scroll', syncHeaderState, { passive: true });
};

const initImageStability = () => {
    document.querySelectorAll('img').forEach((image) => {
        image.decoding = image.decoding || 'async';
        if (!image.hasAttribute('loading') && !image.closest('.home-hero')) {
            image.loading = 'lazy';
        }
        image.addEventListener('error', () => {
            if (image.dataset.fallbackApplied === 'true') return;
            image.dataset.fallbackApplied = 'true';
            image.src = PLACEHOLDER_IMAGE;
        });
    });
};

const initAuthLink = () => {
    const authLink = document.querySelector('[data-auth-link]');
    if (!authLink) {
        return;
    }

    if (!AuthStorage.getAccessToken()) {
        return;
    }

    const actions = authLink.parentElement;
    if (actions && !actions.querySelector('[data-account-link]')) {
        const accountLink = document.createElement('a');
        accountLink.className = 'site-header__iconlink';
        accountLink.href = '/account';
        accountLink.dataset.accountLink = 'true';
        accountLink.textContent = 'Tài khoản';
        actions.insertBefore(accountLink, authLink);
    }

    authLink.textContent = 'Đăng xuất';
    authLink.href = '/logout';
    authLink.dataset.authState = 'logged-in';
    authLink.addEventListener('click', async (event) => {
        event.preventDefault();
        Loading.show('Đang đăng xuất...');
        try {
            await AuthStorage.logout();
            showToast('Đã đăng xuất thành công.');
            window.location.href = '/login';
        } finally {
            Loading.hide();
        }
    });
};

window.addEventListener('unhandledrejection', (event) => {
    showToast(event.reason?.message || 'Đã có lỗi bất ngờ xảy ra.', 'error');
});

window.addEventListener('api:server-error', () => {
    showToast('Máy chủ đang gặp lỗi. Vui lòng thử lại sau.', 'error');
});

initSearch();
initStickyHeader();
initImageStability();
initAuthLink();
updateCartCount();

window.SoundHouse = {
    updateCartCount
};
