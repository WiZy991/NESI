import nodemailer from 'nodemailer'

/**
 * 📧 Отправка письма для сброса пароля (в стиле NESI)
 */
export async function sendResetPasswordEmail(to: string, link: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  const html = `
  <div style="background-color:#0a0a0a;padding:40px 0;font-family:Arial,sans-serif;">
    <div style="max-width:600px;margin:auto;background-color:#111;border-radius:10px;padding:30px;border:1px solid #1f2937;">
      <h1 style="color:#22c55e;text-align:center;margin-bottom:10px;">NESI</h1>
      <h2 style="color:#e5e7eb;text-align:center;margin-bottom:30px;">Сброс пароля</h2>

      <p style="color:#d1d5db;font-size:15px;line-height:1.6;text-align:center;">
        Вы запросили сброс пароля.  
        Нажмите кнопку ниже, чтобы создать новый пароль.
      </p>

      <div style="text-align:center;margin:40px 0;">
        <a href="${link}"
           style="background-color:#22c55e;color:#000;text-decoration:none;
           padding:14px 28px;border-radius:8px;font-weight:bold;font-size:16px;
           display:inline-block;">
          Сбросить пароль
        </a>
      </div>

      <p style="color:#9ca3af;font-size:13px;text-align:center;">
        Если вы не запрашивали восстановление пароля — просто проигнорируйте это письмо.
      </p>

      <hr style="border:none;border-top:1px solid #1f2937;margin:30px 0;" />

      <p style="color:#4b5563;font-size:12px;text-align:center;">
        С уважением, команда <strong>NESI</strong><br/>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="color:#22c55e;text-decoration:none;">nesi.app</a>
      </p>
    </div>
  </div>
  `

  await transporter.sendMail({
    from: `"NESI" <${process.env.SUPPORT_EMAIL || process.env.SMTP_USER}>`,
    to,
    subject: 'Сброс пароля NESI',
    html,
  })
}

/**
 * 💚 Отправка письма для подтверждения e-mail (в стиле NESI)
 */
export async function sendVerificationEmail(to: string, link: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  const html = `
  <div style="background-color:#0a0a0a;padding:40px 0;font-family:Arial,sans-serif;">
    <div style="max-width:600px;margin:auto;background-color:#111;border-radius:10px;padding:30px;border:1px solid #1f2937;">
      <h1 style="color:#22c55e;text-align:center;margin-bottom:10px;">NESI</h1>
      <h2 style="color:#e5e7eb;text-align:center;margin-bottom:30px;">Подтверждение электронной почты</h2>

      <p style="color:#d1d5db;font-size:15px;line-height:1.6;text-align:center;">
        Спасибо за регистрацию в <strong>NESI</strong>!  
        Чтобы активировать свой аккаунт, подтвердите e-mail, нажав кнопку ниже:
      </p>

      <div style="text-align:center;margin:40px 0;">
        <a href="${link}"
           style="background-color:#22c55e;color:#000;text-decoration:none;
           padding:14px 28px;border-radius:8px;font-weight:bold;font-size:16px;
           display:inline-block;">
          Подтвердить e-mail
        </a>
      </div>

      <p style="color:#9ca3af;font-size:13px;text-align:center;">
        Если вы не регистрировались в NESI — просто проигнорируйте это письмо.
      </p>

      <hr style="border:none;border-top:1px solid #1f2937;margin:30px 0;" />

      <p style="color:#4b5563;font-size:12px;text-align:center;">
        С уважением, команда <strong>NESI</strong><br/>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="color:#22c55e;text-decoration:none;">nesi.app</a>
      </p>
    </div>
  </div>
  `

  await transporter.sendMail({
    from: `"NESI" <${process.env.SUPPORT_EMAIL || process.env.SMTP_USER}>`,
    to,
    subject: 'Подтверждение регистрации NESI',
    html,
  })
}
