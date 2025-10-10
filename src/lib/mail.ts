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

export async function sendVerificationEmail(to: string, link: string) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false, // Gmail требует STARTTLS
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    const html = `
      <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 30px;">
        <div style="max-width: 600px; margin: auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
          <div style="background-color: #1e40af; padding: 20px; color: white; text-align: center;">
            <h1 style="margin: 0;">NESI</h1>
          </div>
          <div style="padding: 30px;">
            <h2>Подтверждение почты</h2>
            <p>Здравствуйте! Пожалуйста, подтвердите ваш адрес электронной почты, нажав кнопку ниже:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${link}" style="display: inline-block; background-color: #10b981; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 16px;">Подтвердить e-mail</a>
            </div>
            <p>Если вы не регистрировались — просто проигнорируйте это письмо.</p>
          </div>
        </div>
      </div>
    `

    const info = await transporter.sendMail({
      from: `"NESI" <${process.env.SMTP_USER}>`,
      to,
      subject: 'Подтверждение e-mail',
      html,
    })

    console.log('✅ Email отправлен:', info.messageId)
  } catch (error: any) {
    console.error('❌ Ошибка при отправке email:', error.message)
    throw error
  }
}

