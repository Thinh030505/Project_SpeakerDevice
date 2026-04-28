/**
 * Template HTML gửi mã OTP
 * @param {Object} options
 * @param {string} options.otp          - Mã OTP 6 số
 * @param {string} options.appName      - Tên ứng dụng
 * @param {number} [options.expireMin]  - Thời gian hết hạn (phút), mặc định 5
 * @returns {string} HTML string
 */
const otpTemplate = ({ otp, appName, expireMin = 5 }) => `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Mã xác thực OTP</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#4F46E5;padding:32px 40px;text-align:center;">
              <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:8px;padding:8px 20px;">
                <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:1px;">${appName}</span>
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h2 style="margin:0 0 12px;color:#111827;font-size:22px;font-weight:700;">Mã xác thực của bạn</h2>
              <p style="margin:0 0 28px;color:#6b7280;font-size:15px;line-height:1.6;">
                Sử dụng mã OTP bên dưới để xác thực tài khoản. Mã có hiệu lực trong
                <strong style="color:#111827;">${expireMin} phút</strong>.
              </p>

              <!-- OTP Box -->
              <div style="background:#f0f0ff;border:2px dashed #4F46E5;border-radius:10px;padding:24px;text-align:center;margin-bottom:28px;">
                <span style="font-size:42px;font-weight:800;letter-spacing:12px;color:#4F46E5;font-family:'Courier New',monospace;">${otp}</span>
              </div>

              <p style="margin:0 0 8px;color:#6b7280;font-size:14px;">⚠️ Lưu ý quan trọng:</p>
              <ul style="margin:0 0 24px;padding-left:20px;color:#6b7280;font-size:14px;line-height:1.8;">
                <li>Không chia sẻ mã này với bất kỳ ai.</li>
                <li>Mã sẽ hết hạn sau <strong>${expireMin} phút</strong>.</li>
                <li>Nếu bạn không yêu cầu mã này, hãy bỏ qua email này.</li>
              </ul>
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

export default otpTemplate;
