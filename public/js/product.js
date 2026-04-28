import { API } from './api.js';
import {
    PLACEHOLDER_IMAGE,
    flashButtonSuccess,
    getApiErrors,
    setButtonLoading,
    showToast
} from './utils.js';

const root = document.querySelector('[data-product-root]');
const product = root ? JSON.parse(root.getAttribute('data-product') || 'null') : null;

const variants = Array.isArray(product?.variants) ? product.variants : [];
const state = {
    quantity: 1,
    variantId: product?.primaryVariant?.id || variants[0]?.id || ''
};

const getVariant = () =>
    variants.find((variant) => variant.id === state.variantId) || product?.primaryVariant || variants[0] || null;

const setText = (selector, value) => {
    document.querySelectorAll(selector).forEach((target) => {
        target.replaceChildren(document.createTextNode(value || ''));
    });
};

const setButtonsDisabled = (disabled) => {
    document.querySelectorAll('[data-product-add-cart], [data-product-buy-now]').forEach((button) => {
        button.disabled = disabled;
    });
};

const setMainImage = (src, alt = product?.name || 'Sản phẩm') => {
    const image = document.querySelector('[data-product-image]');
    const nextSrc = src || PLACEHOLDER_IMAGE;
    if (!image || image.getAttribute('src') === nextSrc) {
        return;
    }

    image.classList.add('is-fading');
    window.setTimeout(() => {
        image.src = nextSrc;
        image.alt = alt;
        image.decoding = 'async';
        image.onerror = () => {
            if (image.src !== PLACEHOLDER_IMAGE) {
                image.src = PLACEHOLDER_IMAGE;
            }
        };
        image.classList.remove('is-fading');
    }, 140);

    document.querySelectorAll('[data-gallery-thumb]').forEach((button) => {
        button.classList.toggle('is-active', button.dataset.gallerySrc === nextSrc);
    });
};

const renderVariant = () => {
    const variant = getVariant();
    if (!variant) {
        setText('[data-product-price]', 'Liên hệ');
        setText('[data-mobile-product-price]', 'Liên hệ');
        setText('[data-product-old-price]', '');
        setText('[data-product-stock]', 'Chưa có biến thể');
        setText('[data-product-attributes]', 'Chưa có biến thể');
        setText('[data-product-qty]', '1');
        setButtonsDisabled(true);
        return;
    }

    const stock = Math.max(0, Number(variant.stock || 0));
    const isAvailable = stock > 0;
    state.quantity = Math.max(1, Math.min(stock || 1, state.quantity));
    state.variantId = variant.id;

    setText('[data-product-price]', variant.priceText || 'Liên hệ');
    setText('[data-mobile-product-price]', variant.priceText || 'Liên hệ');
    setText('[data-product-old-price]', variant.compareAtPriceText || '');
    setText('[data-product-stock]', isAvailable ? `Còn ${stock} sản phẩm` : 'Hết hàng');
    setText('[data-product-attributes]', variant.attributesText || 'Phiên bản tiêu chuẩn');
    setText('[data-product-qty]', String(state.quantity));

    document.querySelectorAll('[data-product-stock]').forEach((target) => {
        target.classList.toggle('is-out', !isAvailable);
    });

    document.querySelectorAll('[data-variant-btn]').forEach((button) => {
        button.classList.toggle('is-active', button.dataset.variantBtn === state.variantId);
    });

    setButtonsDisabled(!isAvailable);
    setMainImage(variant.image || product?.images?.[0], product?.name);
};

const initGallery = () => {
    document.addEventListener('click', (event) => {
        const thumb = event.target.closest('[data-gallery-thumb]');
        if (!thumb) {
            return;
        }

        setMainImage(thumb.dataset.gallerySrc, product?.name || 'Sản phẩm');
    });
};

const createReviewItem = (review) => {
    const article = document.createElement('article');
    article.className = 'review-item';

    const head = document.createElement('div');
    head.className = 'review-item__head';

    const author = document.createElement('strong');
    author.textContent = review?.authorName || 'Khách hàng';

    const date = document.createElement('span');
    date.textContent = review?.createdAt ? new Date(review.createdAt).toLocaleDateString('vi-VN') : '';

    const rating = Math.max(0, Math.min(5, Number(review?.rating || 0)));
    const stars = document.createElement('div');
    stars.className = 'review-stars';
    stars.textContent = `${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}`;

    const comment = document.createElement('p');
    comment.style.margin = '8px 0 0';
    comment.textContent = review?.comment || '';

    head.append(author, date);
    article.append(head, stars, comment);
    return article;
};

const renderReviews = (reviews = []) => {
    const list = document.querySelector('[data-product-review-list]');
    const empty = document.querySelector('[data-product-review-empty]');
    if (!list || !empty) {
        return;
    }

    list.replaceChildren();
    empty.hidden = reviews.length > 0;
    reviews.forEach((review) => list.appendChild(createReviewItem(review)));

    const ratingText = reviews.length
        ? `${(reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length).toFixed(1)} / 5`
        : 'Chưa có đánh giá';
    const countText = reviews.length ? `${reviews.length} đánh giá` : 'Sản phẩm mới';

    setText('[data-product-rating-text]', ratingText);
    setText('[data-product-rating-count]', countText);
};

const loadReviews = async () => {
    if (!product?.slug) {
        return;
    }

    const response = await API.reviews.list(product.slug);
    renderReviews(response.data?.reviews || []);
};

const validateReviewPayload = (payload) => {
    if (!payload.authorName || payload.authorName.length < 2) {
        return 'Vui lòng nhập tên hiển thị hợp lệ.';
    }
    if (!Number.isInteger(payload.rating) || payload.rating < 1 || payload.rating > 5) {
        return 'Vui lòng chọn số sao từ 1 đến 5.';
    }
    if (!payload.comment || payload.comment.length < 5) {
        return 'Vui lòng nhập nhận xét ít nhất 5 ký tự.';
    }
    return '';
};

document.addEventListener('click', async (event) => {
    const variantButton = event.target.closest('[data-variant-btn]');
    if (variantButton) {
        state.variantId = variantButton.dataset.variantBtn;
        state.quantity = 1;
        renderVariant();
        return;
    }

    const qtyButton = event.target.closest('[data-qty-btn]');
    if (qtyButton) {
        const nextQuantity = state.quantity + Number(qtyButton.dataset.qtyBtn);
        const stock = Math.max(0, Number(getVariant()?.stock || 0));
        state.quantity = Math.max(1, Math.min(stock || 1, nextQuantity));
        renderVariant();
        return;
    }

    const addButton = event.target.closest('[data-product-add-cart]');
    if (addButton) {
        if (addButton.disabled || !product?.id || !state.variantId) return;
        setButtonLoading(addButton, true, 'Đang thêm...');
        try {
            await API.cart.add({
                productId: product.id,
                variantId: state.variantId,
                quantity: state.quantity
            });
            window.SoundHouse?.updateCartCount?.();
            flashButtonSuccess(addButton);
            showToast('Đã thêm sản phẩm vào giỏ hàng.');
        } catch (error) {
            setButtonLoading(addButton, false);
            showToast(getApiErrors(error).message, 'error');
        }
        return;
    }

    const buyButton = event.target.closest('[data-product-buy-now]');
    if (buyButton) {
        if (buyButton.disabled || !product?.id || !state.variantId) return;
        setButtonLoading(buyButton, true, 'Đang chuyển...');
        try {
            await API.cart.add({
                productId: product.id,
                variantId: state.variantId,
                quantity: state.quantity
            });
            window.location.href = '/checkout';
        } catch (error) {
            showToast(getApiErrors(error).message, 'error');
            setButtonLoading(buyButton, false);
        }
    }
});

document.querySelector('[data-product-review-form]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!product?.slug) return;

    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    if (button?.disabled) return;

    const payload = {
        authorName: String(form.elements.authorName?.value || '').trim(),
        rating: Number(form.elements.rating?.value || 0),
        comment: String(form.elements.comment?.value || '').trim()
    };

    const validationMessage = validateReviewPayload(payload);
    if (validationMessage) {
        showToast(validationMessage, 'error');
        return;
    }

    setButtonLoading(button, true, 'Đang gửi...');
    try {
        await API.reviews.create(product.slug, payload);
        form.reset();
        await loadReviews();
        showToast('Đã gửi đánh giá thành công.');
    } catch (error) {
        showToast(getApiErrors(error).message, 'error');
    } finally {
        setButtonLoading(button, false);
    }
});

if (product) {
    initGallery();
    renderVariant();
    loadReviews().catch(() => {
        showToast('Không thể tải đánh giá. Vui lòng thử lại.', 'error');
    });
}
