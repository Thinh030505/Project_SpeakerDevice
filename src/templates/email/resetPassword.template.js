/**
 * Template HTML gui ma khoi phuc mat khau
 * @param {Object} options
 * @param {string} options.username
 * @param {string} options.resetCode
 * @param {string} options.appName
 * @param {number} [options.expireMin]
 * @returns {string}
 */
const resetPasswordTemplate = ({ username, resetCode, appName, expireMin = 15 }) => `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Mã khôi phục mật khẩu</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#4F46E5;padding:32px 40px;text-align:center;">
              <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:8px;padding:8px 20px;margin-bottom:12px;">
                <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:1px;">${appName}</span>
              </div>
              <div style="font-size:40px;">🔐</div>
            </td>
          </tr>

          <tr>
            <td style="padding:40px 40px 32px;">
              <h2 style="margin:0 0 12px;color:#111827;font-size:22px;font-weight:700;">Mã khôi phục mật khẩu</h2>
              <p style="margin:0 0 20px;color:#6b7280;font-size:15px;line-height:1.7;">
                Xin chào <strong style="color:#111827;">${username}</strong>,
              </p>
              <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.7;">
                Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.
                Hãy nhập mã khôi phục bên dưới vào trang đặt lại mật khẩu.
                Mã có hiệu lực trong <strong style="color:#111827;">${expireMin} phút</strong>.
              </p>

              <div style="margin:0 0 28px;text-align:center;">
                <div style="display:inline-block;padding:16px 28px;border-radius:12px;background:#eef2ff;border:1px solid #c7d2fe;">
                  <span style="display:block;color:#312e81;font-size:32px;font-weight:700;letter-spacing:8px;">${resetCode}</span>
                </div>
              </div>

              <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:24px;">
                <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">
                  Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.
                  Mật khẩu hiện tại của bạn sẽ không thay đổi.
                </p>
              </div>

              <div style="background:#fff7ed;border-left:4px solid #f97316;border-radius:4px;padding:14px 16px;">
                <p style="margin:0;color:#92400e;font-size:14px;line-height:1.6;">
                  Vì lý do bảo mật, vui lòng không chia sẻ mã này với bất kỳ ai.
                </p>
              </div>
            </td>
          </tr>

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

export default resetPasswordTemplate;
