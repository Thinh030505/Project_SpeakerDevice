import { API } from './api.js';
import { Loading, flashButtonSuccess, setButtonLoading, showToast } from './utils.js';

const initHeroSlider = () => {
    const stage = document.querySelector('[data-hero-stage]');
    const slides = Array.from(document.querySelectorAll('[data-hero-slide]'));
    const dots = Array.from(document.querySelectorAll('[data-hero-dot]'));
    const prevButton = document.querySelector('[data-hero-prev]');
    const nextButton = document.querySelector('[data-hero-next]');

    if (!stage || slides.length <= 1) {
        return;
    }

    let activeIndex = 0;
    let autoplayId = null;
    let touchStartX = 0;
    let touchDeltaX = 0;

    const render = (nextIndex) => {
        activeIndex = (nextIndex + slides.length) % slides.length;

        slides.forEach((slide, index) => {
            const isActive = index === activeIndex;
            slide.classList.toggle('is-active', isActive);
            slide.setAttribute('aria-hidden', String(!isActive));
        });

        dots.forEach((dot, index) => {
            dot.classList.toggle('is-active', index === activeIndex);
            dot.setAttribute('aria-current', index === activeIndex ? 'true' : 'false');
        });
    };

    const stopAutoplay = () => {
        if (autoplayId) {
            window.clearInterval(autoplayId);
            autoplayId = null;
        }
    };

    const startAutoplay = () => {
        stopAutoplay();
        autoplayId = window.setInterval(() => {
            render(activeIndex + 1);
        }, 5200);
    };

    prevButton?.addEventListener('click', () => {
        render(activeIndex - 1);
        startAutoplay();
    });

    nextButton?.addEventListener('click', () => {
        render(activeIndex + 1);
        startAutoplay();
    });

    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            render(index);
            startAutoplay();
        });
    });

    stage.addEventListener('mouseenter', stopAutoplay);
    stage.addEventListener('mouseleave', startAutoplay);
    stage.addEventListener('focusin', stopAutoplay);
    stage.addEventListener('focusout', startAutoplay);

    stage.addEventListener('touchstart', (event) => {
        touchStartX = event.touches[0]?.clientX || 0;
        touchDeltaX = 0;
        stopAutoplay();
    }, { passive: true });

    stage.addEventListener('touchmove', (event) => {
        const currentX = event.touches[0]?.clientX || 0;
        touchDeltaX = currentX - touchStartX;
    }, { passive: true });

    stage.addEventListener('touchend', () => {
        if (Math.abs(touchDeltaX) > 45) {
            render(activeIndex + (touchDeltaX < 0 ? 1 : -1));
        }
        startAutoplay();
    });

    stage.addEventListener('mousemove', (event) => {
        const rect = stage.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        stage.style.setProperty('--hero-shift-x', `${x * 12}px`);
        stage.style.setProperty('--hero-shift-y', `${y * 12}px`);
    });

    stage.addEventListener('mouseleave', () => {
        stage.style.setProperty('--hero-shift-x', '0px');
        stage.style.setProperty('--hero-shift-y', '0px');
    });

    render(0);
    startAutoplay();
};

const initTrendRail = () => {
    const viewport = document.querySelector('[data-trend-viewport]');
    const prevButton = document.querySelector('[data-trend-prev]');
    const nextButton = document.querySelector('[data-trend-next]');

    if (!viewport) {
        return;
    }

    const scrollByAmount = () => Math.max(viewport.clientWidth * 0.82, 280);

    prevButton?.addEventListener('click', () => {
        viewport.scrollBy({ left: -scrollByAmount(), behavior: 'smooth' });
    });

    nextButton?.addEventListener('click', () => {
        viewport.scrollBy({ left: scrollByAmount(), behavior: 'smooth' });
    });
};

const initCartButtons = () => {
    document.addEventListener('click', async (event) => {
        const addButton = event.target.closest('[data-home-add-cart]');
        if (!addButton || addButton.disabled) {
            return;
        }

        setButtonLoading(addButton, true, 'Đang thêm...');
        try {
            await API.cart.add({
                productId: addButton.dataset.productId,
                variantId: addButton.dataset.variantId,
                quantity: 1
            });
            window.SoundHouse?.updateCartCount?.();
            flashButtonSuccess(addButton);
            showToast('Đã thêm sản phẩm vào giỏ hàng.');
        } catch (error) {
            setButtonLoading(addButton, false);
            showToast(error.message, 'error');
        }
    });
};

const initNewsletterForm = () => {
    document.querySelector('[data-newsletter-form]')?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const button = form.querySelector('button[type="submit"]');
        const email = String(new FormData(form).get('email') || '').trim();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showToast('Vui lòng nhập email hợp lệ.', 'error');
            return;
        }

        setButtonLoading(button, true, 'Đang lưu...');
        Loading.show('Đang lưu email của bạn...');
        try {
            const response = await API.engagement.newsletter({ email });
            form.reset();
            showToast(response.message || 'Đăng ký nhận tin thành công.');
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setButtonLoading(button, false);
            Loading.hide();
        }
    });
};

initHeroSlider();
initTrendRail();
initCartButtons();
initNewsletterForm();
