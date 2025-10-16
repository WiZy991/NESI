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

    // === Генерация звёзд ===
    const stars = Array.from({ length: 250 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.2,
      alpha: Math.random(),
      speed: Math.random() * 0.3 + 0.05,
    }))

    // === Падающие звёзды ===
    const shootingStars: any[] = []

    const createShootingStar = () => {
      shootingStars.push({
        x: Math.random() * width,
        y: Math.random() * height * 0.5,
        len: Math.random() * 300 + 100,
        speed: Math.random() * 10 + 6,
        angle: Math.PI / 4,
        opacity: 1,
      })
    }

    let lastShoot = 0

    const draw = () => {
      if (!ctx) return
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
      ctx.fillRect(0, 0, width, height)

      // === Обычные звёзды ===
      for (const s of stars) {
        s.y += s.speed
        if (s.y > height) s.y = 0
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(0, 255, 150, ${0.7 * s.alpha})`
        ctx.fill()
      }

      // === Падающие звёзды ===
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const star = shootingStars[i]
        star.x += Math.cos(star.angle) * star.speed
        star.y += Math.sin(star.angle) * star.speed
        star.opacity -= 0.01

        ctx.strokeStyle = `rgba(0,255,150,${star.opacity})`
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(star.x, star.y)
        ctx.lineTo(star.x - Math.cos(star.angle) * star.len, star.y - Math.sin(star.angle) * star.len)
        ctx.stroke()

        if (star.opacity <= 0) shootingStars.splice(i, 1)
      }

      // === Создаём падающую звезду случайно ===
      if (performance.now() - lastShoot > 2000 + Math.random() * 4000) {
        createShootingStar()
        lastShoot = performance.now()
      }

      requestAnimationFrame(draw)
    }

    draw()

    // === Resize ===
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
