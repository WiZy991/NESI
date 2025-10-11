import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendVerificationEmail(to: string, link: string) {
  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 30px;">
      <div style="max-width: 600px; margin: auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
        <div style="background-color: #1e40af; padding: 20px; color: white; text-align: center;">
          <h1 style="margin: 0;">SupportHub</h1>
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
