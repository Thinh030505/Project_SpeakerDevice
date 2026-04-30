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
    const nextSrc = src || PLACEHOLDER_IMAGE;
    const images = Array.from(document.querySelectorAll('[data-product-image]'));
    if (!images.length) {
        return;
    }

    images.forEach((image) => {
        if (image.getAttribute('src') === nextSrc) {
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
    });

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
    const lists = Array.from(document.querySelectorAll('[data-product-review-list]'));
    const empties = Array.from(document.querySelectorAll('[data-product-review-empty]'));
    if (!lists.length || !empties.length) {
        return;
    }

    lists.forEach((list) => {
        list.replaceChildren();
        reviews.forEach((review) => list.appendChild(createReviewItem(review)));
    });
    empties.forEach((empty) => {
        empty.hidden = reviews.length > 0;
    });

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

const initAccordions = () => {
    document.querySelectorAll('[data-detail-accordion]').forEach((item) => {
        const trigger = item.querySelector('[data-detail-accordion-trigger]');
        const panel = item.querySelector('[data-detail-accordion-panel]');
        if (!trigger || !panel) {
            return;
        }

        panel.hidden = true;
        trigger.addEventListener('click', () => {
            const isOpen = item.classList.toggle('is-open');
            trigger.setAttribute('aria-expanded', String(isOpen));
            panel.hidden = !isOpen;
        });
    });
};

const initQuickActions = () => {
    document.querySelectorAll('[data-product-share]').forEach((button) => {
        button.addEventListener('click', async () => {
            const shareData = {
                title: product?.name || 'SoundHouse',
                text: product?.shortDescription || product?.name || 'San pham SoundHouse',
                url: window.location.href
            };

            try {
                if (navigator.share) {
                    await navigator.share(shareData);
                    return;
                }

                if (navigator.clipboard?.writeText) {
                    await navigator.clipboard.writeText(window.location.href);
                    showToast('Da sao chep lien ket san pham.');
                    return;
                }

                showToast('Khong the chia se luc nay.', 'error');
            } catch (error) {
                if (error?.name !== 'AbortError') {
                    showToast('Khong the chia se luc nay.', 'error');
                }
            }
        });
    });

    document.querySelectorAll('[data-product-favorite]').forEach((button) => {
        const storageKey = `soundhouse-favorite:${product?.id || product?.slug || 'product'}`;
        const applyState = () => {
            let isSaved = false;

            try {
                isSaved = window.localStorage.getItem(storageKey) === '1';
            } catch {
                isSaved = false;
            }

            document.querySelectorAll('[data-product-favorite]').forEach((target) => {
                target.classList.toggle('is-active', isSaved);
                target.setAttribute('aria-pressed', String(isSaved));
            });
        };

        button.addEventListener('click', () => {
            try {
                if (window.localStorage.getItem(storageKey) === '1') {
                    window.localStorage.removeItem(storageKey);
                } else {
                    window.localStorage.setItem(storageKey, '1');
                }
            } catch {
                showToast('Khong the luu trang thai yeu thich luc nay.', 'error');
            }

            applyState();
        });

        applyState();
    });
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

document.querySelectorAll('[data-product-review-form]').forEach((form) => {
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!product?.slug) return;

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

        setButtonLoading(button, true, 'Dang gui...');
        try {
            await API.reviews.create(product.slug, payload);
            document.querySelectorAll('[data-product-review-form]').forEach((targetForm) => targetForm.reset());
            await loadReviews();
            showToast('Da gui danh gia thanh cong.');
        } catch (error) {
            showToast(getApiErrors(error).message, 'error');
        } finally {
            setButtonLoading(button, false);
        }
    });
});

if (product) {
    initGallery();
    initAccordions();
    initQuickActions();
    renderVariant();
    loadReviews().catch(() => {
        showToast('Khong the tai danh gia. Vui long thu lai.', 'error');
    });
}
