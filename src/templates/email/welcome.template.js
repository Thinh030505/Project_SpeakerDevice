/**
 * Template HTML chào mừng sau đăng ký
 * @param {Object} options
 * @param {string} options.username  - Tên người dùng
 * @param {string} options.appName   - Tên ứng dụng
 * @param {string} [options.loginUrl] - URL trang đăng nhập
 * @returns {string} HTML string
 */
const welcomeTemplate = ({ username, appName, loginUrl = '#' }) => `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Chào mừng đến với ${appName}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4F46E5 0%,#7C3AED 100%);padding:40px;text-align:center;">
              <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:8px;padding:8px 20px;margin-bottom:16px;">
                <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:1px;">${appName}</span>
              </div>
              <div style="font-size:48px;margin:8px 0;">🎉</div>
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;">Chào mừng bạn!</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h2 style="margin:0 0 12px;color:#111827;font-size:20px;font-weight:700;">
                Xin chào, <span style="color:#4F46E5;">${username}</span>! 👋
              </h2>
              <p style="margin:0 0 20px;color:#6b7280;font-size:15px;line-height:1.7;">
                Tài khoản của bạn đã được tạo thành công trên <strong>${appName}</strong>.
                Chúng tôi rất vui khi có bạn đồng hành!
              </p>

              <!-- Features -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="padding:12px;background:#f0f0ff;border-radius:8px;margin-bottom:8px;">
                    <span style="font-size:18px;">🛍️</span>
                    <span style="color:#374151;font-size:14px;margin-left:8px;">Khám phá hàng nghìn sản phẩm chất lượng</span>
                  </td>
                </tr>
                <tr><td style="height:8px;"></td></tr>
                <tr>
                  <td style="padding:12px;background:#f0f0ff;border-radius:8px;margin-bottom:8px;">
                    <span style="font-size:18px;">🔒</span>
                    <span style="color:#374151;font-size:14px;margin-left:8px;">Thanh toán an toàn, bảo mật tuyệt đối</span>
                  </td>
                </tr>
                <tr><td style="height:8px;"></td></tr>
                <tr>
                  <td style="padding:12px;background:#f0f0ff;border-radius:8px;">
                    <span style="font-size:18px;">🚚</span>
                    <span style="color:#374151;font-size:14px;margin-left:8px;">Giao hàng nhanh chóng toàn quốc</span>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <div style="text-align:center;margin-bottom:24px;">
                <a href="${loginUrl}"
                   style="display:inline-block;background:#4F46E5;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:600;letter-spacing:0.3px;">
                  Bắt đầu mua sắm →
                </a>
              </div>

              <p style="margin:0;color:#9ca3af;font-size:13px;text-align:center;">
                Nếu bạn không tạo tài khoản này, vui lòng bỏ qua email này.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:13px;">
                © ${new Date().getFullYear()} ${appName}. Mọi quyền được bảo lưu.
              </p>
              <p style="margin:6px 0 0;color:#9ca3af;font-size:12px;">
                Email này được gửi tự động, vui lòng không trả lời.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

export default welcomeTemplate;
