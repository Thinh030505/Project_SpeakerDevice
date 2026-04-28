export const formatCurrency = (value) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value || 0));

export const PLACEHOLDER_IMAGE = 'https://placehold.co/800x800/F1F3FA/3D3E5B?text=SoundHouse';

export const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

export const debounce = (fn, wait = 250) => {
    let timer = null;
    return (...args) => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => fn(...args), wait);
    };
};

export const showToast = (message, type = 'success') => {
    const stack = document.getElementById('toast-stack');
    if (!stack) {
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message || 'Đã có lỗi xảy ra. Vui lòng thử lại.';
    stack.appendChild(toast);

    window.setTimeout(() => {
        toast.remove();
    }, 3200);
};

export const getApiErrors = (error) => {
    const payload = error?.payload || {};
    const errors = Array.isArray(payload.errors) ? payload.errors : [];
    return {
        message: payload.message || error?.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.',
        fieldErrors: errors.reduce((map, item) => {
            const field = item?.field || item?.path || item?.param;
            const message = item?.message || item?.msg;
            if (field && message && !map[field]) {
                map[field] = message;
            }
            return map;
        }, {})
    };
};

export const clearFieldErrors = (form) => {
    if (!form) return;
    form.querySelectorAll('.field-error').forEach((item) => item.remove());
    form.querySelectorAll('.is-invalid').forEach((item) => item.classList.remove('is-invalid'));
};

export const setFieldErrors = (form, fieldErrors = {}) => {
    if (!form) return;
    clearFieldErrors(form);

    Object.entries(fieldErrors).forEach(([name, message]) => {
        const field = form.elements?.[name] || form.querySelector(`[name="${CSS.escape(name)}"]`);
        if (!field) return;

        field.classList.add('is-invalid');
        const error = document.createElement('div');
        error.className = 'field-error';
        error.textContent = message;
        field.closest('.field')?.appendChild(error);
    });
};

export const setButtonLoading = (button, isLoading, loadingText = 'Đang xử lý...') => {
    if (!button) return;

    if (isLoading) {
        button.dataset.originalText = button.dataset.originalText || button.textContent;
        button.disabled = true;
        button.classList.add('is-loading');
        button.textContent = loadingText;
        return;
    }

    button.disabled = false;
    button.classList.remove('is-loading');
    if (button.dataset.originalText) {
        button.textContent = button.dataset.originalText;
    }
};

export const flashButtonSuccess = (button, text = 'Đã thêm') => {
    if (!button) return;
    const original = button.dataset.originalText || button.textContent;
    button.dataset.originalText = original;
    button.classList.remove('is-loading');
    button.classList.add('is-success');
    button.disabled = true;
    button.textContent = `✓ ${text}`;
    window.setTimeout(() => {
        button.classList.remove('is-success');
        button.disabled = false;
        button.textContent = original;
    }, 1200);
};

export const renderRetryState = (root, message, onRetry) => {
    if (!root) return;
    root.innerHTML = `
        <div class="ui-state ui-state--error">
            <strong>Không thể tải dữ liệu</strong>
            <p>${escapeHtml(message || 'Vui lòng thử lại.')}</p>
            <button class="btn-ghost" type="button" data-retry-action>Thử lại</button>
        </div>
    `;
    root.querySelector('[data-retry-action]')?.addEventListener('click', onRetry);
};

export const renderSkeletonList = (root, count = 4, className = 'ui-skeleton-row') => {
    if (!root) return;
    root.innerHTML = Array.from({ length: count })
        .map(() => `<div class="${className} ui-skeleton"></div>`)
        .join('');
};

export const Loading = {
    show(message = 'Đang xử lý...') {
        this.hide();
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.id = 'global-loading';
        overlay.innerHTML = `
            <div class="loading-chip">
                <span class="loading-spin"></span>
                <span>${escapeHtml(message)}</span>
            </div>
        `;
        document.body.appendChild(overlay);
    },
    hide() {
        document.getElementById('global-loading')?.remove();
    }
};

export const toQueryString = (params = {}) => {
    const search = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null || value === '') {
            continue;
        }
        search.set(key, String(value));
    }

    return search.toString();
};
