import { API } from './api.js';
import {
    PLACEHOLDER_IMAGE,
    escapeHtml,
    flashButtonSuccess,
    getApiErrors,
    renderRetryState,
    renderSkeletonList,
    setButtonLoading,
    showToast
} from './utils.js';

const state = {
    cart: null,
    loadingItems: new Set()
};

const getItems = (cart) => Array.isArray(cart?.items) ? cart.items : [];

const setItemBusy = (itemId, isBusy) => {
    const row = document.querySelector(`[data-cart-row="${CSS.escape(String(itemId))}"]`);
    if (!row) return;
    row.classList.toggle('is-updating', isBusy);
    row.querySelectorAll('button').forEach((button) => {
        button.disabled = isBusy;
    });
};

const renderItems = (cart) => {
    const container = document.querySelector('[data-cart-items]');
    const empty = document.querySelector('[data-cart-empty]');
    if (!container || !empty) {
        return;
    }

    const items = getItems(cart);
    container.innerHTML = '';

    if (!items.length) {
        empty.hidden = false;
        return;
    }

    empty.hidden = true;

    items.forEach((item) => {
        const image = item.image || PLACEHOLDER_IMAGE;
        const meta = [item.brand || 'SoundHouse', item.attributesText].filter(Boolean).join(' • ');
        const article = document.createElement('article');
        article.className = 'cart-item';
        article.dataset.cartRow = item.id;
        article.innerHTML = `
            <img class="cart-item__image" src="${escapeHtml(image)}" alt="${escapeHtml(item.name || 'Sản phẩm')}" loading="lazy" decoding="async" onerror="this.src='${PLACEHOLDER_IMAGE}'">
            <div class="cart-item__content">
                <div class="cart-item__meta">${escapeHtml(meta)}</div>
                <a class="cart-item__title" href="/products/${escapeHtml(item.slug || '#')}">${escapeHtml(item.name || 'Sản phẩm')}</a>
                <div class="cart-item__price">
                    <strong>${escapeHtml(item.priceText || 'Liên hệ')}</strong>
                    ${item.compareAtPriceText ? `<span>${escapeHtml(item.compareAtPriceText)}</span>` : ''}
                </div>
            </div>
            <div class="cart-item__actions">
                <div class="qty-control">
                    <button type="button" data-qty-change="${escapeHtml(item.id)}" data-next-qty="${Math.max(1, Number(item.quantity || 1) - 1)}" aria-label="Giảm số lượng">-</button>
                    <span>${Number(item.quantity || 1)}</span>
                    <button type="button" data-qty-change="${escapeHtml(item.id)}" data-next-qty="${Number(item.quantity || 1) + 1}" aria-label="Tăng số lượng">+</button>
                </div>
                <div class="cart-item__line">${escapeHtml(item.lineTotalText || item.priceText || 'Liên hệ')}</div>
                <button class="cart-item__remove" type="button" data-remove-item="${escapeHtml(item.id)}">Xóa</button>
            </div>
        `;
        container.appendChild(article);
    });
};

const renderSummary = (cart) => {
    const safeCart = cart || {};
    document.querySelector('[data-summary-subtotal]')?.replaceChildren(document.createTextNode(safeCart.subtotalText || '0đ'));
    document.querySelector('[data-summary-shipping]')?.replaceChildren(document.createTextNode(safeCart.shippingFeeText || '0đ'));
    document.querySelector('[data-summary-discount]')?.replaceChildren(document.createTextNode(safeCart.discountAmountText || '0đ'));
    document.querySelector('[data-summary-total]')?.replaceChildren(document.createTextNode(safeCart.totalText || '0đ'));
    document.querySelector('[data-summary-count]')?.replaceChildren(document.createTextNode(String(safeCart.itemCount || 0)));
    const promo = document.querySelector('[data-promo-current]');
    if (promo) {
        promo.textContent = safeCart.promoCode || 'Chưa áp dụng';
    }
};

const renderCart = (cart) => {
    state.cart = cart || { items: [] };
    renderItems(state.cart);
    renderSummary(state.cart);
    window.SoundHouse?.updateCartCount?.();
};

const loadCart = async ({ skeleton = false } = {}) => {
    const container = document.querySelector('[data-cart-items]');
    if (skeleton) {
        renderSkeletonList(container, 3, 'skeleton-card');
    }

    const response = await API.cart.get();
    renderCart(response.data?.cart || { items: [] });
};

const updateQuantity = async (button) => {
    const itemId = button.dataset.qtyChange;
    if (!itemId || state.loadingItems.has(itemId)) return;

    state.loadingItems.add(itemId);
    setItemBusy(itemId, true);
    try {
        const response = await API.cart.update(itemId, {
            quantity: Number(button.dataset.nextQty || 1)
        });
        renderCart(response.data?.cart || { items: [] });
    } catch (error) {
        showToast(getApiErrors(error).message, 'error');
        setItemBusy(itemId, false);
    } finally {
        state.loadingItems.delete(itemId);
    }
};

const removeItem = async (button) => {
    const itemId = button.dataset.removeItem;
    if (!itemId || state.loadingItems.has(itemId)) return;
    if (!window.confirm('Xóa sản phẩm này khỏi giỏ hàng?')) return;

    state.loadingItems.add(itemId);
    setItemBusy(itemId, true);
    try {
        const response = await API.cart.remove(itemId);
        renderCart(response.data?.cart || { items: [] });
        showToast('Đã xóa sản phẩm khỏi giỏ hàng.');
    } catch (error) {
        showToast(getApiErrors(error).message, 'error');
        setItemBusy(itemId, false);
    } finally {
        state.loadingItems.delete(itemId);
    }
};

document.addEventListener('click', async (event) => {
    const qtyButton = event.target.closest('[data-qty-change]');
    if (qtyButton) {
        await updateQuantity(qtyButton);
        return;
    }

    const removeButton = event.target.closest('[data-remove-item]');
    if (removeButton) {
        await removeItem(removeButton);
        return;
    }

    const recommendationButton = event.target.closest('[data-add-recommendation]');
    if (recommendationButton) {
        if (recommendationButton.disabled) return;
        setButtonLoading(recommendationButton, true, 'Đang thêm...');
        try {
            const response = await API.cart.add({
                productId: recommendationButton.dataset.productId,
                variantId: recommendationButton.dataset.variantId,
                quantity: 1
            });
            renderCart(response.data?.cart || { items: [] });
            flashButtonSuccess(recommendationButton);
            showToast('Đã thêm sản phẩm gợi ý vào giỏ hàng.');
        } catch (error) {
            setButtonLoading(recommendationButton, false);
            showToast(getApiErrors(error).message, 'error');
        }
    }
});

document.querySelector('[data-promo-form]')?.addEventListener('submit', async (event) => {
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
        renderCart(response.data?.cart || { items: [] });
        showToast(response.message || 'Đã áp dụng mã giảm giá.');
    } catch (error) {
        showToast(getApiErrors(error).message, 'error');
    } finally {
        setButtonLoading(button, false);
    }
});

document.querySelector('[data-cart-checkout]')?.addEventListener('click', () => {
    if (!getItems(state.cart).length) {
        showToast('Giỏ hàng đang trống.', 'error');
        return;
    }

    window.location.href = '/checkout';
});

loadCart({ skeleton: true }).catch((error) => {
    const container = document.querySelector('[data-cart-items]');
    renderRetryState(container, getApiErrors(error).message || 'Không thể tải giỏ hàng. Vui lòng thử lại.', () => {
        loadCart({ skeleton: true }).catch((retryError) => {
            showToast(getApiErrors(retryError).message, 'error');
        });
    });
    document.querySelector('[data-cart-empty]')?.setAttribute('hidden', '');
});
