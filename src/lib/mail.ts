// src/lib/mail.ts
import nodemailer from 'nodemailer'

export async function sendResetPasswordEmail(to: string, link: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 30px;">
      <div style="max-width: 600px; margin: auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
        <div style="background-color: #1e40af; padding: 20px; color: white; text-align: center;">
          <h1 style="margin: 0;">SupportHub</h1>
        </div>
        <div style="padding: 30px;">
          <h2 style="margin-top: 0;">Сброс пароля</h2>
          <p>Вы запросили сброс пароля. Нажмите на кнопку ниже, чтобы создать новый пароль:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${link}" style="display: inline-block; background-color: #3b82f6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 16px;">Сбросить пароль</a>
          </div>
          <p>Если вы не запрашивали восстановление пароля — просто проигнорируйте это письмо.</p>
          <p style="color: #6b7280; font-size: 14px;">С уважением, команда SupportHub</p>
        </div>
      </div>
    </div>
  `

  await transporter.sendMail({
    from: `"SupportHub" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Восстановление пароля',
    html,
  })
}
