import nodemailer from 'nodemailer'

function getTransporter() {
  const host = process.env.SMTP_HOST!
  const port = Number(process.env.SMTP_PORT || 587)
  const user = process.env.SMTP_USER!
  const pass = process.env.SMTP_PASS!

  // Gmail: 587 (STARTTLS) -> secure:false; 465 (SSL/TLS) -> secure:true
  const secure = port === 465

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: { minVersion: 'TLSv1.2' },
  })
}

async function sendMailBase(to: string, subject: string, html: string) {
  const from = `"NESI" <${process.env.SUPPORT_EMAIL || process.env.SMTP_USER}>`
  const transporter = getTransporter()

  // Проверим соединение заранее, чтобы получить понятную ошибку
  try {
    await transporter.verify()
  } catch (e) {
    console.error('❌ SMTP verify error:', e)
    throw new Error('SMTP connection/verify failed')
  }

  try {
    await transporter.sendMail({ from, to, subject, html })
  } catch (e) {
    console.error('❌ SMTP sendMail error:', e)
    throw new Error('SMTP send failed')
  }
}

/** 💚 Подтверждение e-mail */
export async function sendVerificationEmail(to: string, link: string) {
  const html = `
  <div style="background-color:#0a0a0a;padding:40px 0;font-family:Arial,sans-serif;">
    <div style="max-width:600px;margin:auto;background-color:#111;border-radius:10px;padding:30px;border:1px solid #1f2937;">
      <h1 style="color:#22c55e;text-align:center;margin-bottom:10px;">NESI</h1>
      <h2 style="color:#e5e7eb;text-align:center;margin-bottom:30px;">Подтверждение электронной почты</h2>
      <p style="color:#d1d5db;font-size:15px;line-height:1.6;text-align:center;">
        Спасибо за регистрацию в <strong>NESI</strong>! Подтвердите ваш e-mail, нажав кнопку ниже:
      </p>
      <div style="text-align:center;margin:40px 0;">
        <a href="${link}" style="background-color:#22c55e;color:#000;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:bold;font-size:16px;display:inline-block;">
          Подтвердить e-mail
        </a>
      </div>
      <p style="color:#9ca3af;font-size:13px;text-align:center;">
        Если вы не регистрировались — просто проигнорируйте это письмо.
      </p>
      <hr style="border:none;border-top:1px solid #1f2937;margin:30px 0;" />
      <p style="color:#4b5563;font-size:12px;text-align:center;">
        Команда <strong>NESI</strong> · <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="color:#22c55e;text-decoration:none;">nesi</a>
      </p>
    </div>
  </div>`
  await sendMailBase(to, 'Подтверждение регистрации NESI', html)
}

/** 🔐 Сброс пароля */
export async function sendResetPasswordEmail(to: string, link: string) {
  const html = `
  <div style="background-color:#0a0a0a;padding:40px 0;font-family:Arial,sans-serif;">
    <div style="max-width:600px;margin:auto;background-color:#111;border-radius:10px;padding:30px;border:1px solid #1f2937;">
      <h1 style="color:#22c55e;text-align:center;margin-bottom:10px;">NESI</h1>
      <h2 style="color:#e5e7eb;text-align:center;margin-bottom:30px;">Сброс пароля</h2>
      <p style="color:#d1d5db;font-size:15px;line-height:1.6;text-align:center;">
        Вы запросили сброс пароля. Нажмите кнопку ниже, чтобы создать новый:
      </p>
      <div style="text-align:center;margin:40px 0;">
        <a href="${link}" style="background-color:#22c55e;color:#000;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:bold;font-size:16px;display:inline-block;">
          Сбросить пароль
        </a>
      </div>
      <p style="color:#9ca3af;font-size:13px;text-align:center;">
        Если вы не запрашивали восстановление — проигнорируйте это письмо.
      </p>
      <hr style="border:none;border-top:1px solid #1f2937;margin:30px 0;" />
      <p style="color:#4b5563;font-size:12px;text-align:center;">
        Команда <strong>NESI</strong> · <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="color:#22c55e;text-decoration:none;">nesi</a>
      </p>
    </div>
  </div>`
  await sendMailBase(to, 'Сброс пароля NESI', html)
}
