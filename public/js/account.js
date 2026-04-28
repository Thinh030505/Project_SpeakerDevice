import { API, AuthStorage } from './api.js';
import { Loading, showToast } from './utils.js';
import { initLocationDropdowns } from './vietnam-locations.js';

const requireAuth = () => {
    if (AuthStorage.getAccessToken()) {
        return true;
    }

    showToast('Vui long dang nhap de su dung khu vuc tai khoan.', 'error');
    window.setTimeout(() => {
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
    }, 600);
    return false;
};

const fillProfileForm = (user) => {
    const form = document.querySelector('[data-account-profile-form]');
    if (!form || !user) {
        return;
    }

    form.elements.firstName.value = user.profile?.firstName || '';
    form.elements.lastName.value = user.profile?.lastName || '';
    form.elements.email.value = user.email || '';
    form.elements.phone.value = user.profile?.phone || '';
    form.elements.dateOfBirth.value = user.profile?.dateOfBirth ? String(user.profile.dateOfBirth).slice(0, 10) : '';
    form.elements.street.value = user.profile?.address?.street || '';
    form.elements.city.value = user.profile?.address?.city || '';
    form.elements.state.value = user.profile?.address?.state || '';
    form.elements.zipCode.value = user.profile?.address?.zipCode || '';
    form.elements.country.value = user.profile?.address?.country || '';
};

const renderAddresses = (addresses) => {
    const list = document.querySelector('[data-account-address-list]');
    const empty = document.querySelector('[data-account-address-empty]');
    if (!list || !empty) {
        return;
    }

    list.innerHTML = '';
    empty.hidden = addresses.length > 0;

    addresses.forEach((address) => {
        const article = document.createElement('article');
        article.className = 'address-card';
        article.innerHTML = `
            <div class="address-card__head">
                <strong>${address.fullName}</strong>
                <span>${address.isDefault ? 'Mac dinh' : 'Dia chi phu'}</span>
            </div>
            <div>${address.phone}</div>
            <div>${address.address}, ${address.ward}, ${address.district}, ${address.city}</div>
            ${address.note ? `<div class="muted">${address.note}</div>` : ''}
            <div class="address-card__actions">
                ${!address.isDefault ? `<button class="btn-ghost" type="button" data-address-default="${address._id}">Dat mac dinh</button>` : ''}
                <button class="btn-ghost" type="button" data-address-delete="${address._id}">Xoa</button>
            </div>
        `;
        list.appendChild(article);
    });
};

const renderOrders = (orders) => {
    const list = document.querySelector('[data-account-order-list]');
    const empty = document.querySelector('[data-account-order-empty]');
    if (!list || !empty) {
        return;
    }

    list.innerHTML = '';
    empty.hidden = orders.length > 0;

    orders.forEach((order) => {
        const article = document.createElement('article');
        article.className = 'order-card';
        article.innerHTML = `
            <div class="order-card__head">
                <strong>${order.orderNumber}</strong>
                <strong>${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.totalAmount)}</strong>
            </div>
            <div class="order-card__meta">
                <span>Don: ${order.orderStatus}</span>
                <span>Thanh toan: ${order.paymentStatus}</span>
                <span>${new Date(order.createdAt).toLocaleString('vi-VN')}</span>
            </div>
            <div class="order-card__items">
                ${order.items.map((item) => `<div>${item.name} x ${item.quantity}</div>`).join('')}
            </div>
            ${['pending', 'processing'].includes(order.orderStatus) ? `<div class="order-card__actions"><button class="btn-ghost" type="button" data-order-cancel="${order.id}">Huy don</button></div>` : ''}
        `;
        list.appendChild(article);
    });
};

const loadProfile = async () => {
    const response = await API.users.profile();
    fillProfileForm(response.data.user);
};

const loadAddresses = async () => {
    const response = await API.users.addresses.list();
    renderAddresses(response.data.addresses || []);
};

const loadOrders = async () => {
    const response = await API.orders.list();
    renderOrders(response.data.orders || []);
};

document.querySelector('[data-account-profile-form]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = {
        firstName: form.elements.firstName.value.trim(),
        lastName: form.elements.lastName.value.trim(),
        phone: form.elements.phone.value.trim(),
        dateOfBirth: form.elements.dateOfBirth.value || null,
        address: {
            street: form.elements.street.value.trim(),
            city: form.elements.city.value.trim(),
            state: form.elements.state.value.trim(),
            zipCode: form.elements.zipCode.value.trim(),
            country: form.elements.country.value.trim()
        }
    };

    Loading.show('Dang cap nhat ho so...');
    try {
        await API.users.updateProfile(payload);
        showToast('Da cap nhat ho so.');
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        Loading.hide();
    }
});

document.querySelector('[data-account-address-form]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());
    payload.isDefault = form.querySelector('input[name="isDefault"]')?.checked || false;

    Loading.show('Dang luu dia chi...');
    try {
        await API.users.addresses.create(payload);
        form.reset();
        form.querySelector('[data-location-city]')?.dispatchEvent(new Event('change'));
        await loadAddresses();
        showToast('Da luu dia chi moi.');
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        Loading.hide();
    }
});

document.addEventListener('click', async (event) => {
    const defaultButton = event.target.closest('[data-address-default]');
    if (defaultButton) {
        Loading.show('Dang cap nhat dia chi mac dinh...');
        try {
            await API.users.addresses.setDefault(defaultButton.dataset.addressDefault);
            await loadAddresses();
            showToast('Da cap nhat dia chi mac dinh.');
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            Loading.hide();
        }
        return;
    }

    const deleteButton = event.target.closest('[data-address-delete]');
    if (deleteButton) {
        Loading.show('Dang xoa dia chi...');
        try {
            await API.users.addresses.remove(deleteButton.dataset.addressDelete);
            await loadAddresses();
            showToast('Da xoa dia chi.');
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            Loading.hide();
        }
        return;
    }

    const cancelButton = event.target.closest('[data-order-cancel]');
    if (cancelButton) {
        Loading.show('Dang huy don hang...');
        try {
            await API.orders.cancel(cancelButton.dataset.orderCancel);
            await loadOrders();
            showToast('Da huy don hang.');
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            Loading.hide();
        }
    }
});

initLocationDropdowns().catch(() => {});

if (document.querySelector('[data-account-profile-form]') || document.querySelector('[data-account-address-form]') || document.querySelector('[data-account-order-list]')) {
    if (requireAuth()) {
        const tasks = [];
        if (document.querySelector('[data-account-profile-form]')) {
            tasks.push(loadProfile());
        }
        if (document.querySelector('[data-account-address-list]')) {
            tasks.push(loadAddresses());
        }
        if (document.querySelector('[data-account-order-list]')) {
            tasks.push(loadOrders());
        }

        Promise.all(tasks).catch((error) => {
            showToast(error.message || 'Khong the tai du lieu tai khoan.', 'error');
        });
    }
}
