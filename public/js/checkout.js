import { API, AuthStorage } from './api.js';
import {
    clearFieldErrors,
    escapeHtml,
    formatCurrency,
    getApiErrors,
    renderRetryState,
    renderSkeletonList,
    setButtonLoading,
    setFieldErrors,
    showToast
} from './utils.js';
import { initLocationDropdowns } from './vietnam-locations.js';

const state = {
    cart: null,
    order: null,
    pollTimer: null,
    savedAddresses: [],
    profile: null,
    selectedAddressId: ''
};

const checkoutRoot = document.querySelector('[data-checkout-root]');
const checkoutConfig = checkoutRoot
    ? JSON.parse(checkoutRoot.getAttribute('data-checkout-config') || '{}')
    : {};

const getCheckoutForm = () => document.querySelector('[data-checkout-form]');
const isQrCapablePayment = (paymentMethod) =>
    checkoutConfig.enabled && ['qr_personal', 'bank_transfer'].includes(paymentMethod);

const setFieldValue = (form, fieldName, value, { force = false } = {}) => {
    const field = form?.elements?.[fieldName];
    const normalizedValue = String(value || '').trim();
    if (!field || !normalizedValue) return;
    if (force || !String(field.value || '').trim()) {
        field.value = normalizedValue;
    }
};

const hasSelectOption = (select, value) =>
    Boolean(select && value && Array.from(select.options).some((option) => option.value === value));

const ensureSelectOption = (select, value) => {
    const normalizedValue = String(value || '').trim();
    if (!select || !normalizedValue) return false;

    const existed = hasSelectOption(select, normalizedValue);
    if (!existed) {
        const option = document.createElement('option');
        option.value = normalizedValue;
        option.textContent = normalizedValue;
        select.appendChild(option);
    }

    select.disabled = false;
    return existed;
};

const setLocationDropdownValues = (form, address, { force = false } = {}) => {
    const citySelect = form?.elements?.city;
    const districtSelect = form?.elements?.district;
    const wardSelect = form?.elements?.ward;

    if (!citySelect || citySelect.tagName !== 'SELECT') {
        setFieldValue(form, 'city', address.city, { force });
        setFieldValue(form, 'district', address.district, { force });
        setFieldValue(form, 'ward', address.ward, { force });
        return;
    }

    if (address.city && (force || !citySelect.value)) {
        ensureSelectOption(citySelect, address.city);
        citySelect.value = address.city;
        citySelect.dispatchEvent(new Event('change'));
    }

    if (address.district && districtSelect && (force || !districtSelect.value)) {
        const existed = ensureSelectOption(districtSelect, address.district);
        districtSelect.value = address.district;
        if (existed) districtSelect.dispatchEvent(new Event('change'));
    }

    if (address.ward && wardSelect && (force || !wardSelect.value)) {
        ensureSelectOption(wardSelect, address.ward);
        wardSelect.value = address.ward;
    }
};

const buildAddressLabel = (address) => [
    address.fullName,
    address.phone,
    address.address,
    address.ward,
    address.district,
    address.city
].filter(Boolean).join(' - ');

const getAddressId = (address) => String(address?._id || address?.id || '');
const getDefaultAddress = (addresses = []) =>
    addresses.find((address) => address.isDefault) || addresses[0] || null;

const updateSavedAddressStatus = (message) => {
    document.querySelector('[data-saved-address-status]')?.replaceChildren(document.createTextNode(message));
};

const applyAddressToCheckout = (address, { force = false } = {}) => {
    const form = getCheckoutForm();
    if (!form || !address) return;

    state.selectedAddressId = getAddressId(address);
    setFieldValue(form, 'fullName', address.fullName, { force });
    setFieldValue(form, 'phone', address.phone, { force });
    setFieldValue(form, 'email', state.profile?.email, { force: false });
    setFieldValue(form, 'addressLine', address.address || address.addressLine, { force });
    setLocationDropdownValues(form, address, { force });
    setFieldValue(form, 'note', address.note, { force: false });

    const select = document.querySelector('[data-saved-address-select]');
    if (select && state.selectedAddressId) {
        select.value = state.selectedAddressId;
    }

    updateSavedAddressStatus(address.isDefault
        ? 'Đã tự động điền địa chỉ mặc định.'
        : 'Đã tự động điền địa chỉ đã lưu.');
};

const renderSavedAddressPicker = (addresses = []) => {
    const panel = document.querySelector('[data-saved-address-panel]');
    const select = document.querySelector('[data-saved-address-select]');
    if (!panel || !select) return;

    if (!addresses.length) {
        panel.hidden = true;
        return;
    }

    panel.hidden = false;
    select.replaceChildren();
    addresses.forEach((address) => {
        const option = document.createElement('option');
        option.value = getAddressId(address);
        option.textContent = `${address.isDefault ? 'Mặc định - ' : ''}${buildAddressLabel(address)}`;
        select.appendChild(option);
    });
};

const loadDefaultCheckoutAddress = async () => {
    if (!AuthStorage.getAccessToken()) return;

    const panel = document.querySelector('[data-saved-address-panel]');
    if (panel) panel.hidden = false;
    updateSavedAddressStatus('Đang kiểm tra địa chỉ mặc định...');

    try {
        const [addressResponse, profileResponse] = await Promise.allSettled([
            API.users.addresses.list(),
            API.users.profile()
        ]);

        if (profileResponse.status === 'fulfilled') {
            state.profile = profileResponse.value.data?.user || null;
        }

        if (addressResponse.status !== 'fulfilled') {
            updateSavedAddressStatus('Không thể tải sổ địa chỉ. Bạn vẫn có thể nhập thủ công.');
            return;
        }

        state.savedAddresses = addressResponse.value.data?.addresses || [];
        renderSavedAddressPicker(state.savedAddresses);

        const defaultAddress = getDefaultAddress(state.savedAddresses);
        if (!defaultAddress) {
            if (panel) panel.hidden = true;
            return;
        }

        applyAddressToCheckout(defaultAddress, { force: false });
    } catch {
        updateSavedAddressStatus('Không thể tải địa chỉ mặc định. Bạn vẫn có thể nhập thủ công.');
    }
};

const clearPaymentPolling = () => {
    if (state.pollTimer) {
        window.clearInterval(state.pollTimer);
        state.pollTimer = null;
    }
};

const toggleBankTransferNote = () => {
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;
    const note = document.querySelector('[data-bank-transfer-note]');
    if (note) {
        note.hidden = !['bank_transfer', 'qr_personal'].includes(paymentMethod);
    }
};

const updatePaymentBanner = (order) => {
    const banner = document.querySelector('[data-payment-status-banner]');
    if (!banner || !order || !isQrCapablePayment(order.paymentMethod)) {
        if (banner) banner.hidden = true;
        return;
    }

    banner.hidden = false;
    banner.classList.toggle('is-paid', order.paymentStatus === 'paid');
    banner.textContent = order.paymentStatus === 'paid'
        ? `Đơn hàng ${order.orderNumber} đã được xác nhận thanh toán. Cửa hàng sẽ xử lý ngay cho bạn.`
        : `Đơn hàng ${order.orderNumber} đang chờ xác nhận thanh toán. Thông báo sẽ tự động cập nhật tại đây.`;
};

const renderQrPanel = (order) => {
    const panel = document.querySelector('[data-qr-payment-panel]');
    const image = document.querySelector('[data-qr-image]');
    if (!panel || !image) return;

    if (!order || !isQrCapablePayment(order.paymentMethod)) {
        panel.hidden = true;
        image.hidden = true;
        return;
    }

    const amount = Number(order.totalAmount || 0);
    const transferNote = order.orderNumber;

    document.querySelector('[data-qr-order-number]')?.replaceChildren(document.createTextNode(order.orderNumber));
    document.querySelector('[data-qr-amount]')?.replaceChildren(document.createTextNode(formatCurrency(amount)));
    document.querySelector('[data-qr-bank-name]')?.replaceChildren(document.createTextNode(checkoutConfig.bankName || checkoutConfig.bankCode || '-'));
    document.querySelector('[data-qr-account-number]')?.replaceChildren(document.createTextNode(checkoutConfig.accountNumber || '-'));
    document.querySelector('[data-qr-account-name]')?.replaceChildren(document.createTextNode(checkoutConfig.accountName || '-'));
    document.querySelector('[data-qr-transfer-note]')?.replaceChildren(document.createTextNode(transferNote));

    panel.hidden = false;

    if (!checkoutConfig.bankCode || !checkoutConfig.accountNumber || !checkoutConfig.accountName) {
        image.hidden = true;
        showToast('Thiếu cấu hình QR thanh toán trong file .env.', 'error');
        return;
    }

    const qrUrl = checkoutConfig.qrImageUrl
        ? checkoutConfig.qrImageUrl
        : `https://img.vietqr.io/image/${encodeURIComponent(checkoutConfig.bankCode)}-${encodeURIComponent(checkoutConfig.accountNumber)}-${encodeURIComponent(checkoutConfig.qrTemplate || 'compact2')}.png?amount=${encodeURIComponent(String(amount))}&addInfo=${encodeURIComponent(transferNote)}&accountName=${encodeURIComponent(checkoutConfig.accountName || '')}`;

    image.onerror = () => {
        image.hidden = true;
        showToast('Không tải được ảnh QR từ VietQR. Vui lòng thử tải lại trang.', 'error');
    };
    image.onload = () => {
        image.hidden = false;
    };
    image.src = qrUrl;
    updatePaymentBanner(order);
};

const startPaymentPolling = (order) => {
    clearPaymentPolling();
    if (!order || !isQrCapablePayment(order.paymentMethod) || order.paymentStatus === 'paid') return;

    state.pollTimer = window.setInterval(async () => {
        try {
            const response = await API.orders.detail(order.id);
            const nextOrder = response.data?.order;
            if (!nextOrder) return;

            const previousStatus = state.order?.paymentStatus;
            state.order = nextOrder;
            updatePaymentBanner(nextOrder);

            if (nextOrder.paymentStatus === 'paid') {
                clearPaymentPolling();
                if (previousStatus !== 'paid') {
                    showToast(`Đơn hàng ${nextOrder.orderNumber} đã được xác nhận thanh toán.`);
                }
            }
        } catch {
            // Polling tự hồi phục ở lần gọi tiếp theo.
        }
    }, 5000);
};

const renderCartSummary = (cart) => {
    const safeCart = cart || { items: [] };
    const items = Array.isArray(safeCart.items) ? safeCart.items : [];
    state.cart = { ...safeCart, items };

    document.querySelector('[data-checkout-items]')?.replaceChildren(document.createTextNode(String(safeCart.itemCount || items.length)));
    document.querySelector('[data-checkout-subtotal]')?.replaceChildren(document.createTextNode(safeCart.subtotalText || '0đ'));
    document.querySelector('[data-checkout-discount]')?.replaceChildren(document.createTextNode(safeCart.discountAmountText || '0đ'));
    document.querySelector('[data-checkout-shipping]')?.replaceChildren(document.createTextNode(safeCart.shippingFeeText || '0đ'));
    document.querySelector('[data-checkout-total]')?.replaceChildren(document.createTextNode(safeCart.totalText || '0đ'));

    const list = document.querySelector('[data-checkout-list]');
    if (list) {
        list.innerHTML = items.length
            ? items.map((item) => `
                <li>
                    <span>${escapeHtml(item.name || 'Sản phẩm')} x ${Number(item.quantity || 1)}</span>
                    <strong>${escapeHtml(item.lineTotalText || item.priceText || 'Liên hệ')}</strong>
                </li>
            `).join('')
            : '<li><span>Chưa có sản phẩm nào.</span><strong>0đ</strong></li>';
    }
};

const loadCart = async ({ skeleton = false } = {}) => {
    const list = document.querySelector('[data-checkout-list]');
    if (skeleton) {
        renderSkeletonList(list, 3, 'ui-skeleton-row');
    }
    const response = await API.cart.get();
    renderCartSummary(response.data?.cart || { items: [] });
};

const validateCheckoutPayload = (payload) => {
    const errors = {};
    if (!payload.fullName || payload.fullName.length < 2) {
        errors.fullName = 'Vui lòng nhập họ tên hợp lệ.';
    }
    if (!/^(0|\+84)\d{9,10}$/.test(payload.phone || '')) {
        errors.phone = 'Số điện thoại không hợp lệ.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email || '')) {
        errors.email = 'Email không hợp lệ.';
    }
    if (!payload.addressLine || payload.addressLine.length < 5) {
        errors.addressLine = 'Vui lòng nhập địa chỉ nhận hàng.';
    }
    if (!payload.city) {
        errors.city = 'Vui lòng chọn Tỉnh / Thành phố.';
    }
    if (!payload.paymentMethod) {
        errors.paymentMethod = 'Vui lòng chọn phương thức thanh toán.';
    }
    return errors;
};

document.querySelector('[data-checkout-promo-form]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    const code = String(form.querySelector('input[name="code"]')?.value || '').trim();
    if (!code) {
        showToast('Vui lòng nhập mã giảm giá.', 'error');
        return;
    }

    setButtonLoading(button, true, 'Đang áp dụng...');
    try {
        const response = await API.cart.promo(code);
        renderCartSummary(response.data?.cart || { items: [] });
        showToast(response.message || 'Đã áp dụng mã giảm giá.');
    } catch (error) {
        showToast(getApiErrors(error).message, 'error');
    } finally {
        setButtonLoading(button, false);
    }
});

document.querySelector('[data-saved-address-select]')?.addEventListener('change', (event) => {
    const selectedAddress = state.savedAddresses.find((address) => getAddressId(address) === event.currentTarget.value);
    if (selectedAddress) {
        applyAddressToCheckout(selectedAddress, { force: true });
    }
});

document.querySelector('[data-checkout-form]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!state.cart?.items?.length) {
        showToast('Giỏ hàng đang trống.', 'error');
        return;
    }

    const form = event.currentTarget;
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton?.disabled) return;

    clearFieldErrors(form);
    const formData = new FormData(form);
    const payload = Object.fromEntries([...formData.entries()].map(([key, value]) => [key, String(value || '').trim()]));
    const validationErrors = validateCheckoutPayload(payload);
    if (Object.keys(validationErrors).length) {
        setFieldErrors(form, validationErrors);
        showToast('Vui lòng kiểm tra lại thông tin giao hàng.', 'error');
        return;
    }

    setButtonLoading(submitButton, true, 'Đang tạo đơn...');
    try {
        const response = await API.orders.create(payload);
        const order = response.data?.order;
        if (!order) {
            throw new Error('Không nhận được thông tin đơn hàng từ máy chủ.');
        }
        state.order = order;

        const result = document.querySelector('[data-order-result]');
        if (result) {
            result.hidden = false;
            result.textContent = isQrCapablePayment(order.paymentMethod)
                ? `Đơn hàng ${order.orderNumber} đã được tạo. Vui lòng quét QR và giữ nguyên trang để nhận thông báo xác nhận.`
                : `Đơn hàng ${order.orderNumber} đã được tạo thành công.`;
        }

        renderCartSummary(response.data?.cart || { items: [] });
        renderQrPanel(order);
        startPaymentPolling(order);
        toggleBankTransferNote();

        showToast(isQrCapablePayment(order.paymentMethod)
            ? 'Đã tạo đơn hàng và hiển thị QR thanh toán.'
            : 'Đặt hàng thành công.');
    } catch (error) {
        const apiError = getApiErrors(error);
        setFieldErrors(form, apiError.fieldErrors);
        showToast(apiError.message, 'error');
    } finally {
        setButtonLoading(submitButton, false);
    }
});

document.querySelectorAll('input[name="paymentMethod"]').forEach((input) => {
    input.addEventListener('change', toggleBankTransferNote);
});

toggleBankTransferNote();
initLocationDropdowns()
    .catch(() => {})
    .finally(() => {
        loadDefaultCheckoutAddress();
    });

loadCart({ skeleton: true }).catch((error) => {
    const list = document.querySelector('[data-checkout-list]');
    renderRetryState(list, getApiErrors(error).message || 'Không thể tải thông tin thanh toán.', () => {
        loadCart({ skeleton: true }).catch((retryError) => {
            showToast(getApiErrors(retryError).message, 'error');
        });
    });
});

window.addEventListener('beforeunload', clearPaymentPolling);
