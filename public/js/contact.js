import { API } from './api.js';

const showToast = (message) => {
    const toast = document.getElementById('cf-toast');
    if (!toast) {
        return;
    }

    toast.textContent = message;
    toast.classList.add('cf-toast-on');
    window.setTimeout(() => {
        toast.classList.remove('cf-toast-on');
    }, 3200);
};

const initContactForm = () => {
    const form = document.getElementById('cf-form');
    const submitButton = form?.querySelector('button[type="submit"]');
    if (!form) {
        return;
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const name = String(formData.get('name') || '').trim();
        const email = String(formData.get('email') || '').trim();
        const subject = String(formData.get('subject') || '').trim();
        const message = String(formData.get('message') || '').trim();

        if (!name || !email || !subject || !message) {
            showToast('Vui lòng điền đủ họ tên, email, chủ đề và nội dung.');
            return;
        }

        if (submitButton) {
            submitButton.disabled = true;
        }

        try {
            const response = await API.engagement.contact({
                name,
                email,
                subject,
                message
            });
            showToast(response.message || 'Đã ghi nhận yêu cầu. Chúng tôi sẽ liên hệ lại sớm.');
            form.reset();
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
            }
        }
    });
};

const initMapButton = () => {
    const mapButton = document.querySelector('[data-maps]');
    if (!mapButton) {
        return;
    }

    mapButton.addEventListener('click', () => {
        window.open('https://www.google.com/maps/search/?api=1&query=123+Sound+Street+Ho+Chi+Minh+City', '_blank', 'noopener');
    });
};

const initHeaderSearch = () => {
    const input = document.querySelector('.cf-sin');
    const button = document.querySelector('.cf-sgo');
    if (!input || !button) {
        return;
    }

    const submitSearch = () => {
        const keyword = input.value.trim();
        const target = keyword ? `/category?search=${encodeURIComponent(keyword)}` : '/category';
        window.location.href = target;
    };

    button.addEventListener('click', submitSearch);
    input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            submitSearch();
        }
    });
};

const initFaqAccordion = () => {
    document.querySelectorAll('details.cf-acc-item').forEach((item) => {
        item.addEventListener('toggle', () => {
            if (!item.open) {
                return;
            }

            document.querySelectorAll('details.cf-acc-item').forEach((otherItem) => {
                if (otherItem !== item) {
                    otherItem.open = false;
                }
            });
        });
    });
};

const initContactActions = () => {
    document.querySelector('[data-contact-zalo], .cf-cta-zalo')?.addEventListener('click', () => {
        window.open('https://zalo.me/', '_blank', 'noopener');
    });

    document.querySelector('[data-contact-call], .cf-cta-call')?.addEventListener('click', () => {
        window.location.href = 'tel:19008888';
    });
};

initContactForm();
initMapButton();
initHeaderSearch();
initFaqAccordion();
initContactActions();
