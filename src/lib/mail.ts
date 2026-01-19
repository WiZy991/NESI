import { Resend } from 'resend'

// Ленивая инициализация Resend для предотвращения ошибок при сборке
let resend: Resend | null = null

function getResend() {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  return resend
}

export async function sendVerificationEmail(to: string, link: string) {
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

  const resendClient = getResend()
  
  if (!resendClient) {
    console.warn('⚠️ RESEND_API_KEY не настроен, email не отправлен')
    return
  }

  try {
    const data = await resendClient.emails.send({
      from: `NESI <no-reply@nesi.su>`,
      to,
      subject: 'Подтверждение e-mail',
      html,
    })

    console.log('✅ Email успешно отправлен через Resend:', data)
  } catch (error: any) {
    console.error('❌ Ошибка при отправке письма через Resend:', error.message || error)
  }
}

/**
 * Отправка письма для сброса пароля
 */
export async function sendResetPasswordEmail(to: string, link: string) {
  const html = `
    <div style="font-family: 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #e5e5e5; padding: 30px;">
      <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(180deg, #0d0d0d 0%, #0f2010 100%);
        border-radius: 16px; box-shadow: 0 0 25px rgba(0, 255, 100, 0.15); overflow: hidden; border: 1px solid rgba(0,255,100,0.1)">
        
        <div style="background: radial-gradient(circle at top left, rgba(0,255,120,0.15), transparent);
            padding: 24px 30px; text-align: center;">
          <h1 style="margin: 0; color: #00ff88; letter-spacing: 1px;">NESI</h1>
        </div>

        <div style="padding: 35px; text-align: center;">
          <h2 style="color: #00ff88; font-size: 22px;">Сброс пароля</h2>
          <p style="color: #ccc; font-size: 15px; line-height: 1.6; margin: 20px 0;">
            Вы запросили сброс пароля в <strong>NESI</strong>.<br/>
            Нажмите на кнопку ниже, чтобы установить новый пароль.
          </p>

          <a href="${link}" target="_blank"
            style="display: inline-block; margin-top: 20px; padding: 14px 28px;
            background: #00ff88; color: #000; font-weight: bold; text-decoration: none;
            border-radius: 8px; box-shadow: 0 0 15px rgba(0,255,120,0.4); transition: all 0.2s ease-in-out;">
            Сбросить пароль
          </a>

          <p style="font-size: 13px; color: #666; margin-top: 40px;">
            Если вы не запрашивали восстановление пароля — просто проигнорируйте это письмо.
          </p>
        </div>
      </div>
    </div>
  `

  const resendClient = getResend()
  
  if (!resendClient) {
    console.warn('⚠️ RESEND_API_KEY не настроен, email сброса не отправлен')
    return
  }

  try {
    const data = await resendClient.emails.send({
      from: `NESI <no-reply@nesi.su>`,
      to,
      subject: 'Сброс пароля',
      html,
    })

    console.log('✅ Письмо сброса отправлено через Resend:', data)
  } catch (error: any) {
    console.error('❌ Ошибка при отправке письма сброса через Resend:', error.message || error)
  }
}

/**
 * Отправка уведомления о новом отклике на задачу
 */
export async function sendNewResponseEmail(to: string, taskTitle: string, taskId: string, executorName: string) {
  const html = `
    <div style="font-family: 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #e5e5e5; padding: 30px;">
      <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(180deg, #0d0d0d 0%, #0f2010 100%);
        border-radius: 16px; box-shadow: 0 0 25px rgba(0, 255, 100, 0.15); overflow: hidden; border: 1px solid rgba(0,255,100,0.1)">
        
        <div style="background: radial-gradient(circle at top left, rgba(0,255,120,0.15), transparent);
            padding: 24px 30px; text-align: center;">
          <h1 style="margin: 0; color: #00ff88; letter-spacing: 1px;">NESI</h1>
        </div>

        <div style="padding: 35px; text-align: center;">
          <h2 style="color: #00ff88; font-size: 22px;">🎉 Новый отклик!</h2>
          <p style="color: #ccc; font-size: 15px; line-height: 1.6; margin: 20px 0;">
            На вашу задачу "<strong>${taskTitle}</strong>" откликнулся <strong>${executorName}</strong>.
          </p>

          <a href="${process.env.NEXT_PUBLIC_APP_URL}/tasks/${taskId}" target="_blank"
            style="display: inline-block; margin-top: 20px; padding: 14px 28px;
            background: #00ff88; color: #000; font-weight: bold; text-decoration: none;
            border-radius: 8px; box-shadow: 0 0 15px rgba(0,255,120,0.4);">
            Посмотреть отклик
          </a>
        </div>
      </div>
    </div>
  `

  await sendEmail(to, 'Новый отклик на вашу задачу', html)
}

/**
 * Уведомление о выборе исполнителем
 */
export async function sendTaskAssignedEmail(to: string, taskTitle: string, taskId: string, customerName: string) {
  const html = `
    <div style="font-family: 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #e5e5e5; padding: 30px;">
      <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(180deg, #0d0d0d 0%, #0f2010 100%);
        border-radius: 16px; box-shadow: 0 0 25px rgba(0, 255, 100, 0.15); overflow: hidden; border: 1px solid rgba(0,255,100,0.1)">
        
        <div style="background: radial-gradient(circle at top left, rgba(0,255,120,0.15), transparent);
            padding: 24px 30px; text-align: center;">
          <h1 style="margin: 0; color: #00ff88; letter-spacing: 1px;">NESI</h1>
        </div>

        <div style="padding: 35px; text-align: center;">
          <h2 style="color: #00ff88; font-size: 22px;">✅ Вас выбрали исполнителем!</h2>
          <p style="color: #ccc; font-size: 15px; line-height: 1.6; margin: 20px 0;">
            <strong>${customerName}</strong> выбрал вас исполнителем задачи "<strong>${taskTitle}</strong>".
          </p>

          <a href="${process.env.NEXT_PUBLIC_APP_URL}/tasks/${taskId}" target="_blank"
            style="display: inline-block; margin-top: 20px; padding: 14px 28px;
            background: #00ff88; color: #000; font-weight: bold; text-decoration: none;
            border-radius: 8px; box-shadow: 0 0 15px rgba(0,255,120,0.4);">
            Приступить к работе
          </a>
        </div>
      </div>
    </div>
  `

  await sendEmail(to, 'Вас выбрали исполнителем', html)
}

/**
 * Уведомление о завершении задачи
 */
export async function sendTaskCompletedEmail(to: string, taskTitle: string, taskId: string, amount: number) {
  const html = `
    <div style="font-family: 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #e5e5e5; padding: 30px;">
      <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(180deg, #0d0d0d 0%, #0f2010 100%);
        border-radius: 16px; box-shadow: 0 0 25px rgba(0, 255, 100, 0.15); overflow: hidden; border: 1px solid rgba(0,255,100,0.1)">
        
        <div style="background: radial-gradient(circle at top left, rgba(0,255,120,0.15), transparent);
            padding: 24px 30px; text-align: center;">
          <h1 style="margin: 0; color: #00ff88; letter-spacing: 1px;">NESI</h1>
        </div>

        <div style="padding: 35px; text-align: center;">
          <h2 style="color: #00ff88; font-size: 22px;">🎉 Задача завершена!</h2>
          <p style="color: #ccc; font-size: 15px; line-height: 1.6; margin: 20px 0;">
            Задача "<strong>${taskTitle}</strong>" успешно завершена.<br/>
            Вам начислено: <strong style="color: #00ff88;">${amount.toFixed(2)}₽</strong>
          </p>

          <a href="${process.env.NEXT_PUBLIC_APP_URL}/tasks/${taskId}" target="_blank"
            style="display: inline-block; margin-top: 20px; padding: 14px 28px;
            background: #00ff88; color: #000; font-weight: bold; text-decoration: none;
            border-radius: 8px; box-shadow: 0 0 15px rgba(0,255,120,0.4);">
            Оставить отзыв
          </a>
        </div>
      </div>
    </div>
  `

  await sendEmail(to, 'Задача завершена', html)
}

/**
 * Уведомление о новом отзыве
 */
export async function sendNewReviewEmail(to: string, rating: number, comment: string, fromName: string) {
  const stars = '⭐'.repeat(rating)
  
  const html = `
    <div style="font-family: 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #e5e5e5; padding: 30px;">
      <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(180deg, #0d0d0d 0%, #0f2010 100%);
        border-radius: 16px; box-shadow: 0 0 25px rgba(0, 255, 100, 0.15); overflow: hidden; border: 1px solid rgba(0,255,100,0.1)">
        
        <div style="background: radial-gradient(circle at top left, rgba(0,255,120,0.15), transparent);
            padding: 24px 30px; text-align: center;">
          <h1 style="margin: 0; color: #00ff88; letter-spacing: 1px;">NESI</h1>
        </div>

        <div style="padding: 35px; text-align: center;">
          <h2 style="color: #00ff88; font-size: 22px;">⭐ Новый отзыв!</h2>
          <p style="color: #ccc; font-size: 15px; line-height: 1.6; margin: 20px 0;">
            <strong>${fromName}</strong> оставил вам отзыв
          </p>
          
          <div style="margin: 20px 0; font-size: 24px;">${stars}</div>
          
          <p style="color: #aaa; font-size: 14px; font-style: italic; margin: 20px 0; padding: 15px; background: rgba(0,0,0,0.3); border-radius: 8px;">
            "${comment}"
          </p>

          <a href="${process.env.NEXT_PUBLIC_APP_URL}/profile" target="_blank"
            style="display: inline-block; margin-top: 20px; padding: 14px 28px;
            background: #00ff88; color: #000; font-weight: bold; text-decoration: none;
            border-radius: 8px; box-shadow: 0 0 15px rgba(0,255,120,0.4);">
            Посмотреть профиль
          </a>
        </div>
      </div>
    </div>
  `

  await sendEmail(to, 'Вы получили новый отзыв', html)
}

/**
 * Уведомление о новом сообщении (если пользователь не онлайн)
 */
export async function sendNewMessageEmail(to: string, fromName: string, preview: string, taskTitle?: string) {
  const html = `
    <div style="font-family: 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #e5e5e5; padding: 30px;">
      <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(180deg, #0d0d0d 0%, #0f2010 100%);
        border-radius: 16px; box-shadow: 0 0 25px rgba(0, 255, 100, 0.15); overflow: hidden; border: 1px solid rgba(0,255,100,0.1)">
        
        <div style="background: radial-gradient(circle at top left, rgba(0,255,120,0.15), transparent);
            padding: 24px 30px; text-align: center;">
          <h1 style="margin: 0; color: #00ff88; letter-spacing: 1px;">NESI</h1>
        </div>

        <div style="padding: 35px; text-align: center;">
          <h2 style="color: #00ff88; font-size: 22px;">💬 Новое сообщение</h2>
          <p style="color: #ccc; font-size: 15px; line-height: 1.6; margin: 20px 0;">
            <strong>${fromName}</strong> отправил вам сообщение${taskTitle ? ` в задаче "${taskTitle}"` : ''}
          </p>
          
          <p style="color: #aaa; font-size: 14px; margin: 20px 0; padding: 15px; background: rgba(0,0,0,0.3); border-radius: 8px;">
            ${preview.substring(0, 100)}${preview.length > 100 ? '...' : ''}
          </p>

          <a href="${process.env.NEXT_PUBLIC_APP_URL}/chats" target="_blank"
            style="display: inline-block; margin-top: 20px; padding: 14px 28px;
            background: #00ff88; color: #000; font-weight: bold; text-decoration: none;
            border-radius: 8px; box-shadow: 0 0 15px rgba(0,255,120,0.4);">
            Прочитать сообщение
          </a>
        </div>
      </div>
    </div>
  `

  await sendEmail(to, 'Новое сообщение', html)
}

/**
 * Отправка письма для подтверждения корпоративной почты компании
 */
export async function sendCompanyVerificationEmail(
  to: string,
  params: {
    type: 'company_verification'
    verificationUrl: string
    companyName: string
  }
) {
  const html = `
    <div style="font-family: 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #e5e5e5; padding: 30px;">
      <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(180deg, #0d0d0d 0%, #0f2010 100%);
        border-radius: 16px; box-shadow: 0 0 25px rgba(0, 255, 100, 0.15); overflow: hidden; border: 1px solid rgba(0,255,100,0.1)">
        
        <div style="background: radial-gradient(circle at top left, rgba(0,255,120,0.15), transparent);
            padding: 24px 30px; text-align: center;">
          <h1 style="margin: 0; color: #00ff88; letter-spacing: 1px;">NESI</h1>
        </div>

        <div style="padding: 35px; text-align: center;">
          <h2 style="color: #00ff88; font-size: 22px;">Подтверждение корпоративной почты</h2>
          <p style="color: #ccc; font-size: 15px; line-height: 1.6; margin: 20px 0;">
            Для доступа к групповым функциям платформы необходимо подтвердить связь с компанией <strong>${params.companyName}</strong>.
          </p>
          <p style="color: #ccc; font-size: 15px; line-height: 1.6; margin: 20px 0;">
            Нажмите на кнопку ниже, чтобы подтвердить корпоративную почту.
          </p>

          <a href="${params.verificationUrl}" target="_blank"
            style="display: inline-block; margin-top: 20px; padding: 14px 28px;
            background: #00ff88; color: #000; font-weight: bold; text-decoration: none;
            border-radius: 8px; box-shadow: 0 0 15px rgba(0,255,120,0.4); transition: all 0.2s ease-in-out;">
            Подтвердить почту
          </a>

          <p style="font-size: 13px; color: #666; margin-top: 40px;">
            Если вы не запрашивали подтверждение — просто проигнорируйте это письмо.
          </p>
        </div>
      </div>
    </div>
  `

  await sendEmail(to, 'Подтверждение корпоративной почты', html)
}

/**
 * Отправка письма с приглашением в команду
 */
export async function sendTeamInvitationEmail(
  to: string,
  params: {
    inviterName: string
    teamName: string
    invitationUrl: string
  }
) {
  const html = `
    <div style="font-family: 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #e5e5e5; padding: 30px;">
      <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(180deg, #0d0d0d 0%, #0f2010 100%);
        border-radius: 16px; box-shadow: 0 0 25px rgba(0, 255, 100, 0.15); overflow: hidden; border: 1px solid rgba(0,255,100,0.1)">
        
        <div style="background: radial-gradient(circle at top left, rgba(0,255,120,0.15), transparent);
            padding: 24px 30px; text-align: center;">
          <h1 style="margin: 0; color: #00ff88; letter-spacing: 1px;">NESI</h1>
        </div>

        <div style="padding: 35px; text-align: center;">
          <h2 style="color: #00ff88; font-size: 22px;">Приглашение в команду</h2>
          <p style="color: #ccc; font-size: 15px; line-height: 1.6; margin: 20px 0;">
            <strong>${params.inviterName}</strong> пригласил вас присоединиться к команде <strong>"${params.teamName}"</strong>.
          </p>
          <p style="color: #ccc; font-size: 15px; line-height: 1.6; margin: 20px 0;">
            Нажмите на кнопку ниже, чтобы принять приглашение.
          </p>

          <a href="${params.invitationUrl}" target="_blank"
            style="display: inline-block; margin-top: 20px; padding: 14px 28px;
            background: #00ff88; color: #000; font-weight: bold; text-decoration: none;
            border-radius: 8px; box-shadow: 0 0 15px rgba(0,255,120,0.4); transition: all 0.2s ease-in-out;">
            Принять приглашение
          </a>

          <p style="font-size: 13px; color: #666; margin-top: 40px;">
            Если вы не хотите присоединяться к команде — просто проигнорируйте это письмо.
          </p>
        </div>
      </div>
    </div>
  `

  await sendEmail(to, 'Приглашение в команду', html)
}

/**
 * Базовая функция отправки email
 */
async function sendEmail(to: string, subject: string, html: string) {
  const resendClient = getResend()
  
  if (!resendClient) {
    console.warn('⚠️ RESEND_API_KEY не настроен, email не отправлен')
    return
  }

  try {
    const data = await resendClient.emails.send({
      from: `NESI <no-reply@nesi.su>`,
      to,
      subject,
      html,
    })

    console.log('✅ Email отправлен:', subject, 'to', to)
  } catch (error: any) {
    console.error('❌ Ошибка отправки email:', error.message || error)
  }
}

/**
 * Отправка рассылки от администратора от имени info.nesi@bk.ru
 */
export async function sendAdminMailingEmail(
  to: string,
  params: {
    subject: string
    message: string
    recipientName?: string
  }
) {
  const html = `
    <div style="font-family: 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #e5e5e5; padding: 30px;">
      <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(180deg, #0d0d0d 0%, #0f2010 100%);
        border-radius: 16px; box-shadow: 0 0 25px rgba(0, 255, 100, 0.15); overflow: hidden; border: 1px solid rgba(0,255,100,0.1)">
        
        <div style="background: radial-gradient(circle at top left, rgba(0,255,120,0.15), transparent);
            padding: 24px 30px; text-align: center;">
          <h1 style="margin: 0; color: #00ff88; letter-spacing: 1px;">NESI</h1>
        </div>

        <div style="padding: 35px;">
          <h2 style="color: #00ff88; font-size: 22px; margin-bottom: 20px;">${params.subject}</h2>
          <p style="color: #ccc; font-size: 15px; line-height: 1.6; margin: 20px 0; white-space: pre-wrap;">
            ${params.message}
          </p>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
            <p style="font-size: 13px; color: #666; margin: 0;">
              С уважением,<br/>
              Команда NESI<br/>
              <a href="mailto:info.nesi@bk.ru" style="color: #00ff88; text-decoration: none;">info.nesi@bk.ru</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  `

  const resendClient = getResend()
  
  if (!resendClient) {
    console.warn('⚠️ RESEND_API_KEY не настроен, email рассылки не отправлен')
    return
  }

  try {
    const data = await resendClient.emails.send({
      from: `NESI <info.nesi@bk.ru>`,
      to,
      subject: params.subject,
      html,
    })

    console.log('✅ Email рассылки отправлен:', params.subject, 'to', to)
  } catch (error: any) {
    console.error('❌ Ошибка при отправке email рассылки:', error.message || error)
    throw error
  }
}