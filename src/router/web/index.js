import express from 'express';
import {
    renderAdminBrandsPage,
    renderAdminBannersPage,
    renderAdminCategoriesPage,
    renderAdminDashboardPage,
    renderAdminEngagementPage,
    renderAccountAddressesPage,
    renderAccountOrdersPage,
    renderAccountProfilePage,
    renderAdminOrdersPage,
    renderAdminPaymentSettingsPage,
    renderAdminProductsPage,
    renderAdminReviewsPage,
    renderAdminUsersPage,
    renderCartPage,
    renderCategoryPage,
    renderCheckoutPage,
    renderContactFaqPage,
    renderForgotPasswordPage,
    renderHomePage,
    renderLoginPage,
    renderProductDetailPage,
    renderRegisterPage,
    renderResetPasswordPage
} from '../../controllers/client/index.js';

const router = express.Router();

router.get('/admin', renderAdminDashboardPage);
router.get('/admin/orders', renderAdminOrdersPage);
router.get('/admin/products', renderAdminProductsPage);
router.get('/admin/categories', renderAdminCategoriesPage);
router.get('/admin/brands', renderAdminBrandsPage);
router.get('/admin/users', renderAdminUsersPage);
router.get('/admin/engagement', renderAdminEngagementPage);
router.get('/admin/banners', renderAdminBannersPage);
router.get('/admin/reviews', renderAdminReviewsPage);
router.get('/admin/payment-settings', renderAdminPaymentSettingsPage);

router.get('/', renderHomePage);
router.get('/account', renderAccountProfilePage);
router.get('/account/addresses', renderAccountAddressesPage);
router.get('/account/orders', renderAccountOrdersPage);
router.get('/cart', renderCartPage);
router.get('/category', renderCategoryPage);
router.get('/category/:slug', renderCategoryPage);
router.get('/categories/:slug', renderCategoryPage);
router.get('/checkout', renderCheckoutPage);
router.get('/contact-faq', renderContactFaqPage);
router.get('/faq', renderContactFaqPage);
router.get('/forgot-password', renderForgotPasswordPage);
router.get('/login', renderLoginPage);
router.get('/product-detail', renderProductDetailPage);
router.get('/product-detail/:slug', renderProductDetailPage);
router.get('/products/:slug', renderProductDetailPage);
router.get('/register', renderRegisterPage);
router.get('/reset-password', renderResetPasswordPage);

export default router;
