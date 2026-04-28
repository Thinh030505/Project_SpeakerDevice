import { API, AuthStorage } from './api.js?v=20260428-5';

export const authService = {
    profile: () => API.users.profile(),
    logout: () => AuthStorage.logout(),
    getAccessToken: () => AuthStorage.getAccessToken(),
    clear: () => AuthStorage.clear()
};

export const dashboardService = {
    summary: () => API.admin.dashboard()
};

export const productService = {
    list: (query = '') => API.products.list(query),
    create: (payload) => API.products.create(payload),
    update: (id, payload) => API.products.update(id, payload),
    remove: (id) => API.products.remove(id)
};

export const categoryService = {
    list: (query = '') => API.categories.list(query),
    create: (payload) => API.categories.create(payload),
    update: (id, payload) => API.categories.update(id, payload),
    remove: (id) => API.categories.remove(id)
};

export const brandService = {
    list: (query = '') => API.brands.list(query),
    create: (payload) => API.brands.create(payload),
    update: (id, payload) => API.brands.update(id, payload),
    remove: (id) => API.brands.remove(id)
};

export const orderService = {
    list: (query = '') => API.orders.adminList(query),
    updateStatus: (id, orderStatus) => API.orders.updateStatus(id, orderStatus),
    updatePaymentStatus: (id, paymentStatus) => API.orders.updatePayment(id, paymentStatus)
};

export const userService = {
    list: (query = '') => API.admin.users.list(query),
    update: (id, payload) => API.admin.users.update(id, payload),
    remove: (id) => API.admin.users.remove(id)
};

export const uploadService = {
    uploadProductImage: (file) => API.products.uploadImage(file),
    uploadAdminImage: (file, folder = 'admin-images') => API.admin.uploadImage(file, folder)
};

export const bannerService = {
    list: (query = '') => API.admin.banners.list(query),
    create: (payload) => API.admin.banners.create(payload),
    update: (id, payload) => API.admin.banners.update(id, payload),
    remove: (id) => API.admin.banners.remove(id)
};

export const reviewService = {
    list: (query = '') => API.admin.reviews.list(query),
    update: (id, payload) => API.admin.reviews.update(id, payload),
    remove: (id) => API.admin.reviews.remove(id)
};

export const engagementService = {
    contacts: {
      list: (query = '') => API.admin.engagement.contacts.list(query),
      update: (id, payload) => API.admin.engagement.contacts.update(id, payload)
    },
    newsletter: {
      list: (query = '') => API.admin.engagement.newsletter.list(query),
      update: (id, payload) => API.admin.engagement.newsletter.update(id, payload)
    }
};
