import { NextResponse } from "next/server"
import nodemailer from "nodemailer"

export async function POST(req: Request) {
  try {
    const { message, email } = await req.json()

    if (!message || message.trim() === "") {
      return NextResponse.json({ error: "Сообщение пустое" }, { status: 400 })
    }

    // Gmail SMTP (через порт 587, самый стабильный)
   const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false, // для 587 всегда false
  requireTLS: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})


    // Проверим соединение
    await transporter.verify()

    // Отправляем письмо
    await transporter.sendMail({
      from: `"NESI Support" <${process.env.SMTP_USER}>`,
      to: process.env.SUPPORT_EMAIL, // твоя же почта
      subject: "Новое сообщение в поддержку NESI",
      text: `От: ${email || "Аноним"}\n\n${message}`,
      html: `<p><strong>От:</strong> ${email || "Аноним"}</p><p>${message}</p>`,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Ошибка при отправке письма:", error)
    return NextResponse.json({ error: "Ошибка при отправке" }, { status: 500 })
  }
}
