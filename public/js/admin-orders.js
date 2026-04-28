import { API, AuthStorage } from './api.js';
import { Loading, debounce, showToast } from './utils.js';

const list = document.querySelector('[data-admin-order-list]');
const empty = document.querySelector('[data-admin-order-empty]');
const searchInput = document.querySelector('[data-admin-order-search]');
const statusSelect = document.querySelector('[data-admin-order-status]');
const paymentSelect = document.querySelector('[data-admin-payment-status]');

const renderOrders = (orders) => {
    if (!list || !empty) {
        return;
    }

    list.innerHTML = '';
    empty.hidden = orders.length > 0;

    orders.forEach((order) => {
        const article = document.createElement('article');
        article.className = 'admin-order';
        article.innerHTML = `
            <div class="admin-order__head">
                <strong>${order.orderNumber}</strong>
                <strong>${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.totalAmount)}</strong>
            </div>
            <div class="admin-order__meta">
                <span>${order.shippingAddress.fullName}</span>
                <span>${order.shippingAddress.phone}</span>
                <span>${order.shippingAddress.email}</span>
                <span>${new Date(order.createdAt).toLocaleString('vi-VN')}</span>
            </div>
            <div class="admin-order__controls">
                <select data-order-status="${order.id}">
                    <option value="pending" ${order.orderStatus === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="processing" ${order.orderStatus === 'processing' ? 'selected' : ''}>Processing</option>
                    <option value="completed" ${order.orderStatus === 'completed' ? 'selected' : ''}>Completed</option>
                    <option value="cancelled" ${order.orderStatus === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
                <select data-payment-status="${order.id}">
                    <option value="pending" ${order.paymentStatus === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="paid" ${order.paymentStatus === 'paid' ? 'selected' : ''}>Paid</option>
                    <option value="failed" ${order.paymentStatus === 'failed' ? 'selected' : ''}>Failed</option>
                </select>
            </div>
            <div class="admin-order__footer">
                <span>${order.items.map((item) => `${item.name} x ${item.quantity}`).join(', ')}</span>
            </div>
        `;
        list.appendChild(article);
    });
};

const buildQuery = () => {
    const params = new URLSearchParams();
    if (searchInput?.value.trim()) {
        params.set('search', searchInput.value.trim());
    }
    if (statusSelect?.value) {
        params.set('status', statusSelect.value);
    }
    if (paymentSelect?.value) {
        params.set('paymentStatus', paymentSelect.value);
    }
    return params.toString();
};

const loadOrders = async () => {
    if (!AuthStorage.getAccessToken()) {
        showToast('Can dang nhap bang tai khoan admin.', 'error');
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
        return;
    }

    const profile = await API.users.profile();
    if (profile.data?.user?.role !== 'admin') {
        showToast('Khu vuc quan tri chi danh cho tai khoan admin.', 'error');
        window.location.href = '/account/orders';
        return;
    }

    const response = await API.orders.adminList(buildQuery());
    renderOrders(response.data.orders || []);
};

document.addEventListener('change', async (event) => {
    const orderStatus = event.target.closest('[data-order-status]');
    if (orderStatus) {
        Loading.show('Dang cap nhat trang thai don...');
        try {
            await API.orders.updateStatus(orderStatus.dataset.orderStatus, orderStatus.value);
            showToast('Da cap nhat trang thai don hang.');
        } catch (error) {
            showToast(error.message, 'error');
            await loadOrders();
        } finally {
            Loading.hide();
        }
        return;
    }

    const paymentStatus = event.target.closest('[data-payment-status]');
    if (paymentStatus) {
        Loading.show('Dang cap nhat thanh toan...');
        try {
            await API.orders.updatePayment(paymentStatus.dataset.paymentStatus, paymentStatus.value);
            showToast('Da cap nhat trang thai thanh toan.');
        } catch (error) {
            showToast(error.message, 'error');
            await loadOrders();
        } finally {
            Loading.hide();
        }
        return;
    }
});

searchInput?.addEventListener('input', debounce(() => {
    loadOrders().catch((error) => showToast(error.message, 'error'));
}, 300));
statusSelect?.addEventListener('change', () => loadOrders().catch((error) => showToast(error.message, 'error')));
paymentSelect?.addEventListener('change', () => loadOrders().catch((error) => showToast(error.message, 'error')));
document.querySelector('[data-admin-order-refresh]')?.addEventListener('click', () => {
    loadOrders().catch((error) => showToast(error.message, 'error'));
});

window.setInterval(() => {
    if (document.visibilityState === 'visible') {
        loadOrders().catch(() => {});
    }
}, 15000);

loadOrders().catch((error) => {
    showToast(error.message || 'Khong the tai danh sach don hang.', 'error');
});
