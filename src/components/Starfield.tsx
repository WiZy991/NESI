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

    // --- Звёзды ---
    const stars = Array.from({ length: 250 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.3 + 0.4,
      alpha: Math.random(),
      speed: Math.random() * 0.25 + 0.05,
    }))

    const meteors: any[] = []
    const shootingStars: any[] = []
    const smokeTrails: any[] = []
    const particles: any[] = []

    let mouseX = 0, mouseY = 0, targetX = 0, targetY = 0

    const handleMouseMove = (e: MouseEvent) => {
      targetX = (e.clientX / width - 0.5) * 30
      targetY = (e.clientY / height - 0.5) * 30
    }
    window.addEventListener('mousemove', handleMouseMove)

    const createMeteor = () => {
      meteors.push({
        x: Math.random() * width,
        y: Math.random() * height * 0.2,
        len: Math.random() * 250 + 200,
        speed: Math.random() * 2 + 2,
        angle: Math.random() * Math.PI * 0.4 + Math.PI / 3,
        opacity: 1,
        hue: Math.random() * 40 + 15,
        waveOffset: Math.random() * 1000,
      })
    }

    const createShootingStar = () => {
      shootingStars.push({
        x: Math.random() * width,
        y: Math.random() * height * 0.5,
        len: Math.random() * 100 + 50,
        speed: Math.random() * 6 + 5,
        angle: Math.random() * Math.PI * 0.3 + Math.PI / 3,
        opacity: 1,
        hue: 140 + Math.random() * 20,
      })
    }

    const createParticles = (x: number, y: number, hue: number) => {
      for (let i = 0; i < 8; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = Math.random() * 1.5 + 0.5
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          hue: hue + Math.random() * 20,
          size: Math.random() * 2 + 1,
        })
      }
    }

    let lastMeteor = 0
    let lastStar = 0

    const draw = () => {
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, width, height)

      mouseX += (targetX - mouseX) * 0.05
      mouseY += (targetY - mouseY) * 0.05

      // --- Статичные звёзды ---
      for (const s of stars) {
        s.y += s.speed
        if (s.y > height) s.y = 0
        s.alpha += Math.random() * 0.05 - 0.025
        s.alpha = Math.max(0.3, Math.min(1, s.alpha))
        const px = s.x + mouseX * (s.r * 0.8)
        const py = s.y + mouseY * (s.r * 0.8)

        const gradient = ctx.createRadialGradient(px, py, 0, px, py, s.r * 3)
        gradient.addColorStop(0, `rgba(0,255,150,${0.9 * s.alpha})`)
        gradient.addColorStop(1, 'transparent')
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(px, py, s.r * 3, 0, Math.PI * 2)
        ctx.fill()
      }

      // --- Метеоры ---
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i]
        const turbulence = Math.sin((performance.now() + m.waveOffset) * 0.005) * 4
        m.x += Math.cos(m.angle) * m.speed
        m.y += Math.sin(m.angle) * m.speed + turbulence * 0.02
        m.opacity -= 0.003

        // Дым
        smokeTrails.push({
          x: m.x - Math.cos(m.angle) * m.len * 0.6,
          y: m.y - Math.sin(m.angle) * m.len * 0.6,
          opacity: 0.25,
          radius: 10,
        })

        // Искры
        if (Math.random() < 0.5) createParticles(m.x, m.y, m.hue)

        // Плазменный шлейф
        const grad = ctx.createLinearGradient(
          m.x,
          m.y,
          m.x - Math.cos(m.angle) * m.len,
          m.y - Math.sin(m.angle) * m.len
        )
        grad.addColorStop(0, `hsla(${m.hue}, 100%, 75%, ${m.opacity})`)
        grad.addColorStop(0.3, `hsla(${m.hue + 10}, 100%, 55%, ${m.opacity * 0.9})`)
        grad.addColorStop(0.8, `rgba(255,50,0,${m.opacity * 0.6})`)
        grad.addColorStop(1, 'transparent')

        ctx.beginPath()
        ctx.strokeStyle = grad
        ctx.lineWidth = 4
        ctx.moveTo(m.x, m.y)
        ctx.lineTo(
          m.x - Math.cos(m.angle) * m.len,
          m.y - Math.sin(m.angle) * m.len
        )
        ctx.stroke()

        // Голова метеора (объемная)
        const head = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, 18)
        head.addColorStop(0, `rgba(255,255,255,${m.opacity})`)
        head.addColorStop(0.2, `rgba(255,220,100,${m.opacity * 0.9})`)
        head.addColorStop(0.5, `rgba(255,140,0,${m.opacity * 0.7})`)
        head.addColorStop(1, 'transparent')
        ctx.fillStyle = head
        ctx.beginPath()
        ctx.arc(m.x, m.y, 10, 0, Math.PI * 2)
        ctx.fill()

        if (m.opacity <= 0) meteors.splice(i, 1)
      }

      // --- Падающие звёзды ---
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const s = shootingStars[i]
        s.x += Math.cos(s.angle) * s.speed
        s.y += Math.sin(s.angle) * s.speed
        s.opacity -= 0.01
        const grad = ctx.createLinearGradient(
          s.x, s.y,
          s.x - Math.cos(s.angle) * s.len,
          s.y - Math.sin(s.angle) * s.len
        )
        grad.addColorStop(0, `hsla(${s.hue}, 100%, 70%, ${s.opacity})`)
        grad.addColorStop(1, 'transparent')
        ctx.strokeStyle = grad
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(s.x, s.y)
        ctx.lineTo(
          s.x - Math.cos(s.angle) * s.len,
          s.y - Math.sin(s.angle) * s.len
        )
        ctx.stroke()
        if (s.opacity <= 0) shootingStars.splice(i, 1)
      }

      // --- Искры ---
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy
        p.life -= 0.02
        ctx.fillStyle = `hsla(${p.hue}, 100%, 60%, ${p.life})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
        if (p.life <= 0) particles.splice(i, 1)
      }

      // --- Дым ---
      for (let i = smokeTrails.length - 1; i >= 0; i--) {
        const smoke = smokeTrails[i]
        smoke.opacity -= 0.002
        smoke.radius += 0.25
        const grad = ctx.createRadialGradient(smoke.x, smoke.y, 0, smoke.x, smoke.y, smoke.radius)
        grad.addColorStop(0, `rgba(80,80,80,${smoke.opacity})`)
        grad.addColorStop(1, 'transparent')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(smoke.x, smoke.y, smoke.radius, 0, Math.PI * 2)
        ctx.fill()
        if (smoke.opacity <= 0) smokeTrails.splice(i, 1)
      }

      // Тайминги появления
      if (performance.now() - lastMeteor > 15000 + Math.random() * 10000) {
        createMeteor()
        lastMeteor = performance.now()
      }

      if (performance.now() - lastStar > 5000 + Math.random() * 3000) {
        createShootingStar()
        lastStar = performance.now()
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
