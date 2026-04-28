import { escapeHtml, setButtonLoading } from './utils.js';

const cleanToken = (value) => String(value || '').replace(/[\r\n\t]/g, '').trim();
const parseJson = async (response) => response.json().catch(() => ({}));
const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

const getApiErrorMessage = (data, fallback) => {
    const firstFieldError = Array.isArray(data?.errors) && data.errors.length
        ? data.errors[0]?.message
        : '';
    return firstFieldError || data?.message || fallback || 'Đã có lỗi xảy ra. Vui lòng thử lại.';
};

const setError = (element, message) => {
    if (!element) return;
    element.textContent = message || '';
    element.classList.toggle('is-on', Boolean(message));
};

const storeTokens = (data) => {
    const accessToken = cleanToken(data?.data?.accessToken);
    const refreshToken = cleanToken(data?.data?.refreshToken);
    if (accessToken) {
        window.localStorage.setItem('accessToken', accessToken);
    }
    if (refreshToken) {
        window.localStorage.setItem('refreshToken', refreshToken);
    }
};

const postJson = async (url, payload) => {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
        },
        body: JSON.stringify(payload)
    });
    const data = await parseJson(response);
    if (!response.ok) {
        throw new Error(getApiErrorMessage(data, 'Không thể xử lý yêu cầu.'));
    }
    return data;
};

const initLoginForm = () => {
    const form = document.getElementById('form-login');
    const errorBox = document.getElementById('auth-err');
    const button = document.getElementById('btn-login');
    if (!form || !button) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get('message') === 'reset-success') {
        setError(errorBox, 'Mật khẩu đã được đặt lại. Bạn có thể đăng nhập ngay.');
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (button.disabled) return;
        if (params.get('message') !== 'reset-success') {
            setError(errorBox, '');
        }

        const formData = new FormData(form);
        const payload = {
            username: String(formData.get('username') || '').trim(),
            password: String(formData.get('password') || '')
        };

        if (!payload.username || !payload.password) {
            setError(errorBox, 'Vui lòng nhập tài khoản và mật khẩu.');
            return;
        }

        setButtonLoading(button, true, 'Đang đăng nhập...');
        try {
            const data = await postJson('/api/auth/login', payload);
            storeTokens(data);
            window.location.href = params.get('next') || '/';
        } catch (error) {
            setError(errorBox, error.message || 'Đăng nhập thất bại.');
        } finally {
            setButtonLoading(button, false);
        }
    });
};

const initRegisterForm = () => {
    const form = document.getElementById('form-register');
    const errorBox = document.getElementById('auth-err');
    const button = document.getElementById('btn-reg');
    if (!form || !button) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (button.disabled) return;
        setError(errorBox, '');

        const formData = new FormData(form);
        const payload = {
            username: String(formData.get('username') || '').trim(),
            email: String(formData.get('email') || '').trim(),
            password: String(formData.get('password') || ''),
            passwordConfirm: String(formData.get('passwordConfirm') || '')
        };

        if (!/^[a-zA-Z0-9_]{3,30}$/.test(payload.username)) {
            setError(errorBox, 'Tên đăng nhập phải từ 3 đến 30 ký tự và chỉ gồm chữ, số, dấu gạch dưới.');
            return;
        }
        if (!isEmail(payload.email)) {
            setError(errorBox, 'Vui lòng nhập email hợp lệ.');
            return;
        }
        if (payload.password.length < 6) {
            setError(errorBox, 'Mật khẩu phải có ít nhất 6 ký tự.');
            return;
        }
        if (payload.password !== payload.passwordConfirm) {
            setError(errorBox, 'Mật khẩu xác nhận không khớp.');
            return;
        }
        if (!form.querySelector('#terms')?.checked) {
            setError(errorBox, 'Bạn cần đồng ý Điều khoản và Chính sách trước khi đăng ký.');
            return;
        }

        setButtonLoading(button, true, 'Đang đăng ký...');
        try {
            const data = await postJson('/api/auth/register', payload);
            storeTokens(data);
            window.location.href = '/';
        } catch (error) {
            setError(errorBox, error.message || 'Đăng ký thất bại.');
        } finally {
            setButtonLoading(button, false);
        }
    });
};

const renderAlert = (container, message, type) => {
    if (!container) return;
    container.innerHTML = `
        <div role="alert" style="
            padding:12px 14px;
            border-radius:10px;
            border:1px solid ${type === 'success' ? 'rgba(52,211,153,0.35)' : 'rgba(248,113,113,0.35)'};
            background:${type === 'success' ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)'};
            color:${type === 'success' ? '#d1fae5' : '#fecaca'};
            font-size:13px;
            line-height:1.5;
        ">
            ${escapeHtml(message)}
        </div>
    `;
};

const initForgotPasswordForm = () => {
    const form = document.getElementById('forgotPasswordForm');
    const container = document.getElementById('alert-container');
    const button = document.getElementById('submitBtn');
    if (!form || !button) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (button.disabled) return;

        const email = String(document.getElementById('email')?.value || '').trim();
        if (!isEmail(email)) {
            renderAlert(container, 'Vui lòng nhập email hợp lệ.', 'danger');
            return;
        }

        setButtonLoading(button, true, 'Đang gửi...');
        try {
            const data = await postJson('/api/auth/forgot-password', { email });
            renderAlert(
                container,
                data.message || 'Nếu email tồn tại trong hệ thống, chúng tôi đã gửi mã khôi phục mật khẩu.',
                'success'
            );
            window.setTimeout(() => {
                window.location.href = `/reset-password?email=${encodeURIComponent(email)}`;
            }, 1200);
        } catch (error) {
            renderAlert(container, error.message || 'Có lỗi xảy ra. Vui lòng thử lại.', 'danger');
        } finally {
            setButtonLoading(button, false);
        }
    });
};

const initResetPasswordForm = () => {
    const form = document.getElementById('resetPasswordForm');
    const container = document.getElementById('alert-container');
    const button = document.getElementById('submitBtn');
    const tokenInput = document.getElementById('resetToken');
    const emailInput = document.getElementById('resetEmail');
    const codeInput = document.getElementById('resetCode');
    if (!form || !button || !emailInput || !codeInput) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (button.disabled) return;

        const email = String(emailInput.value || '').trim();
        const code = String(codeInput.value || '').trim();
        const password = String(document.getElementById('password')?.value || '');
        const passwordConfirm = String(document.getElementById('passwordConfirm')?.value || '');

        if (!isEmail(email)) {
            renderAlert(container, 'Vui lòng nhập email hợp lệ.', 'danger');
            return;
        }
        if (!/^\d{6}$/.test(code)) {
            renderAlert(container, 'Mã khôi phục phải gồm đúng 6 chữ số.', 'danger');
            return;
        }
        if (password.length < 6) {
            renderAlert(container, 'Mật khẩu phải có ít nhất 6 ký tự.', 'danger');
            return;
        }
        if (password !== passwordConfirm) {
            renderAlert(container, 'Mật khẩu và xác nhận mật khẩu không khớp.', 'danger');
            return;
        }

        const payload = { email, code, password, passwordConfirm };
        if (tokenInput?.value) {
            payload.token = cleanToken(tokenInput.value);
        }

        setButtonLoading(button, true, 'Đang đặt lại...');
        try {
            await postJson('/api/auth/reset-password', payload);
            renderAlert(container, 'Đặt lại mật khẩu thành công. Đang chuyển hướng...', 'success');
            window.setTimeout(() => {
                window.location.href = '/login?message=reset-success';
            }, 1500);
        } catch (error) {
            renderAlert(container, error.message || 'Có lỗi xảy ra khi đặt lại mật khẩu.', 'danger');
        } finally {
            setButtonLoading(button, false);
        }
    });
};

const initSocialButtons = () => {
    document.querySelectorAll('.auth-soc-btn').forEach((button) => {
        button.addEventListener('click', () => {
            setError(
                document.getElementById('auth-err'),
                'Đăng nhập bằng mạng xã hội đang được cập nhật. Vui lòng dùng tài khoản SoundHouse hiện tại.'
            );
        });
    });
};

initLoginForm();
initRegisterForm();
initForgotPasswordForm();
initResetPasswordForm();
initSocialButtons();
