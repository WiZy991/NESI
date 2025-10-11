import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const html = `
  <div style="font-family: 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #e5e5e5; padding: 30px;">
    <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(180deg, #0d0d0d 0%, #0f2010 100%);
      border-radius: 16px; box-shadow: 0 0 25px rgba(0, 255, 100, 0.15); overflow: hidden; border: 1px solid rgba(0,255,100,0.1)">
      
      <div style="background: radial-gradient(circle at top left, rgba(0,255,120,0.15), transparent);
          padding: 24px 30px; text-align: center;">
        <h1 style="margin: 0; color: #00ff88; letter-spacing: 1px;">NESI</h1>
      </div>

      <div style="padding: 35px; text-align: center;">
        <h2 style="color: #00ff88; font-size: 22px;">Подтверждение e-mail</h2>
        <p style="color: #ccc; font-size: 15px; line-height: 1.6; margin: 20px 0;">
          Привет! 👋<br/>
          Благодарим за регистрацию в <strong>NESI</strong>.<br/>
          Чтобы активировать аккаунт, подтвердите ваш e-mail.
        </p>

        <a href="${link}" target="_blank"
          style="display: inline-block; margin-top: 20px; padding: 14px 28px;
          background: #00ff88; color: #000; font-weight: bold; text-decoration: none;
          border-radius: 8px; box-shadow: 0 0 15px rgba(0,255,120,0.4); transition: all 0.2s ease-in-out;">
          Подтвердить e-mail
        </a>

        <p style="font-size: 13px; color: #666; margin-top: 40px;">
          Если вы не регистрировались — просто проигнорируйте это письмо.
        </p>
      </div>
    </div>
  </div>
`


  try {
    const data = await resend.emails.send({
      from: `SupportHub <onboarding@resend.dev>`,
      to,
      subject: 'Подтверждение e-mail',
      html,
    })

    console.log('✅ Email успешно отправлен через Resend:', data)
  } catch (error: any) {
    console.error('❌ Ошибка при отправке письма через Resend:', error.message || error)
  }
}

export async function sendResetPasswordEmail(to: string, link: string) {
  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 30px;">
      <div style="max-width: 600px; margin: auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
        <div style="background-color: #1e40af; padding: 20px; color: white; text-align: center;">
          <h1 style="margin: 0;">SupportHub</h1>
        </div>
        <div style="padding: 30px;">
          <h2>Сброс пароля</h2>
          <p>Вы запросили сброс пароля. Нажмите на кнопку ниже, чтобы создать новый пароль:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${link}" style="display: inline-block; background-color: #3b82f6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 16px;">Сбросить пароль</a>
          </div>
          <p>Если вы не запрашивали восстановление пароля — просто проигнорируйте это письмо.</p>
        </div>
      </div>
    </div>
  `

  try {
    const data = await resend.emails.send({
      from: `SupportHub <onboarding@resend.dev>`,
      to,
      subject: 'Сброс пароля',
      html,
    })

    console.log('✅ Письмо сброса отправлено через Resend:', data)
  } catch (error: any) {
    console.error('❌ Ошибка при отправке письма сброса через Resend:', error.message || error)
  }
}
