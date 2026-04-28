import {
    authService,
    bannerService,
    brandService,
    categoryService,
    dashboardService,
    engagementService,
    orderService,
    productService,
    reviewService,
    uploadService,
    userService
} from './admin-services.js?v=20260428-5';
import { Loading, debounce, formatCurrency, showToast, toQueryString } from './utils.js?v=20260428-5';

const pageRoot = document.querySelector('[data-admin-page]');
const confirmRoot = document.getElementById('admin-confirm-root');

const state = {
    currentUser: null,
    products: [],
    categories: [],
    brands: [],
    banners: [],
    reviews: [],
    users: [],
    uploadsInFlight: 0,
    productForm: {
        images: [],
        variants: []
    }
};

const ORDER_STATUS_LABELS = {
    pending: 'Chờ xử lý',
    processing: 'Đang xử lý',
    completed: 'Hoàn thành',
    cancelled: 'Đã hủy'
};

const PAYMENT_STATUS_LABELS = {
    pending: 'Chờ thanh toán',
    paid: 'Đã thanh toán',
    failed: 'Thất bại'
};

const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const formatDateTime = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('vi-VN');
};

const isMongoId = (value) => /^[a-f\d]{24}$/i.test(String(value || '').trim());
const isValidUrl = (value) => {
    try {
        const url = new URL(String(value || '').trim());
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
};

const toStatusBadge = (label, tone = 'info') => `<span class="badge badge--${tone}">${escapeHtml(label)}</span>`;

const getToneForStatus = (value) => {
    if (['active', 'paid', 'completed', 'resolved', 'true'].includes(String(value))) return 'success';
    if (['pending', 'processing', 'draft', 'new'].includes(String(value))) return 'warning';
    if (['inactive', 'failed', 'cancelled', 'false', 'hidden', 'unsubscribed'].includes(String(value))) return 'danger';
    return 'info';
};

const qs = (selector, root = document) => root.querySelector(selector);

const pruneEmptyValues = (value) => {
    if (Array.isArray(value)) {
        return value.map(pruneEmptyValues);
    }
    if (!value || typeof value !== 'object') {
        return value;
    }
    return Object.fromEntries(
        Object.entries(value)
            .filter(([, item]) => item !== '' && item !== undefined)
            .map(([key, item]) => [key, pruneEmptyValues(item)])
            .filter(([, item]) => item !== undefined && (typeof item !== 'object' || item === null || Array.isArray(item) || Object.keys(item).length > 0))
    );
};

const createVariantDraft = () => ({
    attributeKey: 'Color',
    attributeValue: '',
    secondaryAttributeKey: '',
    secondaryAttributeValue: '',
    price: '',
    compareAtPrice: '',
    stock: '0',
    imagesText: '',
    isActive: true
});

const normalizeLines = (value) => [...new Set(
    String(value || '')
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean)
)];

const normalizeTags = (value) => [...new Set(
    String(value || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
)];

const getProductMetrics = (product) => {
    const variants = Array.isArray(product?.variants) ? product.variants : [];
    const activeVariants = variants.filter((variant) => variant?.isActive !== false);
    const prices = activeVariants.map((variant) => Number(variant?.price || 0)).filter((price) => Number.isFinite(price));
    return {
        minPrice: prices.length ? Math.min(...prices) : 0,
        totalStock: activeVariants.reduce((total, variant) => total + Number(variant?.stock || 0), 0)
    };
};

const renderSkeleton = (root, count = 3, type = 'list') => {
    if (!root) return;
    root.innerHTML = `<div class="skeleton-grid">${Array.from({ length: count }).map(() =>
        `<div class="skeleton ${type === 'card' ? 'skeleton--card' : 'skeleton--list'}"></div>`).join('')}</div>`;
};

const renderPagination = (root, pagination, onPageChange) => {
    if (!root) return;
    const page = Number(pagination?.page || 1);
    const pages = Number(pagination?.pages || 1);
    const total = Number(pagination?.total || 0);

    if (pages <= 1) {
        root.innerHTML = total ? `<div class="pagination"><span class="helper">Tổng ${total} bản ghi</span></div>` : '';
        return;
    }

    const buttons = [];
    for (let index = 1; index <= pages; index += 1) {
        if (index === 1 || index === pages || Math.abs(index - page) <= 1) {
            buttons.push(index);
        }
    }
    const deduped = [...new Set(buttons)];

    root.innerHTML = `
        <div class="pagination">
            <span class="helper">Trang ${page}/${pages} • ${total} bản ghi</span>
            <div class="pagination__buttons">
                <button type="button" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}>‹</button>
                ${deduped.map((item) => `<button type="button" data-page="${item}" class="${item === page ? 'is-active' : ''}">${item}</button>`).join('')}
                <button type="button" data-page="${page + 1}" ${page >= pages ? 'disabled' : ''}>›</button>
            </div>
        </div>
    `;

    root.querySelectorAll('[data-page]').forEach((button) => {
        button.addEventListener('click', () => onPageChange(Number(button.dataset.page)));
    });
};

const openConfirmDialog = ({ title, message, confirmText = 'Xác nhận', tone = 'danger' }) => new Promise((resolve) => {
    if (!confirmRoot) {
        resolve(window.confirm(message));
        return;
    }
    confirmRoot.innerHTML = `
        <div class="dialog-overlay">
            <div class="dialog" role="dialog" aria-modal="true">
                <h3>${escapeHtml(title)}</h3>
                <p>${escapeHtml(message)}</p>
                <div class="dialog__actions">
                    <button class="admin-btn-ghost" type="button" data-dialog-cancel>Hủy</button>
                    <button class="admin-btn ${tone === 'danger' ? '' : 'admin-btn-secondary'}" type="button" data-dialog-confirm>${escapeHtml(confirmText)}</button>
                </div>
            </div>
        </div>
    `;
    qs('[data-dialog-cancel]', confirmRoot)?.addEventListener('click', () => {
        confirmRoot.innerHTML = '';
        resolve(false);
    });
    qs('[data-dialog-confirm]', confirmRoot)?.addEventListener('click', () => {
        confirmRoot.innerHTML = '';
        resolve(true);
    });
});

const showForbiddenState = (message) => {
    if (!pageRoot) return;
    document.body.classList.remove('admin-auth-checking');
    pageRoot.innerHTML = `
        <div class="forbidden-state">
            <strong>Không có quyền truy cập</strong>
            <p>${escapeHtml(message || 'Khu vực này chỉ dành cho tài khoản admin.')}</p>
        </div>
    `;
};

const setUploadBusy = (delta) => {
    state.uploadsInFlight = Math.max(0, state.uploadsInFlight + delta);
    const submitButton = qs('[data-product-submit]');
    if (submitButton) {
        submitButton.disabled = state.uploadsInFlight > 0;
        submitButton.textContent = state.uploadsInFlight > 0 ? `Đang upload ảnh (${state.uploadsInFlight})` : 'Lưu sản phẩm';
    }
};

const attachShellInteractions = () => {
    qs('[data-admin-sidebar-open]')?.addEventListener('click', () => {
        document.body.classList.add('admin-sidebar-open');
    });
    qs('[data-admin-sidebar-close]')?.addEventListener('click', () => {
        document.body.classList.remove('admin-sidebar-open');
    });
    qs('[data-admin-logout]')?.addEventListener('click', async () => {
        Loading.show('Đang đăng xuất...');
        try {
            await authService.logout();
            window.location.href = '/login';
        } finally {
            Loading.hide();
        }
    });
};

const attachGlobalApiGuards = () => {
    window.addEventListener('api:unauthorized', async () => {
        await authService.logout();
        showToast('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'error');
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
    });
    window.addEventListener('api:forbidden', () => {
        showForbiddenState('Tài khoản hiện tại không có quyền admin cho thao tác này.');
        showToast('Bạn không có quyền thực hiện thao tác quản trị.', 'error');
    });
    window.addEventListener('api:rate-limited', () => {
        showToast('Hệ thống đang giới hạn tần suất yêu cầu. Vui lòng thử lại sau.', 'error');
    });
    window.addEventListener('api:server-error', () => {
        showToast('Máy chủ đang gặp lỗi. Vui lòng thử lại sau.', 'error');
    });
};

const ensureAdmin = async () => {
    if (!authService.getAccessToken()) {
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
        return null;
    }
    try {
        const response = await authService.profile();
        const user = response.data?.user;
        if (!user) {
            throw new Error('Không thể xác thực tài khoản.');
        }
        if (user.role !== 'admin') {
            showForbiddenState('Tài khoản hiện tại không có quyền truy cập trang quản trị.');
            return null;
        }
        state.currentUser = user;
        const summary = qs('[data-admin-user-summary]');
        if (summary) {
            summary.textContent = `Đang làm việc với ${user.username} • ${user.email}`;
        }
        document.body.classList.remove('admin-auth-checking');
        return user;
    } catch (error) {
        await authService.logout();
        showToast(error.message || 'Cần đăng nhập tài khoản admin.', 'error');
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
        return null;
    }
};

const mapProductToFormDraft = (product) => ({
    id: product?._id || '',
    name: product?.name || '',
    category: product?.category?._id || product?.category || '',
    brand: product?.brand || '',
    shortDescription: product?.shortDescription || '',
    description: product?.description || '',
    status: product?.status || 'active',
    featured: String(product?.featured !== false),
    imagesText: ensureArray(product?.images).join('\n'),
    tagsText: ensureArray(product?.tags).join(', '),
    variants: ensureArray(product?.variants).length
        ? product.variants.map((variant) => {
            const attributes = variant?.attributes instanceof Object && !Array.isArray(variant.attributes)
                ? Object.entries(variant.attributes)
                : [];
            const [first = ['', ''], second = ['', '']] = attributes;
            return {
                attributeKey: first[0] || 'Color',
                attributeValue: first[1] || '',
                secondaryAttributeKey: second[0] || '',
                secondaryAttributeValue: second[1] || '',
                price: variant?.price ?? '',
                compareAtPrice: variant?.compareAtPrice ?? '',
                stock: variant?.stock ?? 0,
                imagesText: ensureArray(variant?.images).join('\n'),
                isActive: variant?.isActive !== false
            };
        })
        : [createVariantDraft()]
});

function ensureArray(value) {
    return Array.isArray(value) ? value : [];
}

const fillProductForm = (product) => {
    const form = qs('[data-product-form]');
    if (!form) return;
    const draft = mapProductToFormDraft(product);
    form.elements.id.value = draft.id;
    form.elements.name.value = draft.name;
    form.elements.category.value = draft.category;
    form.elements.brand.value = draft.brand;
    form.elements.shortDescription.value = draft.shortDescription;
    form.elements.description.value = draft.description;
    form.elements.status.value = draft.status;
    form.elements.featured.value = draft.featured;
    form.elements.imagesText.value = draft.imagesText;
    form.elements.tagsText.value = draft.tagsText;
    state.productForm.images = normalizeLines(draft.imagesText);
    state.productForm.variants = draft.variants;
    renderProductImages();
    renderVariants();
    qs('[data-product-form-errors]')?.setAttribute('hidden', '');
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const resetProductForm = () => {
    const form = qs('[data-product-form]');
    if (!form) return;
    form.reset();
    form.elements.id.value = '';
    form.elements.status.value = 'active';
    form.elements.featured.value = 'true';
    state.productForm.images = [];
    state.productForm.variants = [createVariantDraft()];
    renderProductImages();
    renderVariants();
    const errorBox = qs('[data-product-form-errors]');
    if (errorBox) {
        errorBox.hidden = true;
        errorBox.innerHTML = '';
    }
};

const renderImageCards = (urls, removeAttr, emptyMessage) => {
    if (!urls.length) {
        return `<div class="empty-state"><strong>Chưa có hình ảnh</strong><p>${escapeHtml(emptyMessage)}</p></div>`;
    }
    return `
        <div class="image-grid">
            ${urls.map((url, index) => `
                <article class="image-card">
                    <div class="image-card__preview">
                        <img src="${escapeHtml(url)}" alt="Ảnh ${index + 1}" loading="lazy" onerror="this.src='https://placehold.co/600x600/F1F3FA/697489?text=No+Image';">
                    </div>
                    <div class="image-card__body">
                        <strong>Ảnh ${index + 1}</strong>
                        <div class="image-card__url">${escapeHtml(url)}</div>
                        <button class="admin-btn-ghost" type="button" ${removeAttr}="${index}">Xóa ảnh</button>
                    </div>
                </article>
            `).join('')}
        </div>
    `;
};

const renderProductImages = () => {
    const gallery = qs('[data-product-image-gallery]');
    if (!gallery) return;
    gallery.innerHTML = renderImageCards(
        state.productForm.images,
        'data-remove-product-image',
        'Dán link ảnh hoặc upload từ máy để xem preview.'
    );
};

const renderVariants = () => {
    const root = qs('[data-product-variants]');
    if (!root) return;
    if (!state.productForm.variants.length) {
        state.productForm.variants = [createVariantDraft()];
    }
    root.innerHTML = state.productForm.variants.map((variant, index) => {
        const images = normalizeLines(variant.imagesText);
        return `
            <article class="variant-card">
                <div class="variant-card__body">
                    <div class="variant-card__head">
                        <strong>Variant ${index + 1}</strong>
                        <div class="inline-actions">
                            ${toStatusBadge(variant.isActive ? 'Đang bán' : 'Tạm ẩn', variant.isActive ? 'success' : 'danger')}
                            <button class="admin-btn-ghost" type="button" data-remove-variant="${index}" ${state.productForm.variants.length <= 1 ? 'disabled' : ''}>Xóa variant</button>
                        </div>
                    </div>
                    <div class="field-grid">
                        <div class="field">
                            <label>Thuộc tính chính</label>
                            <select data-variant-field="attributeKey" data-variant-index="${index}">
                                ${['Color', 'Version', 'Model', 'Size'].map((key) => `<option value="${key}" ${variant.attributeKey === key ? 'selected' : ''}>${key}</option>`).join('')}
                            </select>
                        </div>
                        <div class="field">
                            <label>Giá trị</label>
                            <input type="text" data-variant-field="attributeValue" data-variant-index="${index}" value="${escapeHtml(variant.attributeValue)}" placeholder="Black">
                        </div>
                    </div>
                    <div class="field-grid">
                        <div class="field">
                            <label>Thuộc tính phụ</label>
                            <input type="text" data-variant-field="secondaryAttributeKey" data-variant-index="${index}" value="${escapeHtml(variant.secondaryAttributeKey || '')}" placeholder="Version">
                        </div>
                        <div class="field">
                            <label>Giá trị phụ</label>
                            <input type="text" data-variant-field="secondaryAttributeValue" data-variant-index="${index}" value="${escapeHtml(variant.secondaryAttributeValue || '')}" placeholder="2026">
                        </div>
                    </div>
                    <div class="field-grid">
                        <div class="field">
                            <label>Giá bán</label>
                            <input type="number" min="0" data-variant-field="price" data-variant-index="${index}" value="${escapeHtml(variant.price)}">
                        </div>
                        <div class="field">
                            <label>Giá so sánh</label>
                            <input type="number" min="0" data-variant-field="compareAtPrice" data-variant-index="${index}" value="${escapeHtml(variant.compareAtPrice)}">
                        </div>
                    </div>
                    <div class="field-grid">
                        <div class="field">
                            <label>Tồn kho</label>
                            <input type="number" min="0" data-variant-field="stock" data-variant-index="${index}" value="${escapeHtml(variant.stock)}">
                        </div>
                        <div class="field">
                            <label>Trạng thái</label>
                            <select data-variant-field="isActive" data-variant-index="${index}">
                                <option value="true" ${variant.isActive ? 'selected' : ''}>Đang bán</option>
                                <option value="false" ${!variant.isActive ? 'selected' : ''}>Tạm ẩn</option>
                            </select>
                        </div>
                    </div>
                    <div class="field">
                        <label>URL ảnh variant</label>
                        <textarea data-variant-field="imagesText" data-variant-index="${index}" placeholder="https://...">${escapeHtml(variant.imagesText || '')}</textarea>
                    </div>
                    <div class="upload-dropzone">
                        <input type="file" accept="image/*" multiple data-variant-upload-input="${index}">
                        <div class="inline-actions">
                            <button class="admin-btn-secondary" type="button" data-variant-upload-trigger="${index}">Upload ảnh variant</button>
                            <span class="helper">Cloudinary • upload tuần tự để tránh lỗi vặt</span>
                        </div>
                    </div>
                    ${images.length ? `
                        <div class="image-grid">
                            ${images.map((url, imageIndex) => `
                                <article class="image-card">
                                    <div class="image-card__preview">
                                        <img src="${escapeHtml(url)}" alt="Ảnh variant ${imageIndex + 1}" loading="lazy" onerror="this.src='https://placehold.co/600x600/F1F3FA/697489?text=No+Image';">
                                    </div>
                                    <div class="image-card__body">
                                        <strong>Ảnh variant ${imageIndex + 1}</strong>
                                        <div class="image-card__url">${escapeHtml(url)}</div>
                                        <button class="admin-btn-ghost" type="button" data-remove-variant-image="${index}:${imageIndex}">Xóa ảnh</button>
                                    </div>
                                </article>
                            `).join('')}
                        </div>
                    ` : `<div class="empty-state"><strong>Chưa có ảnh variant</strong><p>Variant cần ít nhất một ảnh hợp lệ.</p></div>`}
                </div>
            </article>
        `;
    }).join('');
};

const collectProductPayload = () => {
    const form = qs('[data-product-form]');
    const images = normalizeLines(form.elements.imagesText.value);
    const variants = state.productForm.variants.map((variant) => {
        const attributes = {};
        if (String(variant.attributeKey || '').trim() && String(variant.attributeValue || '').trim()) {
            attributes[String(variant.attributeKey).trim()] = String(variant.attributeValue).trim();
        }
        if (String(variant.secondaryAttributeKey || '').trim() && String(variant.secondaryAttributeValue || '').trim()) {
            attributes[String(variant.secondaryAttributeKey).trim()] = String(variant.secondaryAttributeValue).trim();
        }
        return {
            attributes,
            price: Number(variant.price),
            compareAtPrice: variant.compareAtPrice === '' ? undefined : Number(variant.compareAtPrice),
            stock: Number(variant.stock),
            images: normalizeLines(variant.imagesText),
            isActive: String(variant.isActive) !== 'false'
        };
    });
    return pruneEmptyValues({
        name: form.elements.name.value.trim(),
        category: form.elements.category.value.trim(),
        brand: form.elements.brand.value.trim(),
        shortDescription: form.elements.shortDescription.value.trim(),
        description: form.elements.description.value.trim(),
        status: form.elements.status.value,
        featured: form.elements.featured.value === 'true',
        images,
        tags: normalizeTags(form.elements.tagsText.value),
        variants
    });
};

const validateProductPayload = (payload) => {
    const errors = [];
    if (!payload.name || payload.name.length < 3 || payload.name.length > 200) {
        errors.push('Tên sản phẩm phải từ 3 đến 200 ký tự.');
    }
    if (!payload.category || !isMongoId(payload.category)) {
        errors.push('Danh mục là bắt buộc và phải là ObjectId hợp lệ.');
    }
    if (!payload.description || payload.description.length < 10) {
        errors.push('Mô tả chi tiết phải có ít nhất 10 ký tự.');
    }
    payload.images?.forEach((url) => {
        if (!isValidUrl(url)) {
            errors.push(`Ảnh sản phẩm không phải URL hợp lệ: ${url}`);
        }
    });
    if (!ensureArray(payload.variants).length) {
        errors.push('Sản phẩm phải có ít nhất 1 variant.');
    }
    ensureArray(payload.variants).forEach((variant, index) => {
        if (!Object.keys(variant.attributes || {}).length) {
            errors.push(`Variant ${index + 1} cần ít nhất 1 thuộc tính.`);
        }
        if (!(Number(variant.price) > 0)) {
            errors.push(`Variant ${index + 1} phải có giá bán lớn hơn 0.`);
        }
        if (variant.compareAtPrice !== undefined && Number(variant.compareAtPrice) < Number(variant.price)) {
            errors.push(`Giá so sánh của variant ${index + 1} phải lớn hơn hoặc bằng giá bán.`);
        }
        if (Number(variant.stock) < 0) {
            errors.push(`Tồn kho của variant ${index + 1} không được âm.`);
        }
        if (!ensureArray(variant.images).length) {
            errors.push(`Variant ${index + 1} phải có ít nhất 1 ảnh.`);
        }
        ensureArray(variant.images).forEach((url) => {
            if (!isValidUrl(url)) {
                errors.push(`Ảnh của variant ${index + 1} không hợp lệ: ${url}`);
            }
        });
    });
    return errors;
};

const renderFormErrors = (errors) => {
    const root = qs('[data-product-form-errors]');
    if (!root) return;
    if (!errors.length) {
        root.hidden = true;
        root.innerHTML = '';
        return;
    }
    root.hidden = false;
    root.innerHTML = `<strong>Chưa thể lưu sản phẩm:</strong><ul>${errors.map((error) => `<li>${escapeHtml(error)}</li>`).join('')}</ul>`;
};

const uploadFilesSequentially = async (files, onProgress) => {
    const urls = [];
    setUploadBusy(1);
    try {
        for (let index = 0; index < files.length; index += 1) {
            onProgress?.(index + 1, files.length);
            const response = await uploadService.uploadProductImage(files[index]);
            const url = response.data?.url;
            if (url) {
                urls.push(url);
            }
        }
        return urls;
    } finally {
        setUploadBusy(-1);
    }
};

const buildRecordCard = ({ thumb, title, meta = [], footerLeft = '', footerRight = '' }) => `
    <article class="record-card">
        <div class="record-card__head">
            <div class="inline-actions">
                ${thumb ? `<div class="record-thumb"><img src="${escapeHtml(thumb)}" alt="${escapeHtml(title)}" onerror="this.src='https://placehold.co/600x600/F1F3FA/697489?text=No+Image';"></div>` : ''}
                <div class="record-card__summary">
                    <strong>${escapeHtml(title)}</strong>
                </div>
            </div>
        </div>
        <div class="record-card__meta">${meta.map((item) => `<span>${item}</span>`).join('')}</div>
        <div class="record-card__footer">
            <div class="inline-actions">${footerLeft}</div>
            <div class="inline-actions">${footerRight}</div>
        </div>
    </article>
`;

const initDashboard = async () => {
    const statsRoot = qs('[data-dashboard-stats]');
    const ordersRoot = qs('[data-dashboard-orders]');
    const contactsRoot = qs('[data-dashboard-contacts]');
    const lowStockRoot = qs('[data-dashboard-low-stock]');
    renderSkeleton(statsRoot, 6, 'card');
    renderSkeleton(ordersRoot, 3);
    renderSkeleton(contactsRoot, 3);
    renderSkeleton(lowStockRoot, 3);

    const [dashboardResponse, ordersResponse, productsResponse] = await Promise.all([
        dashboardService.summary(),
        orderService.list(toQueryString({ limit: 100 })),
        productService.list(toQueryString({ limit: 100, status: 'active' }))
    ]);

    const stats = dashboardResponse.data?.stats || {};
    const orders = ensureArray(ordersResponse.data?.orders);
    const products = ensureArray(productsResponse.data?.products);
    const now = new Date();
    const todayKey = now.toDateString();
    const month = now.getMonth();
    const year = now.getFullYear();
    const paidOrders = orders.filter((order) => order.paymentStatus === 'paid');
    const revenueToday = paidOrders
        .filter((order) => new Date(order.createdAt).toDateString() === todayKey)
        .reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
    const revenueMonth = paidOrders
        .filter((order) => {
            const date = new Date(order.createdAt);
            return date.getMonth() === month && date.getFullYear() === year;
        })
        .reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
    const lowStockProducts = products
        .map((product) => ({ product, ...getProductMetrics(product) }))
        .filter((item) => item.totalStock <= 5)
        .sort((first, second) => first.totalStock - second.totalStock)
        .slice(0, 5);

    statsRoot.innerHTML = [
        ['Tổng sản phẩm', stats.totalProducts || 0, `${stats.activeProducts || 0} đang hiển thị`],
        ['Tổng đơn hàng', stats.totalOrders || 0, `${stats.pendingOrders || 0} chờ xử lý`],
        ['Doanh thu hôm nay', formatCurrency(revenueToday), 'Tính từ các đơn đã thanh toán'],
        ['Doanh thu tháng', formatCurrency(revenueMonth), 'Tính trong tháng hiện tại'],
        ['Người dùng mới', stats.recentUsersCount || 0, 'Trong 7 ngày gần nhất'],
        ['Sắp hết hàng', lowStockProducts.length, 'Các sản phẩm tồn kho thấp cần chú ý']
    ].map(([label, value, helper]) => `
        <article class="stat-card">
            <small>${label}</small>
            <strong>${value}</strong>
            <p>${helper}</p>
        </article>
    `).join('');

    ordersRoot.innerHTML = ensureArray(dashboardResponse.data?.recentOrders).length
        ? dashboardResponse.data.recentOrders.map((order) => buildRecordCard({
            title: order.orderNumber,
            meta: [
                escapeHtml(order.shippingAddress?.fullName || '-'),
                escapeHtml(formatDateTime(order.createdAt)),
                formatCurrency(order.totalAmount)
            ],
            footerLeft: `${toStatusBadge(ORDER_STATUS_LABELS[order.orderStatus] || order.orderStatus, getToneForStatus(order.orderStatus))}
                ${toStatusBadge(PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus, getToneForStatus(order.paymentStatus))}`
        })).join('')
        : `<div class="empty-state"><strong>Chưa có đơn hàng mới</strong><p>Dữ liệu sẽ xuất hiện khi có đơn phát sinh.</p></div>`;

    contactsRoot.innerHTML = ensureArray(dashboardResponse.data?.recentContacts).length
        ? dashboardResponse.data.recentContacts.map((contact) => buildRecordCard({
            title: contact.name,
            meta: [escapeHtml(contact.email), escapeHtml(contact.subject), escapeHtml(formatDateTime(contact.createdAt))],
            footerLeft: toStatusBadge(contact.status, getToneForStatus(contact.status))
        })).join('')
        : `<div class="empty-state"><strong>Chưa có liên hệ mới</strong><p>Inbox đang trống.</p></div>`;

    lowStockRoot.innerHTML = lowStockProducts.length
        ? lowStockProducts.map(({ product, totalStock, minPrice }) => buildRecordCard({
            thumb: ensureArray(product.images)[0],
            title: product.name,
            meta: [
                escapeHtml(product.brand || 'Chưa có thương hiệu'),
                `Tồn kho: ${totalStock}`,
                `Từ ${formatCurrency(minPrice)}`
            ],
            footerLeft: `${toStatusBadge(totalStock === 0 ? 'Hết hàng' : 'Sắp hết', totalStock === 0 ? 'danger' : 'warning')}`
        })).join('')
        : `<div class="empty-state"><strong>Không có cảnh báo tồn kho thấp</strong><p>Các sản phẩm active hiện đang ở mức ổn định.</p></div>`;
};

const initProducts = async () => {
    const listRoot = qs('[data-product-list]');
    const emptyRoot = qs('[data-product-empty]');
    const paginationRoot = qs('[data-product-pagination]');
    const form = qs('[data-product-form]');
    const filters = {
        page: 1,
        limit: 12,
        search: '',
        category: '',
        brand: '',
        status: 'active',
        featured: '',
        sort: '-createdAt'
    };

    const syncReferenceOptions = async () => {
        const [categoryResponse, brandResponse] = await Promise.all([
            categoryService.list(toQueryString({ limit: 100, status: 'active' })),
            brandService.list(toQueryString({ limit: 100 }))
        ]);
        state.categories = ensureArray(categoryResponse.data?.categories);
        state.brands = ensureArray(brandResponse.data?.brands);
        qs('[data-product-category-options]').innerHTML = `<option value="">Chọn danh mục</option>${state.categories.map((category) =>
            `<option value="${category._id}">${escapeHtml(category.name)}</option>`).join('')}`;
        qs('[data-product-category-filter]').innerHTML = `<option value="">Tất cả danh mục</option>${state.categories.map((category) =>
            `<option value="${category._id}">${escapeHtml(category.name)}</option>`).join('')}`;
        qs('[data-product-brand-filter]').innerHTML = `<option value="">Tất cả thương hiệu</option>${state.brands.map((brand) =>
            `<option value="${escapeHtml(brand.name)}">${escapeHtml(brand.name)}</option>`).join('')}`;
        qs('[data-brand-suggestions]').innerHTML = state.brands.map((brand) => `<option value="${escapeHtml(brand.name)}"></option>`).join('');
    };

    const loadProducts = async () => {
        renderSkeleton(listRoot, 4);
        const query = toQueryString({
            page: filters.page,
            limit: filters.limit,
            search: filters.search,
            category: filters.category,
            brand: filters.brand,
            status: filters.status,
            featured: filters.featured,
            sort: filters.sort
        });
        const response = await productService.list(query);
        const products = ensureArray(response.data?.products);
        state.products = products;
        const pagination = response.data?.pagination || {};

        emptyRoot.hidden = products.length > 0;
        listRoot.innerHTML = products.map((product) => {
            const metrics = getProductMetrics(product);
            return buildRecordCard({
                thumb: ensureArray(product.images)[0],
                title: product.name,
                meta: [
                    escapeHtml(product.brand || 'Chưa có thương hiệu'),
                    escapeHtml(product.category?.name || 'Chưa có danh mục'),
                    `Từ ${formatCurrency(metrics.minPrice)}`,
                    `Tồn kho ${metrics.totalStock}`,
                    formatDateTime(product.createdAt)
                ],
                footerLeft: `
                    ${toStatusBadge(product.status, getToneForStatus(product.status))}
                    ${toStatusBadge(product.featured ? 'Nổi bật' : 'Tiêu chuẩn', product.featured ? 'success' : 'muted')}
                `,
                footerRight: `
                    <button class="admin-btn-secondary" type="button" data-edit-product="${product._id}">Sửa</button>
                    <button class="admin-btn-ghost" type="button" data-toggle-product="${product._id}">${product.status === 'active' ? 'Ẩn' : 'Hiện'}</button>
                    <button class="admin-btn-ghost" type="button" data-delete-product="${product._id}">Xóa</button>
                `
            });
        }).join('');
        renderPagination(paginationRoot, pagination, (page) => {
            filters.page = page;
            loadProducts().catch(handlePageError);
        });
    };

    const handlePageError = (error) => {
        showToast(error.message || 'Không thể tải dữ liệu.', 'error');
        listRoot.innerHTML = `<div class="error-state"><strong>Tải dữ liệu thất bại</strong><p>${escapeHtml(error.message || 'Vui lòng thử lại.')}</p></div>`;
    };

    await syncReferenceOptions();
    resetProductForm();
    await loadProducts().catch(handlePageError);

    qs('[data-product-search]')?.addEventListener('input', debounce((event) => {
        filters.search = event.target.value.trim();
        filters.page = 1;
        loadProducts().catch(handlePageError);
    }, 350));
    qs('[data-product-category-filter]')?.addEventListener('change', (event) => {
        filters.category = event.target.value;
        filters.page = 1;
        loadProducts().catch(handlePageError);
    });
    qs('[data-product-brand-filter]')?.addEventListener('change', (event) => {
        filters.brand = event.target.value;
        filters.page = 1;
        loadProducts().catch(handlePageError);
    });
    qs('[data-product-status]')?.addEventListener('change', (event) => {
        filters.status = event.target.value;
        filters.page = 1;
        loadProducts().catch(handlePageError);
    });
    qs('[data-product-featured-filter]')?.addEventListener('change', (event) => {
        filters.featured = event.target.value;
        filters.page = 1;
        loadProducts().catch(handlePageError);
    });
    qs('[data-product-sort]')?.addEventListener('change', (event) => {
        filters.sort = event.target.value;
        filters.page = 1;
        loadProducts().catch(handlePageError);
    });
    qs('[data-product-refresh]')?.addEventListener('click', () => loadProducts().catch(handlePageError));
    qs('[data-product-create-new]')?.addEventListener('click', resetProductForm);
    qs('[data-product-reset]')?.addEventListener('click', resetProductForm);

    qs('[data-product-image-upload]')?.addEventListener('change', (event) => {
        const count = event.target.files?.length || 0;
        const label = qs('[data-product-upload-count]');
        if (label) {
            label.textContent = count ? `Đã chọn ${count} ảnh.` : 'Chưa chọn file nào.';
        }
    });

    qs('[data-product-upload-trigger]')?.addEventListener('click', async () => {
        const input = qs('[data-product-image-upload]');
        const files = Array.from(input?.files || []);
        if (!files.length) {
            showToast('Hãy chọn ít nhất một ảnh để upload.', 'error');
            return;
        }
        try {
            const urls = await uploadFilesSequentially(files, (current, total) => {
                qs('[data-product-upload-count]').textContent = `Đang upload ${current}/${total} ảnh...`;
            });
            state.productForm.images = [...new Set([...state.productForm.images, ...urls])];
            form.elements.imagesText.value = state.productForm.images.join('\n');
            renderProductImages();
            input.value = '';
            qs('[data-product-upload-count]').textContent = `Đã upload ${urls.length} ảnh thành công.`;
            showToast('Upload ảnh sản phẩm thành công.');
        } catch (error) {
            showToast(error.message || 'Upload ảnh thất bại.', 'error');
        }
    });

    listRoot.addEventListener('click', async (event) => {
        const editButton = event.target.closest('[data-edit-product]');
        if (editButton) {
            const product = state.products.find((item) => item._id === editButton.dataset.editProduct);
            if (product) fillProductForm(product);
            return;
        }
        const toggleButton = event.target.closest('[data-toggle-product]');
        if (toggleButton) {
            const product = state.products.find((item) => item._id === toggleButton.dataset.toggleProduct);
            if (!product) return;
            const nextStatus = product.status === 'active' ? 'inactive' : 'active';
            const confirmed = await openConfirmDialog({
                title: `${nextStatus === 'active' ? 'Hiện' : 'Ẩn'} sản phẩm`,
                message: `Bạn có chắc muốn chuyển trạng thái sản phẩm "${product.name}" sang ${nextStatus}?`,
                confirmText: 'Xác nhận'
            });
            if (!confirmed) return;
            await productService.update(product._id, { status: nextStatus });
            showToast('Đã cập nhật trạng thái sản phẩm.');
            await loadProducts().catch(handlePageError);
            return;
        }
        const deleteButton = event.target.closest('[data-delete-product]');
        if (deleteButton) {
            const product = state.products.find((item) => item._id === deleteButton.dataset.deleteProduct);
            if (!product) return;
            const confirmed = await openConfirmDialog({
                title: 'Xóa sản phẩm',
                message: `Hành động này sẽ lưu trữ sản phẩm "${product.name}" và không thể hoàn tác nhanh. Tiếp tục?`,
                confirmText: 'Xóa sản phẩm'
            });
            if (!confirmed) return;
            await productService.remove(product._id);
            showToast('Đã xóa sản phẩm.');
            await loadProducts().catch(handlePageError);
        }
    });

    qs('[data-product-image-gallery]')?.addEventListener('click', (event) => {
        const removeButton = event.target.closest('[data-remove-product-image]');
        if (!removeButton) return;
        state.productForm.images.splice(Number(removeButton.dataset.removeProductImage), 1);
        form.elements.imagesText.value = state.productForm.images.join('\n');
        renderProductImages();
    });

    qs('[data-product-variants]')?.addEventListener('input', (event) => {
        const field = event.target.dataset.variantField;
        const index = Number(event.target.dataset.variantIndex);
        if (!field || Number.isNaN(index)) return;
        state.productForm.variants[index][field] = event.target.value;
    });

    qs('[data-product-variants]')?.addEventListener('change', (event) => {
        const field = event.target.dataset.variantField;
        const index = Number(event.target.dataset.variantIndex);
        if (field && !Number.isNaN(index)) {
            state.productForm.variants[index][field] = event.target.value;
            if (field === 'imagesText') {
                renderVariants();
            }
        }
    });

    qs('[data-product-variants]')?.addEventListener('click', async (event) => {
        const removeVariantButton = event.target.closest('[data-remove-variant]');
        if (removeVariantButton) {
            const index = Number(removeVariantButton.dataset.removeVariant);
            if (state.productForm.variants.length <= 1) {
                showToast('Sản phẩm phải có ít nhất 1 variant.', 'error');
                return;
            }
            state.productForm.variants.splice(index, 1);
            renderVariants();
            return;
        }
        const uploadVariantButton = event.target.closest('[data-variant-upload-trigger]');
        if (uploadVariantButton) {
            const index = Number(uploadVariantButton.dataset.variantUploadTrigger);
            const input = qs(`[data-variant-upload-input="${index}"]`);
            const files = Array.from(input?.files || []);
            if (!files.length) {
                showToast('Hãy chọn ảnh cho variant trước khi upload.', 'error');
                return;
            }
            try {
                const urls = await uploadFilesSequentially(files);
                const currentLines = normalizeLines(state.productForm.variants[index].imagesText);
                state.productForm.variants[index].imagesText = [...new Set([...currentLines, ...urls])].join('\n');
                renderVariants();
                showToast('Đã upload ảnh variant.');
            } catch (error) {
                showToast(error.message || 'Upload ảnh variant thất bại.', 'error');
            }
            return;
        }
        const removeVariantImageButton = event.target.closest('[data-remove-variant-image]');
        if (removeVariantImageButton) {
            const [variantIndex, imageIndex] = String(removeVariantImageButton.dataset.removeVariantImage || '').split(':').map(Number);
            const images = normalizeLines(state.productForm.variants[variantIndex].imagesText);
            images.splice(imageIndex, 1);
            state.productForm.variants[variantIndex].imagesText = images.join('\n');
            renderVariants();
        }
    });

    qs('[data-add-variant]')?.addEventListener('click', () => {
        state.productForm.variants.push(createVariantDraft());
        renderVariants();
    });

    form?.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (state.uploadsInFlight > 0) {
            showToast('Đợi upload ảnh hoàn tất trước khi lưu.', 'error');
            return;
        }
        const payload = collectProductPayload();
        const errors = validateProductPayload(payload);
        renderFormErrors(errors);
        if (errors.length) return;

        Loading.show(form.elements.id.value ? 'Đang cập nhật sản phẩm...' : 'Đang tạo sản phẩm...');
        try {
            const id = form.elements.id.value;
            const response = id
                ? await productService.update(id, payload)
                : await productService.create(payload);
            showToast(id ? 'Đã cập nhật sản phẩm.' : 'Đã tạo sản phẩm.');
            await syncReferenceOptions();
            await loadProducts().catch(handlePageError);
            fillProductForm(response.data?.product || payload);
        } catch (error) {
            showToast(error.message || 'Không thể lưu sản phẩm.', 'error');
        } finally {
            Loading.hide();
        }
    });

    form.elements.imagesText.addEventListener('change', () => {
        state.productForm.images = normalizeLines(form.elements.imagesText.value);
        renderProductImages();
    });
};

const makeCrudPage = ({
    listRootSelector,
    emptyRootSelector,
    paginationRootSelector,
    searchSelector,
    statusSelector,
    refreshSelector,
    formSelector,
    resetSelector,
    getService,
    listKey,
    fillForm,
    toPayload,
    renderItem,
    onDeleteGuard,
    afterLoad,
    canCreate = true
}) => {
    const listRoot = qs(listRootSelector);
    const emptyRoot = qs(emptyRootSelector);
    const paginationRoot = qs(paginationRootSelector);
    const form = qs(formSelector);
    const filters = { page: 1, limit: 12, search: '', status: statusSelector ? (qs(statusSelector)?.value || 'active') : '' };
    let records = [];

    const load = async () => {
        renderSkeleton(listRoot, 4);
        const response = await getService().list(toQueryString({
            page: filters.page,
            limit: filters.limit,
            search: filters.search,
            status: filters.status
        }));
        records = ensureArray(response.data?.[listKey]);
        emptyRoot.hidden = records.length > 0;
        listRoot.innerHTML = records.map((record) => renderItem(record)).join('');
        renderPagination(paginationRoot, response.data?.pagination, (page) => {
            filters.page = page;
            load().catch((error) => showToast(error.message, 'error'));
        });
        await afterLoad?.(records);
    };

    searchSelector && qs(searchSelector)?.addEventListener('input', debounce((event) => {
        filters.search = event.target.value.trim();
        filters.page = 1;
        load().catch((error) => showToast(error.message, 'error'));
    }, 300));
    statusSelector && qs(statusSelector)?.addEventListener('change', (event) => {
        filters.status = event.target.value;
        filters.page = 1;
        load().catch((error) => showToast(error.message, 'error'));
    });
    refreshSelector && qs(refreshSelector)?.addEventListener('click', () => load().catch((error) => showToast(error.message, 'error')));
    resetSelector && qs(resetSelector)?.addEventListener('click', () => {
        form?.reset();
        if (form?.elements?.id) {
            form.elements.id.value = '';
        }
    });

    listRoot?.addEventListener('click', async (event) => {
        const editButton = event.target.closest('[data-edit-id]');
        if (editButton) {
            const item = records.find((record) => record._id === editButton.dataset.editId);
            if (item) fillForm(item);
            return;
        }
        const deleteButton = event.target.closest('[data-delete-id]');
        if (deleteButton) {
            const item = records.find((record) => record._id === deleteButton.dataset.deleteId);
            if (!item) return;
            const guardMessage = await onDeleteGuard?.(item, records);
            if (guardMessage) {
                showToast(guardMessage, 'error');
                return;
            }
            const confirmed = await openConfirmDialog({
                title: 'Xóa bản ghi',
                message: `Bạn có chắc muốn xóa "${item.name || item.username}"?`,
                confirmText: 'Xóa'
            });
            if (!confirmed) return;
            await getService().remove(item._id);
            showToast('Đã xóa bản ghi.');
            await load().catch((error) => showToast(error.message, 'error'));
        }
    });

    form?.addEventListener('submit', async (event) => {
        event.preventDefault();
        try {
            const id = form.elements.id.value;
            if (!id && !canCreate) {
                showToast('Hay chon mot ban ghi trong danh sach de cap nhat.', 'error');
                return;
            }
            const payload = toPayload(form);
            await (id ? getService().update(id, payload) : getService().create(payload));
            showToast(id ? 'Đã cập nhật dữ liệu.' : 'Đã tạo dữ liệu mới.');
            form.reset();
            if (form.elements.id) form.elements.id.value = '';
            await load().catch((error) => showToast(error.message, 'error'));
        } catch (error) {
            showToast(error.message || 'Không thể lưu dữ liệu.', 'error');
        }
    });

    return { load };
};

const initCategories = async () => {
    const form = qs('[data-category-form]');
    const page = makeCrudPage({
        listRootSelector: '[data-category-list]',
        emptyRootSelector: '[data-category-empty]',
        paginationRootSelector: '[data-category-pagination]',
        searchSelector: '[data-category-search]',
        statusSelector: '[data-category-status]',
        refreshSelector: '[data-category-refresh]',
        formSelector: '[data-category-form]',
        resetSelector: '[data-category-reset]',
        getService: () => categoryService,
        listKey: 'categories',
        fillForm: (category) => {
            form.elements.id.value = category._id;
            form.elements.name.value = category.name || '';
            form.elements.parent.value = category.parent?._id || '';
            form.elements.description.value = category.description || '';
            form.elements.image.value = category.image || '';
            form.elements.icon.value = category.icon || '';
            form.elements.order.value = category.order ?? 0;
            form.elements.status.value = category.status || 'active';
            form.elements.featured.value = String(Boolean(category.featured));
        },
        toPayload: (currentForm) => pruneEmptyValues({
            name: currentForm.elements.name.value.trim(),
            parent: currentForm.elements.parent.value || null,
            description: currentForm.elements.description.value.trim(),
            image: currentForm.elements.image.value.trim(),
            icon: currentForm.elements.icon.value.trim(),
            order: Number(currentForm.elements.order.value || 0),
            status: currentForm.elements.status.value,
            featured: currentForm.elements.featured.value === 'true'
        }),
        renderItem: (category) => buildRecordCard({
            title: category.name,
            meta: [
                `Cha: ${escapeHtml(category.parent?.name || 'Danh mục gốc')}`,
                `Sản phẩm: ${category.productCount || 0}`,
                `Thứ tự: ${category.order ?? 0}`
            ],
            footerLeft: `
                ${toStatusBadge(category.status, getToneForStatus(category.status))}
                ${toStatusBadge(category.featured ? 'Nổi bật' : 'Tiêu chuẩn', category.featured ? 'success' : 'muted')}
            `,
            footerRight: `
                <button class="admin-btn-secondary" type="button" data-edit-id="${category._id}">Sửa</button>
                <button class="admin-btn-ghost" type="button" data-delete-id="${category._id}">Xóa</button>
            `
        }),
        afterLoad: async (records) => {
            state.categories = records;
            const parentSelect = qs('[data-category-parent-options]');
            if (parentSelect) {
                const currentValue = form.elements.parent.value;
                parentSelect.innerHTML = `<option value="">Danh mục gốc</option>${records.map((category) =>
                    `<option value="${category._id}">${escapeHtml(category.name)}</option>`).join('')}`;
                form.elements.parent.value = currentValue;
            }
        }
    });
    await page.load();
};

const initBrands = async () => {
    const form = qs('[data-brand-form]');
    const page = makeCrudPage({
        listRootSelector: '[data-brand-list]',
        emptyRootSelector: '[data-brand-empty]',
        paginationRootSelector: '[data-brand-pagination]',
        searchSelector: '[data-brand-search]',
        statusSelector: '[data-brand-status]',
        refreshSelector: '[data-brand-refresh]',
        formSelector: '[data-brand-form]',
        resetSelector: '[data-brand-reset]',
        getService: () => brandService,
        listKey: 'brands',
        fillForm: (brand) => {
            form.elements.id.value = brand._id;
            form.elements.name.value = brand.name || '';
            form.elements.country.value = brand.country || '';
            form.elements.description.value = brand.description || '';
            form.elements.shortDescription.value = brand.shortDescription || '';
            form.elements.logo.value = brand.logo || '';
            form.elements.website.value = brand.website || '';
            form.elements.contactEmail.value = brand.contactEmail || '';
            form.elements.foundedYear.value = brand.foundedYear || '';
            form.elements.order.value = brand.order ?? 0;
            form.elements.status.value = brand.status || 'active';
            form.elements.featured.value = String(Boolean(brand.featured));
        },
        toPayload: (currentForm) => pruneEmptyValues({
            name: currentForm.elements.name.value.trim(),
            country: currentForm.elements.country.value.trim(),
            description: currentForm.elements.description.value.trim(),
            shortDescription: currentForm.elements.shortDescription.value.trim(),
            logo: currentForm.elements.logo.value.trim(),
            website: currentForm.elements.website.value.trim(),
            contactEmail: currentForm.elements.contactEmail.value.trim(),
            foundedYear: currentForm.elements.foundedYear.value ? Number(currentForm.elements.foundedYear.value) : undefined,
            order: Number(currentForm.elements.order.value || 0),
            status: currentForm.elements.status.value,
            featured: currentForm.elements.featured.value === 'true'
        }),
        renderItem: (brand) => buildRecordCard({
            thumb: brand.logo,
            title: brand.name,
            meta: [
                escapeHtml(brand.country || 'Chưa rõ quốc gia'),
                `Sản phẩm: ${brand.productCount || 0}`,
                `Thứ tự: ${brand.order ?? 0}`
            ],
            footerLeft: `
                ${toStatusBadge(brand.status, getToneForStatus(brand.status))}
                ${toStatusBadge(brand.featured ? 'Nổi bật' : 'Tiêu chuẩn', brand.featured ? 'success' : 'muted')}
            `,
            footerRight: `
                <button class="admin-btn-secondary" type="button" data-edit-id="${brand._id}">Sửa</button>
                <button class="admin-btn-ghost" type="button" data-delete-id="${brand._id}">Xóa</button>
            `
        })
    });
    await page.load();
};

const initOrders = async () => {
    const listRoot = qs('[data-admin-order-list]');
    const emptyRoot = qs('[data-admin-order-empty]');
    const paginationRoot = qs('[data-admin-order-pagination]');
    const filters = { page: 1, limit: 12, search: '', status: '', paymentStatus: '' };
    let orders = [];

    const load = async () => {
        renderSkeleton(listRoot, 4);
        const response = await orderService.list(toQueryString(filters));
        orders = ensureArray(response.data?.orders);
        emptyRoot.hidden = orders.length > 0;
        listRoot.innerHTML = orders.map((order) => buildRecordCard({
            title: order.orderNumber,
            meta: [
                escapeHtml(order.shippingAddress?.fullName || '-'),
                escapeHtml(order.shippingAddress?.phone || '-'),
                escapeHtml(order.shippingAddress?.email || '-'),
                formatDateTime(order.createdAt),
                `Tổng ${formatCurrency(order.totalAmount)}`
            ],
            footerLeft: `
                ${toStatusBadge(ORDER_STATUS_LABELS[order.orderStatus] || order.orderStatus, getToneForStatus(order.orderStatus))}
                ${toStatusBadge(PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus, getToneForStatus(order.paymentStatus))}
            `,
            footerRight: `
                <select data-order-status="${order.id}">
                    ${Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => `<option value="${value}" ${order.orderStatus === value ? 'selected' : ''}>${label}</option>`).join('')}
                </select>
                <select data-payment-status="${order.id}">
                    ${Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => `<option value="${value}" ${order.paymentStatus === value ? 'selected' : ''}>${label}</option>`).join('')}
                </select>
            `
        })).join('');
        renderPagination(paginationRoot, response.data?.pagination, (page) => {
            filters.page = page;
            load().catch((error) => showToast(error.message, 'error'));
        });
    };

    qs('[data-admin-order-search]')?.addEventListener('input', debounce((event) => {
        filters.search = event.target.value.trim();
        filters.page = 1;
        load().catch((error) => showToast(error.message, 'error'));
    }, 300));
    qs('[data-admin-order-status]')?.addEventListener('change', (event) => {
        filters.status = event.target.value;
        filters.page = 1;
        load().catch((error) => showToast(error.message, 'error'));
    });
    qs('[data-admin-payment-status]')?.addEventListener('change', (event) => {
        filters.paymentStatus = event.target.value;
        filters.page = 1;
        load().catch((error) => showToast(error.message, 'error'));
    });
    qs('[data-admin-order-refresh]')?.addEventListener('click', () => load().catch((error) => showToast(error.message, 'error')));

    listRoot?.addEventListener('change', async (event) => {
        const orderStatus = event.target.closest('[data-order-status]');
        if (orderStatus) {
            const order = orders.find((item) => item.id === orderStatus.dataset.orderStatus);
            const nextStatus = orderStatus.value;
            if (order?.orderStatus === 'cancelled' && nextStatus !== 'cancelled') {
                showToast('Đơn đã hủy không thể chuyển sang trạng thái khác.', 'error');
                orderStatus.value = order.orderStatus;
                return;
            }
            const confirmed = await openConfirmDialog({
                title: 'Cập nhật trạng thái đơn hàng',
                message: `Chuyển đơn ${order.orderNumber} sang "${ORDER_STATUS_LABELS[nextStatus]}"?`,
                confirmText: 'Cập nhật'
            });
            if (!confirmed) {
                orderStatus.value = order.orderStatus;
                return;
            }
            await orderService.updateStatus(order.id, nextStatus);
            showToast('Đã cập nhật trạng thái đơn hàng.');
            await load().catch((error) => showToast(error.message, 'error'));
            return;
        }
        const paymentStatus = event.target.closest('[data-payment-status]');
        if (paymentStatus) {
            const order = orders.find((item) => item.id === paymentStatus.dataset.paymentStatus);
            const confirmed = await openConfirmDialog({
                title: 'Cập nhật trạng thái thanh toán',
                message: `Chuyển thanh toán của đơn ${order.orderNumber} sang "${PAYMENT_STATUS_LABELS[paymentStatus.value]}"?`,
                confirmText: 'Cập nhật'
            });
            if (!confirmed) {
                paymentStatus.value = order.paymentStatus;
                return;
            }
            await orderService.updatePaymentStatus(order.id, paymentStatus.value);
            showToast('Đã cập nhật trạng thái thanh toán.');
            await load().catch((error) => showToast(error.message, 'error'));
        }
    });

    await load();
};

const initUsers = async () => {
    const form = qs('[data-user-form]');
    const page = makeCrudPage({
        listRootSelector: '[data-user-list]',
        emptyRootSelector: '[data-user-empty]',
        paginationRootSelector: '[data-user-pagination]',
        searchSelector: '[data-user-search]',
        refreshSelector: '[data-user-refresh]',
        formSelector: '[data-user-form]',
        resetSelector: '[data-user-reset]',
        getService: () => userService,
        listKey: 'users',
        canCreate: false,
        fillForm: (user) => {
            form.elements.id.value = user._id;
            form.elements.username.value = user.username || '';
            form.elements.email.value = user.email || '';
            form.elements.role.value = user.role || 'user';
            form.elements.isActive.value = String(user.isActive !== false);
            form.elements['profile.firstName'].value = user.profile?.firstName || '';
            form.elements['profile.lastName'].value = user.profile?.lastName || '';
            form.elements['profile.phone'].value = user.profile?.phone || '';
        },
        toPayload: (currentForm) => {
            const targetId = currentForm.elements.id.value;
            if (targetId === state.currentUser?._id && currentForm.elements.isActive.value === 'false') {
                throw new Error('Admin không thể tự khóa chính mình.');
            }
            return pruneEmptyValues({
                username: currentForm.elements.username.value.trim(),
                email: currentForm.elements.email.value.trim(),
                role: currentForm.elements.role.value,
                isActive: currentForm.elements.isActive.value === 'true',
                profile: {
                    firstName: currentForm.elements['profile.firstName'].value.trim(),
                    lastName: currentForm.elements['profile.lastName'].value.trim(),
                    phone: currentForm.elements['profile.phone'].value.trim()
                }
            });
        },
        renderItem: (user) => buildRecordCard({
            title: user.username,
            meta: [
                escapeHtml(user.email),
                escapeHtml(`${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim() || 'Chưa có hồ sơ'),
                `Tạo lúc ${formatDateTime(user.createdAt)}`,
                `Đăng nhập cuối ${formatDateTime(user.lastLogin)}`
            ],
            footerLeft: `
                ${toStatusBadge(user.role, user.role === 'admin' ? 'info' : 'muted')}
                ${toStatusBadge(user.isActive ? 'Hoạt động' : 'Tạm khóa', user.isActive ? 'success' : 'danger')}
            `,
            footerRight: `
                <button class="admin-btn-secondary" type="button" data-edit-id="${user._id}">Sửa</button>
                <button class="admin-btn-ghost" type="button" data-delete-id="${user._id}">Xóa</button>
            `
        }),
        onDeleteGuard: async (user, users) => {
            if (user._id === state.currentUser?._id) {
                return 'Admin không thể tự xóa chính mình.';
            }
            const adminCount = users.filter((entry) => entry.role === 'admin').length;
            if (user.role === 'admin' && adminCount <= 1) {
                return 'Không thể xóa admin cuối cùng.';
            }
            return '';
        }
    });
    await page.load();
};

const initEngagement = async () => {
    const contactList = qs('[data-contact-list]');
    const contactEmpty = qs('[data-contact-empty]');
    const subscriberList = qs('[data-subscriber-list]');
    const subscriberEmpty = qs('[data-subscriber-empty]');

    const loadContacts = async () => {
        renderSkeleton(contactList, 3);
        const response = await engagementService.contacts.list(toQueryString({
            limit: 20,
            search: qs('[data-contact-search]')?.value.trim(),
            status: qs('[data-contact-status]')?.value
        }));
        const messages = ensureArray(response.data?.messages);
        contactEmpty.hidden = messages.length > 0;
        contactList.innerHTML = messages.map((message) => buildRecordCard({
            title: message.name,
            meta: [escapeHtml(message.email), escapeHtml(message.subject), formatDateTime(message.createdAt)],
            footerLeft: `
                ${toStatusBadge(message.status, getToneForStatus(message.status))}
                <span class="helper">${escapeHtml(message.message)}</span>
            `,
            footerRight: `
                <select data-contact-update="${message._id}">
                    ${['new', 'reviewed', 'resolved'].map((status) => `<option value="${status}" ${message.status === status ? 'selected' : ''}>${status}</option>`).join('')}
                </select>
            `
        })).join('');
    };

    const loadSubscribers = async () => {
        renderSkeleton(subscriberList, 3);
        const response = await engagementService.newsletter.list(toQueryString({
            limit: 20,
            search: qs('[data-subscriber-search]')?.value.trim(),
            status: qs('[data-subscriber-status]')?.value
        }));
        const subscribers = ensureArray(response.data?.subscribers);
        subscriberEmpty.hidden = subscribers.length > 0;
        subscriberList.innerHTML = subscribers.map((subscriber) => buildRecordCard({
            title: subscriber.email,
            meta: [escapeHtml(subscriber.source || 'website'), formatDateTime(subscriber.createdAt)],
            footerLeft: `${toStatusBadge(subscriber.status, getToneForStatus(subscriber.status))}`,
            footerRight: `
                <select data-subscriber-update="${subscriber._id}">
                    ${['active', 'unsubscribed'].map((status) => `<option value="${status}" ${subscriber.status === status ? 'selected' : ''}>${status}</option>`).join('')}
                </select>
            `
        })).join('');
    };

    qs('[data-contact-search]')?.addEventListener('input', debounce(() => loadContacts().catch((error) => showToast(error.message, 'error')), 300));
    qs('[data-contact-status]')?.addEventListener('change', () => loadContacts().catch((error) => showToast(error.message, 'error')));
    qs('[data-contact-refresh]')?.addEventListener('click', () => loadContacts().catch((error) => showToast(error.message, 'error')));
    qs('[data-subscriber-search]')?.addEventListener('input', debounce(() => loadSubscribers().catch((error) => showToast(error.message, 'error')), 300));
    qs('[data-subscriber-status]')?.addEventListener('change', () => loadSubscribers().catch((error) => showToast(error.message, 'error')));
    qs('[data-subscriber-refresh]')?.addEventListener('click', () => loadSubscribers().catch((error) => showToast(error.message, 'error')));

    document.addEventListener('change', async (event) => {
        const contactTarget = event.target.closest('[data-contact-update]');
        if (contactTarget) {
            await engagementService.contacts.update(contactTarget.dataset.contactUpdate, { status: contactTarget.value });
            showToast('Đã cập nhật trạng thái liên hệ.');
            return;
        }
        const subscriberTarget = event.target.closest('[data-subscriber-update]');
        if (subscriberTarget) {
            await engagementService.newsletter.update(subscriberTarget.dataset.subscriberUpdate, { status: subscriberTarget.value });
            showToast('Đã cập nhật subscriber.');
        }
    });

    await Promise.all([loadContacts(), loadSubscribers()]);
};

const renderBannerPreview = () => {
    const form = qs('[data-banner-form]');
    const preview = qs('[data-banner-preview]');
    if (!form || !preview) return;

    const title = form.elements.title.value.trim() || 'Tieu de banner';
    const description = form.elements.description.value.trim() || 'Mo ta ngan cho chien dich hero trang chu.';
    const image = form.elements.image.value.trim();
    const buttonText = form.elements.buttonText.value.trim() || 'Mua ngay';

    if (!image) {
        preview.innerHTML = `
            <div class="empty-state">
                <strong>Chua co anh preview</strong>
                <p>Nhap URL anh hoac upload anh Cloudinary de xem banner truoc khi luu.</p>
            </div>
        `;
        return;
    }

    preview.innerHTML = `
        <div class="banner-preview__media">
            <img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" onerror="this.src='https://placehold.co/1200x520/F1F3FA/697489?text=Banner';">
            <div class="banner-preview__content">
                <strong>${escapeHtml(title)}</strong>
                <span>${escapeHtml(description)}</span>
                ${toStatusBadge(buttonText, 'warning')}
            </div>
        </div>
    `;
};

const resetBannerForm = () => {
    const form = qs('[data-banner-form]');
    if (!form) return;
    form.reset();
    form.elements.id.value = '';
    form.elements.status.value = 'active';
    form.elements.order.value = '0';
    renderBannerPreview();
};

const fillBannerForm = (banner) => {
    const form = qs('[data-banner-form]');
    if (!form) return;
    form.elements.id.value = banner._id;
    form.elements.title.value = banner.title || '';
    form.elements.description.value = banner.description || '';
    form.elements.image.value = banner.image || '';
    form.elements.mobileImage.value = banner.mobileImage || '';
    form.elements.buttonText.value = banner.buttonText || '';
    form.elements.buttonLink.value = banner.buttonLink || '';
    form.elements.status.value = banner.status || 'active';
    form.elements.order.value = banner.order ?? 0;
    renderBannerPreview();
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const collectBannerPayload = () => {
    const form = qs('[data-banner-form]');
    return pruneEmptyValues({
        title: form.elements.title.value.trim(),
        description: form.elements.description.value.trim(),
        image: form.elements.image.value.trim(),
        mobileImage: form.elements.mobileImage.value.trim(),
        buttonText: form.elements.buttonText.value.trim(),
        buttonLink: form.elements.buttonLink.value.trim() || '/category',
        status: form.elements.status.value,
        order: Number(form.elements.order.value || 0)
    });
};

const validateBannerPayload = (payload) => {
    const errors = [];
    if (!payload.title || payload.title.length < 2 || payload.title.length > 160) {
        errors.push('Tieu de banner phai tu 2-160 ky tu.');
    }
    if (!payload.image || !isValidUrl(payload.image)) {
        errors.push('Anh desktop phai la URL hop le.');
    }
    if (payload.mobileImage && !isValidUrl(payload.mobileImage)) {
        errors.push('Anh mobile phai la URL hop le.');
    }
    if (payload.buttonLink && !payload.buttonLink.startsWith('/') && !isValidUrl(payload.buttonLink)) {
        errors.push('Button link phai la URL hop le hoac duong dan noi bo bat dau bang /.');
    }
    if (Number(payload.order) < 0) {
        errors.push('Thu tu banner khong duoc am.');
    }
    return errors;
};

const initBanners = async () => {
    const listRoot = qs('[data-banner-list]');
    const emptyRoot = qs('[data-banner-empty]');
    const paginationRoot = qs('[data-banner-pagination]');
    const form = qs('[data-banner-form]');
    const filters = { page: 1, limit: 12, search: '', status: '' };

    const load = async () => {
        renderSkeleton(listRoot, 4);
        const response = await bannerService.list(toQueryString(filters));
        const banners = ensureArray(response.data?.banners);
        state.banners = banners;
        emptyRoot.hidden = banners.length > 0;
        listRoot.innerHTML = banners.map((banner) => buildRecordCard({
            thumb: banner.image,
            title: banner.title,
            meta: [
                escapeHtml(banner.description || 'Khong co mo ta'),
                `Thu tu: ${banner.order ?? 0}`,
                formatDateTime(banner.createdAt)
            ],
            footerLeft: `${toStatusBadge(banner.status === 'active' ? 'Dang hien' : 'Tam an', getToneForStatus(banner.status))}`,
            footerRight: `
                <button class="admin-btn-secondary" type="button" data-edit-banner="${banner._id}">Sua</button>
                <button class="admin-btn-ghost" type="button" data-toggle-banner="${banner._id}">${banner.status === 'active' ? 'An' : 'Hien'}</button>
                <button class="admin-btn-ghost" type="button" data-delete-banner="${banner._id}">Xoa</button>
            `
        })).join('');
        renderPagination(paginationRoot, response.data?.pagination, (page) => {
            filters.page = page;
            load().catch((error) => showToast(error.message, 'error'));
        });
    };

    resetBannerForm();
    await load();

    qs('[data-banner-search]')?.addEventListener('input', debounce((event) => {
        filters.search = event.target.value.trim();
        filters.page = 1;
        load().catch((error) => showToast(error.message, 'error'));
    }, 300));
    qs('[data-banner-status]')?.addEventListener('change', (event) => {
        filters.status = event.target.value;
        filters.page = 1;
        load().catch((error) => showToast(error.message, 'error'));
    });
    qs('[data-banner-refresh]')?.addEventListener('click', () => load().catch((error) => showToast(error.message, 'error')));
    qs('[data-banner-create-new]')?.addEventListener('click', resetBannerForm);
    qs('[data-banner-reset]')?.addEventListener('click', resetBannerForm);

    ['input', 'change'].forEach((eventName) => {
        form?.addEventListener(eventName, (event) => {
            if (event.target.closest('[data-banner-form]')) {
                renderBannerPreview();
            }
        });
    });

    qs('[data-banner-image-upload]')?.addEventListener('change', (event) => {
        const count = event.target.files?.length || 0;
        qs('[data-banner-upload-count]').textContent = count ? `Da chon ${count} anh.` : 'Chua chon file nao.';
    });

    const uploadBannerImage = async (targetFieldName) => {
        const input = qs('[data-banner-image-upload]');
        const file = input?.files?.[0];
        if (!file) {
            showToast('Hay chon anh truoc khi upload.', 'error');
            return;
        }
        if (!file.type.startsWith('image/')) {
            showToast('Chi chap nhan file hinh anh.', 'error');
            return;
        }
        setUploadBusy(1);
        try {
            qs('[data-banner-upload-count]').textContent = 'Dang upload anh banner...';
            const response = await uploadService.uploadAdminImage(file, 'banner-images');
            form.elements[targetFieldName].value = response.data?.url || '';
            input.value = '';
            qs('[data-banner-upload-count]').textContent = 'Upload thanh cong.';
            renderBannerPreview();
            showToast('Da upload anh banner.');
        } catch (error) {
            showToast(error.message || 'Upload anh banner that bai.', 'error');
        } finally {
            setUploadBusy(-1);
        }
    };

    qs('[data-banner-upload-trigger]')?.addEventListener('click', () => uploadBannerImage('image'));
    qs('[data-banner-upload-mobile-trigger]')?.addEventListener('click', () => uploadBannerImage('mobileImage'));

    listRoot?.addEventListener('click', async (event) => {
        const editButton = event.target.closest('[data-edit-banner]');
        if (editButton) {
            const banner = state.banners.find((item) => item._id === editButton.dataset.editBanner);
            if (banner) fillBannerForm(banner);
            return;
        }
        const toggleButton = event.target.closest('[data-toggle-banner]');
        if (toggleButton) {
            const banner = state.banners.find((item) => item._id === toggleButton.dataset.toggleBanner);
            if (!banner) return;
            const nextStatus = banner.status === 'active' ? 'inactive' : 'active';
            const confirmed = await openConfirmDialog({
                title: 'Cap nhat banner',
                message: `Chuyen banner "${banner.title}" sang trang thai ${nextStatus}?`,
                confirmText: 'Cap nhat'
            });
            if (!confirmed) return;
            await bannerService.update(banner._id, { ...banner, status: nextStatus });
            showToast('Da cap nhat banner.');
            await load();
            return;
        }
        const deleteButton = event.target.closest('[data-delete-banner]');
        if (deleteButton) {
            const banner = state.banners.find((item) => item._id === deleteButton.dataset.deleteBanner);
            if (!banner) return;
            const confirmed = await openConfirmDialog({
                title: 'Xoa banner',
                message: `Ban co chac muon xoa banner "${banner.title}"?`,
                confirmText: 'Xoa banner'
            });
            if (!confirmed) return;
            await bannerService.remove(banner._id);
            showToast('Da xoa banner.');
            resetBannerForm();
            await load();
        }
    });

    form?.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (state.uploadsInFlight > 0) {
            showToast('Doi upload anh hoan tat truoc khi luu.', 'error');
            return;
        }
        const payload = collectBannerPayload();
        const errors = validateBannerPayload(payload);
        if (errors.length) {
            showToast(errors[0], 'error');
            return;
        }
        Loading.show(form.elements.id.value ? 'Dang cap nhat banner...' : 'Dang tao banner...');
        try {
            const id = form.elements.id.value;
            await (id ? bannerService.update(id, payload) : bannerService.create(payload));
            showToast(id ? 'Da cap nhat banner.' : 'Da tao banner.');
            resetBannerForm();
            await load();
        } catch (error) {
            showToast(error.message || 'Khong the luu banner.', 'error');
        } finally {
            Loading.hide();
        }
    });
};

const initReviews = async () => {
    const listRoot = qs('[data-review-list]');
    const emptyRoot = qs('[data-review-empty]');
    const paginationRoot = qs('[data-review-pagination]');
    const filters = { page: 1, limit: 12, search: '', status: '', rating: '' };

    const renderStars = (rating) => `${'★'.repeat(Number(rating || 0))}${'☆'.repeat(Math.max(0, 5 - Number(rating || 0)))}`;

    const load = async () => {
        renderSkeleton(listRoot, 4);
        const response = await reviewService.list(toQueryString(filters));
        const reviews = ensureArray(response.data?.reviews);
        state.reviews = reviews;
        emptyRoot.hidden = reviews.length > 0;
        listRoot.innerHTML = reviews.map((review) => buildRecordCard({
            title: `${review.authorName || 'Khach hang'} - ${renderStars(review.rating)}`,
            meta: [
                escapeHtml(review.product?.name || 'San pham da xoa'),
                escapeHtml(review.user?.email || 'Khach vang lai'),
                formatDateTime(review.createdAt)
            ],
            footerLeft: `
                ${toStatusBadge(review.status === 'active' ? 'Dang hien' : 'Dang an', getToneForStatus(review.status))}
                <span class="helper">${escapeHtml(review.comment)}</span>
            `,
            footerRight: `
                <button class="admin-btn-secondary" type="button" data-toggle-review="${review._id}">${review.status === 'active' ? 'An' : 'Hien'}</button>
                <button class="admin-btn-ghost" type="button" data-delete-review="${review._id}">Xoa spam</button>
            `
        })).join('');
        renderPagination(paginationRoot, response.data?.pagination, (page) => {
            filters.page = page;
            load().catch((error) => showToast(error.message, 'error'));
        });
    };

    qs('[data-review-search]')?.addEventListener('input', debounce((event) => {
        filters.search = event.target.value.trim();
        filters.page = 1;
        load().catch((error) => showToast(error.message, 'error'));
    }, 300));
    qs('[data-review-status]')?.addEventListener('change', (event) => {
        filters.status = event.target.value;
        filters.page = 1;
        load().catch((error) => showToast(error.message, 'error'));
    });
    qs('[data-review-rating]')?.addEventListener('change', (event) => {
        filters.rating = event.target.value;
        filters.page = 1;
        load().catch((error) => showToast(error.message, 'error'));
    });
    qs('[data-review-refresh]')?.addEventListener('click', () => load().catch((error) => showToast(error.message, 'error')));

    listRoot?.addEventListener('click', async (event) => {
        const toggleButton = event.target.closest('[data-toggle-review]');
        if (toggleButton) {
            const review = state.reviews.find((item) => item._id === toggleButton.dataset.toggleReview);
            if (!review) return;
            const nextStatus = review.status === 'active' ? 'hidden' : 'active';
            const confirmed = await openConfirmDialog({
                title: 'Cap nhat danh gia',
                message: `Chuyen danh gia cua "${review.authorName}" sang trang thai ${nextStatus}?`,
                confirmText: 'Cap nhat'
            });
            if (!confirmed) return;
            await reviewService.update(review._id, { status: nextStatus });
            showToast('Da cap nhat danh gia.');
            await load();
            return;
        }
        const deleteButton = event.target.closest('[data-delete-review]');
        if (deleteButton) {
            const review = state.reviews.find((item) => item._id === deleteButton.dataset.deleteReview);
            if (!review) return;
            const confirmed = await openConfirmDialog({
                title: 'Xoa danh gia',
                message: `Xoa vinh vien danh gia cua "${review.authorName}"?`,
                confirmText: 'Xoa danh gia'
            });
            if (!confirmed) return;
            await reviewService.remove(review._id);
            showToast('Da xoa danh gia.');
            await load();
        }
    });

    await load();
};

const initPaymentSettings = () => {
    const preview = qs('[data-payment-preview]');
    const qrImage = qs('[data-payment-qr]');
    if (!preview || !qrImage) return;

    const buildQrUrl = () => {
        const bankCode = preview.dataset.bankCode;
        const accountNumber = preview.dataset.accountNumber;
        const template = preview.dataset.qrTemplate || 'compact2';
        if (!bankCode || !accountNumber) {
            return 'https://placehold.co/640x640/F1F3FA/697489?text=Chua+co+QR';
        }
        return `https://img.vietqr.io/image/${encodeURIComponent(bankCode)}-${encodeURIComponent(accountNumber)}-${encodeURIComponent(template)}.png?addInfo=${encodeURIComponent('THANH TOAN DON HANG SOUNDHOUSE')}`;
    };

    qrImage.src = buildQrUrl();
    qs('[data-test-qr]')?.addEventListener('click', () => {
        qrImage.src = `${buildQrUrl()}&t=${Date.now()}`;
        showToast('Đã làm mới QR mẫu.');
    });
    document.addEventListener('click', async (event) => {
        const button = event.target.closest('[data-copy-target]');
        if (!button) return;
        const source = qs(`[data-copy-source="${button.dataset.copyTarget}"]`);
        if (!source?.textContent) return;
        await navigator.clipboard.writeText(source.textContent.trim());
        showToast('Đã sao chép vào clipboard.');
    });
};

const boot = async () => {
    if (!pageRoot) return;
    attachGlobalApiGuards();
    attachShellInteractions();
    const admin = await ensureAdmin();
    if (!admin) return;

    const page = pageRoot.dataset.adminPage;
    try {
        if (page === 'dashboard') await initDashboard();
        if (page === 'products') await initProducts();
        if (page === 'categories') await initCategories();
        if (page === 'brands') await initBrands();
        if (page === 'orders') await initOrders();
        if (page === 'users') await initUsers();
        if (page === 'engagement') await initEngagement();
        if (page === 'banners') await initBanners();
        if (page === 'reviews') await initReviews();
        if (page === 'payment-settings') initPaymentSettings();
    } catch (error) {
        showToast(error.message || 'Không thể khởi tạo trang admin.', 'error');
        pageRoot.innerHTML = `<div class="error-state"><strong>Khởi tạo trang thất bại</strong><p>${escapeHtml(error.message || 'Vui lòng thử lại.')}</p></div>`;
    }
};

boot();
