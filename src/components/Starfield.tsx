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

    // === Звезды ===
    const stars = Array.from({ length: 250 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.3 + 0.4,
      alpha: Math.random(),
      speed: Math.random() * 0.25 + 0.05,
    }))

    // === Метеоры и дым ===
    const meteors: {
      x: number
      y: number
      len: number
      speed: number
      angle: number
      opacity: number
      hue: number
    }[] = []

    const smokeTrails: {
      x: number
      y: number
      opacity: number
      radius: number
    }[] = []

    // === Параллакс-эффект ===
    let mouseX = 0
    let mouseY = 0
    let targetX = 0
    let targetY = 0

    const handleMouseMove = (e: MouseEvent) => {
      targetX = (e.clientX / width - 0.5) * 30
      targetY = (e.clientY / height - 0.5) * 30
    }

    window.addEventListener('mousemove', handleMouseMove)

    // === Создание метеора ===
    const createMeteor = () => {
      const startX = Math.random() * width
      const startY = Math.random() * height * 0.4
      const direction =
        Math.random() * Math.PI * 0.8 + Math.PI / 5 // 36°–144° в разные стороны

      meteors.push({
        x: startX,
        y: startY,
        len: Math.random() * 200 + 150,
        speed: Math.random() * 6 + 6,
        angle: direction,
        opacity: 1,
        hue: Math.random() * 30 + 15,
      })
    }

    let lastMeteor = 0

    const draw = () => {
      if (!ctx) return

      // полностью очищаем экран, без остаточных полос
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, width, height)

      // плавно двигаем параллакс
      mouseX += (targetX - mouseX) * 0.05
      mouseY += (targetY - mouseY) * 0.05

      // === Звезды ===
      for (const s of stars) {
        s.y += s.speed
        if (s.y > height) s.y = 0

        s.alpha += Math.random() * 0.05 - 0.025
        s.alpha = Math.max(0.3, Math.min(1, s.alpha))

        const px = s.x + mouseX * (s.r * 0.8)
        const py = s.y + mouseY * (s.r * 0.8)

        const gradient = ctx.createRadialGradient(px, py, 0, px, py, s.r * 4)
        gradient.addColorStop(0, `rgba(0,255,150,${0.9 * s.alpha})`)
        gradient.addColorStop(1, 'transparent')

        ctx.beginPath()
        ctx.fillStyle = gradient
        ctx.arc(px, py, s.r * 3, 0, Math.PI * 2)
        ctx.fill()
      }

      // === Дымовые следы ===
      for (let i = smokeTrails.length - 1; i >= 0; i--) {
        const smoke = smokeTrails[i]
        smoke.opacity -= 0.002
        smoke.radius += 0.2

        const gradient = ctx.createRadialGradient(
          smoke.x,
          smoke.y,
          0,
          smoke.x,
          smoke.y,
          smoke.radius
        )
        gradient.addColorStop(0, `rgba(80,80,80,${smoke.opacity})`)
        gradient.addColorStop(1, 'transparent')

        ctx.beginPath()
        ctx.fillStyle = gradient
        ctx.arc(smoke.x, smoke.y, smoke.radius, 0, Math.PI * 2)
        ctx.fill()

        if (smoke.opacity <= 0) smokeTrails.splice(i, 1)
      }

      // === Метеоры ===
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i]
        m.x += Math.cos(m.angle) * m.speed
        m.y += Math.sin(m.angle) * m.speed
        m.opacity -= 0.008

        smokeTrails.push({
          x: m.x - Math.cos(m.angle) * m.len * 0.8,
          y: m.y - Math.sin(m.angle) * m.len * 0.8,
          opacity: 0.25,
          radius: 8,
        })

        const grad = ctx.createLinearGradient(
          m.x,
          m.y,
          m.x - Math.cos(m.angle) * m.len,
          m.y - Math.sin(m.angle) * m.len
        )

        grad.addColorStop(0, `hsla(${m.hue}, 100%, 70%, ${m.opacity})`)
        grad.addColorStop(0.4, `hsla(${m.hue + 15}, 100%, 50%, ${m.opacity * 0.8})`)
        grad.addColorStop(0.8, `rgba(255,80,0,${m.opacity * 0.5})`)
        grad.addColorStop(1, 'transparent')

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

      // === Новый метеор каждые 8–12 секунд ===
      if (performance.now() - lastMeteor > 8000 + Math.random() * 4000) {
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
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none" />
}
