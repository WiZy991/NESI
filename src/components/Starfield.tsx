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

    // === Основные звёзды ===
    const stars = Array.from({ length: 250 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.2 + 0.3,
      alpha: Math.random(),
      speed: Math.random() * 0.3 + 0.05,
    }))

    // === Метеоры ===
    const meteors: {
      x: number
      y: number
      len: number
      speed: number
      angle: number
      opacity: number
      hue: number
    }[] = []

    const createMeteor = () => {
      meteors.push({
        x: Math.random() * width,
        y: Math.random() * height * 0.5,
        len: Math.random() * 250 + 150,
        speed: Math.random() * 10 + 8,
        angle: Math.PI / 4,
        opacity: 1,
        hue: Math.random() * 30 + 20, // от жёлтого до оранжевого
      })
    }

    let lastMeteor = 0

    const draw = () => {
      if (!ctx) return
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
      ctx.fillRect(0, 0, width, height)

      // === Звёзды ===
      for (const s of stars) {
        s.y += s.speed
        if (s.y > height) s.y = 0
        s.alpha += Math.random() * 0.05 - 0.025
        if (s.alpha < 0.3) s.alpha = 0.3
        if (s.alpha > 1) s.alpha = 1

        const gradient = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 4)
        gradient.addColorStop(0, `rgba(0,255,150,${0.9 * s.alpha})`)
        gradient.addColorStop(1, 'transparent')

        ctx.beginPath()
        ctx.fillStyle = gradient
        ctx.arc(s.x, s.y, s.r * 3, 0, Math.PI * 2)
        ctx.fill()
      }

      // === Метеоры ===
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i]
        m.x += Math.cos(m.angle) * m.speed
        m.y += Math.sin(m.angle) * m.speed
        m.opacity -= 0.008

        const grad = ctx.createLinearGradient(
          m.x,
          m.y,
          m.x - Math.cos(m.angle) * m.len,
          m.y - Math.sin(m.angle) * m.len
        )

        grad.addColorStop(0, `hsla(${m.hue}, 100%, 70%, ${m.opacity})`) // яркий жёлто-оранжевый
        grad.addColorStop(0.5, `hsla(${m.hue + 20}, 100%, 50%, ${m.opacity * 0.7})`)
        grad.addColorStop(1, `rgba(0,0,0,0)`)

        ctx.beginPath()
        ctx.strokeStyle = grad
        ctx.lineWidth = 2.5
        ctx.moveTo(m.x, m.y)
        ctx.lineTo(
          m.x - Math.cos(m.angle) * m.len,
          m.y - Math.sin(m.angle) * m.len
        )
        ctx.stroke()

        if (m.opacity <= 0) meteors.splice(i, 1)
      }

      // === Создаём новый метеор каждые 2–5 секунд ===
      if (performance.now() - lastMeteor > 2000 + Math.random() * 3000) {
        createMeteor()
        lastMeteor = performance.now()
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

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
    />
  )
}
