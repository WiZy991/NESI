'use client'

import { useRef, useEffect } from 'react'

export default function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = window.innerWidth
    let height = window.innerHeight
    canvas.width = width
    canvas.height = height

    // 🌟 Звёзды
    const stars = Array.from({ length: 250 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.3 + 0.4,
      alpha: Math.random(),
      speed: Math.random() * 0.25 + 0.05,
    }))

    const meteors: any[] = []
    let lastMeteor = 0
    let lastStarfall = 0

    // ☄️ Создание метеора или падающей звезды
    const createMeteor = (isStar = false) => {
      const startX = Math.random() * width
      const startY = Math.random() * height * 0.3
      const angle = isStar
        ? Math.random() * Math.PI * 0.2 + Math.PI / 2.8 // более острый угол
        : Math.random() * Math.PI * 0.25 + Math.PI / 3
      const len = isStar ? Math.random() * 100 + 80 : Math.random() * 200 + 150

      meteors.push({
        x: startX,
        y: startY,
        len,
        speed: isStar ? 3 : Math.random() * 2 + 1,
        angle,
        opacity: 1,
        hue: isStar ? 140 + Math.random() * 20 : 40 + Math.random() * 10,
        size: isStar ? 2 : 3,
      })
    }

    const draw = () => {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.fillRect(0, 0, width, height)

      // 🌌 Звёзды
      for (const s of stars) {
        s.y += s.speed
        if (s.y > height) s.y = 0
        s.alpha += Math.random() * 0.05 - 0.025
        s.alpha = Math.max(0.3, Math.min(1, s.alpha))

        const gradient = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 3)
        gradient.addColorStop(0, `rgba(0,255,150,${0.8 * s.alpha})`)
        gradient.addColorStop(1, 'transparent')
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r * 3, 0, Math.PI * 2)
        ctx.fill()
      }

      // ☄️ Метеоры
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i]
        m.x += Math.cos(m.angle) * m.speed
        m.y += Math.sin(m.angle) * m.speed
        m.opacity -= 0.005

        // Хвост
        const grad = ctx.createLinearGradient(
          m.x,
          m.y,
          m.x - Math.cos(m.angle) * m.len,
          m.y - Math.sin(m.angle) * m.len
        )
        grad.addColorStop(0, `hsla(${m.hue}, 100%, 75%, ${m.opacity})`)
        grad.addColorStop(0.5, `hsla(${m.hue}, 90%, 55%, ${m.opacity * 0.5})`)
        grad.addColorStop(1, 'transparent')

        ctx.beginPath()
        ctx.strokeStyle = grad
        ctx.lineWidth = m.size
        ctx.moveTo(m.x, m.y)
        ctx.lineTo(
          m.x - Math.cos(m.angle) * m.len,
          m.y - Math.sin(m.angle) * m.len
        )
        ctx.stroke()

        // Голова (небольшое свечение)
        const head = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, 5)
        head.addColorStop(0, `rgba(255,255,255,${m.opacity})`)
        head.addColorStop(1, 'transparent')
        ctx.fillStyle = head
        ctx.beginPath()
        ctx.arc(m.x, m.y, 2.5, 0, Math.PI * 2)
        ctx.fill()

        if (
          m.x > width + 100 ||
          m.y > height + 100 ||
          m.opacity <= 0
        ) {
          meteors.splice(i, 1)
        }
      }

      const now = performance.now()

      // 🌠 Обычные метеоры
      if (now - lastMeteor > 9000 + Math.random() * 4000) {
        createMeteor(false)
        lastMeteor = now
      }

      // 🌟 Падающая звезда (чуть быстрее и короче)
      if (now - lastStarfall > 15000 + Math.random() * 8000) {
        createMeteor(true)
        lastStarfall = now
      }

      requestAnimationFrame(draw)
    }

    draw()

    const handleResize = () => {
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width
      canvas.height = height
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none" />
}
