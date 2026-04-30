import { API } from './api.js';
import { Loading, flashButtonSuccess, setButtonLoading, showToast } from './utils.js';

const initCategoryFilters = () => {
    const form = document.querySelector('[data-category-filter-form]');
    if (!form) {
        return;
    }

    const categorySlugFields = Array.from(form.querySelectorAll('input[name="categorySlug"]'));
    const minPriceInput = form.querySelector('input[name="minPrice"]');
    const maxPriceInput = form.querySelector('input[name="maxPrice"]');
    const sortField = document.querySelector('select[data-sort-field][form="category-filter-form"]');

    const buildCategoryAction = () => {
        const selectedCategory = categorySlugFields.find((field) => field.checked);
        const slug = selectedCategory?.value?.trim() || '';
        return slug ? `/category/${slug}` : '/category';
    };

    form.addEventListener('submit', (event) => {
        const minPrice = Number(minPriceInput?.value || 0);
        const maxPrice = Number(maxPriceInput?.value || 0);

        if (minPrice > 0 && maxPrice > 0 && minPrice > maxPrice) {
            event.preventDefault();
            showToast('Gia toi thieu khong duoc lon hon gia toi da.', 'error');
            return;
        }

        form.setAttribute('action', buildCategoryAction());
        Loading.show('Dang ap dung bo loc...');
    });

    form.querySelectorAll('input[name="priceRange"]').forEach((field) => {
        field.addEventListener('change', () => {
            if (!field.checked) {
                return;
            }

            if (minPriceInput) {
                minPriceInput.value = field.dataset.priceMin || '';
            }
            if (maxPriceInput) {
                maxPriceInput.value = field.dataset.priceMax || '';
            }
        });
    });

    const clearButton = document.querySelector('[data-clear-filters]');
    clearButton?.addEventListener('click', () => {
        window.location.href = '/category';
    });

    categorySlugFields.forEach((field) => {
        field.addEventListener('change', () => {
            form.querySelectorAll('.filter-option').forEach((option) => option.classList.remove('is-active'));
            field.closest('.filter-option')?.classList.add('is-active');
        });
    });

    form.querySelectorAll('input[name="brand"], input[name="priceRange"]').forEach((field) => {
        field.addEventListener('change', () => {
            const groupBody = field.closest('.filter-group__body');
            if (!groupBody) {
                return;
            }

            groupBody.querySelectorAll('.filter-option').forEach((option) => option.classList.remove('is-active'));
            field.closest('.filter-option')?.classList.add('is-active');
        });
    });

    sortField?.addEventListener('change', () => {
        const target = form.querySelector('input[name="sort"]');
        if (target) {
            target.value = sortField.value;
        }
    });
};

const initFilterGroups = () => {
    document.querySelectorAll('[data-filter-group]').forEach((group) => {
        const toggle = group.querySelector('[data-filter-toggle]');
        if (!toggle) {
            return;
        }

        toggle.addEventListener('click', () => {
            const isCollapsed = group.classList.toggle('is-collapsed');
            toggle.setAttribute('aria-expanded', String(!isCollapsed));
        });
    });
};

const initViewToggle = () => {
    const catalogGrid = document.querySelector('[data-catalog-grid]');
    const buttons = Array.from(document.querySelectorAll('[data-view-toggle]'));
    if (!catalogGrid || !buttons.length) {
        return;
    }

    const storageKey = 'soundhouse-category-view';
    const applyView = (view) => {
        const nextView = view === 'list' ? 'list' : 'grid';
        catalogGrid.dataset.view = nextView;
        buttons.forEach((button) => {
            const isActive = button.dataset.viewToggle === nextView;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-pressed', String(isActive));
        });
        window.localStorage.setItem(storageKey, nextView);
    };

    applyView(window.localStorage.getItem(storageKey) || 'grid');

    buttons.forEach((button) => {
        button.addEventListener('click', () => applyView(button.dataset.viewToggle));
    });
};

const initMobileFilters = () => {
    const panel = document.querySelector('[data-mobile-filter-panel]');
    const openButtons = Array.from(document.querySelectorAll('[data-mobile-filter-open]'));
    const closeButton = document.querySelector('[data-mobile-filter-close]');
    const resetButton = document.querySelector('[data-mobile-filter-reset]');
    const form = panel?.querySelector('form');
    const minPriceInput = form?.querySelector('input[name="minPrice"]');
    const maxPriceInput = form?.querySelector('input[name="maxPrice"]');

    if (!panel || !openButtons.length || !form) {
        return;
    }

    const setOpen = (isOpen) => {
        panel.classList.toggle('is-open', isOpen);
        document.body.classList.toggle('is-mobile-filter-open', isOpen);
    };

    openButtons.forEach((button) => {
        button.addEventListener('click', () => setOpen(true));
    });
    closeButton?.addEventListener('click', () => setOpen(false));
    panel.addEventListener('click', (event) => {
        if (event.target === panel) {
            setOpen(false);
        }
    });

    form.querySelectorAll('input[name="priceRange"]').forEach((field) => {
        field.addEventListener('change', () => {
            if (!field.checked) {
                return;
            }

            if (minPriceInput) {
                minPriceInput.value = field.dataset.priceMin || '0';
            }
            if (maxPriceInput) {
                maxPriceInput.value = field.dataset.priceMax || '0';
            }
        });
    });

    resetButton?.addEventListener('click', () => {
        window.location.href = '/category';
    });

    form.addEventListener('submit', (event) => {
        const minPrice = Number(minPriceInput?.value || 0);
        const maxPrice = Number(maxPriceInput?.value || 0);

        if (minPrice > 0 && maxPrice > 0 && minPrice > maxPrice) {
            event.preventDefault();
            showToast('Gia toi thieu khong duoc lon hon gia toi da.', 'error');
            return;
        }

        Loading.show('Dang tim san pham...');
        setOpen(false);
    });
};

document.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-category-add-cart]');
    if (!button) {
        return;
    }

    if (button.disabled) return;
    setButtonLoading(button, true, 'Đang thêm...');
    try {
        await API.cart.add({
            productId: button.dataset.productId,
            variantId: button.dataset.variantId,
            quantity: 1
        });
        window.SoundHouse?.updateCartCount?.();
        flashButtonSuccess(button);
        showToast('Đã thêm sản phẩm vào giỏ hàng.');
    } catch (error) {
        setButtonLoading(button, false);
        showToast(error.message, 'error');
    }
});

window.addEventListener('pageshow', () => {
    Loading.hide();
});

initCategoryFilters();
initFilterGroups();
initViewToggle();
initMobileFilters();
