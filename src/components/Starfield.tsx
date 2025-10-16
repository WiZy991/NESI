'use client'

import { useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [showMeteor, setShowMeteor] = useState(false)
  const [meteorKey, setMeteorKey] = useState(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = window.innerWidth
    let height = window.innerHeight
    canvas.width = width
    canvas.height = height

    const stars = Array.from({ length: 250 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.3 + 0.4,
      alpha: Math.random(),
      speed: Math.random() * 0.25 + 0.05,
    }))

    const meteors: any[] = []
    let lastMeteor = 0
    let lastFarMeteor = 0

    const createMeteor = (isFar = false) => {
      const startX = Math.random() * width
      const startY = Math.random() * height * 0.3
      const angle = isFar
        ? Math.random() * Math.PI * 0.15 + Math.PI / 2.8
        : Math.random() * Math.PI * 0.25 + Math.PI / 3
      const len = isFar ? width * 0.7 : Math.random() * 250 + 200

      meteors.push({
        x: startX,
        y: startY,
        len,
        speed: isFar ? 1.2 : Math.random() * 2 + 1,
        angle,
        opacity: 1,
        hue: 40 + Math.random() * 10,
        far: isFar,
        size: isFar ? 12 : 8,
        smoke: [],
      })
    }

    const draw = () => {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.fillRect(0, 0, width, height)

      // 🌟 Звёзды
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
        if (m.far) {
          m.opacity -= 0.0015
          m.size *= 0.995
        } else {
          m.opacity -= 0.003
        }

        m.smoke.push({
          x: m.x - Math.cos(m.angle) * 10,
          y: m.y - Math.sin(m.angle) * 10,
          opacity: 0.15,
          radius: 6,
        })

        for (let j = m.smoke.length - 1; j >= 0; j--) {
          const s = m.smoke[j]
          s.opacity -= 0.002
          s.radius += 0.25
          const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.radius)
          grad.addColorStop(0, `rgba(80,80,80,${s.opacity})`)
          grad.addColorStop(1, 'transparent')
          ctx.fillStyle = grad
          ctx.beginPath()
          ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2)
          ctx.fill()
          if (s.opacity <= 0) m.smoke.splice(j, 1)
        }

        const grad = ctx.createLinearGradient(
          m.x,
          m.y,
          m.x - Math.cos(m.angle) * m.len,
          m.y - Math.sin(m.angle) * m.len
        )
        grad.addColorStop(0, `hsla(${m.hue}, 100%, 70%, ${m.opacity})`)
        grad.addColorStop(0.3, `hsla(${m.hue}, 90%, 55%, ${m.opacity * 0.6})`)
        grad.addColorStop(1, 'transparent')

        ctx.beginPath()
        ctx.strokeStyle = grad
        ctx.lineWidth = 3
        ctx.moveTo(m.x, m.y)
        ctx.lineTo(
          m.x - Math.cos(m.angle) * m.len,
          m.y - Math.sin(m.angle) * m.len
        )
        ctx.stroke()

        const head = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.size * 2)
        head.addColorStop(0, `rgba(255,255,255,${m.opacity})`)
        head.addColorStop(0.3, `rgba(255,200,100,${m.opacity * 0.8})`)
        head.addColorStop(1, 'transparent')
        ctx.fillStyle = head
        ctx.beginPath()
        ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2)
        ctx.fill()

        if (
          m.x > width + 200 ||
          m.y > height + 200 ||
          m.x < -200 ||
          m.y < -200 ||
          m.opacity <= 0
        ) {
          meteors.splice(i, 1)
        }
      }

      const now = performance.now()
      if (now - lastMeteor > 8000 + Math.random() * 4000) {
        createMeteor(false)
        lastMeteor = now
      }

      if (now - lastFarMeteor > 15000 + Math.random() * 8000) {
        createMeteor(true)
        lastFarMeteor = now
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
    }
  }, [])

  // 💫 Реальный метеорит с PNG
  useEffect(() => {
    const timer = setInterval(() => {
      setMeteorKey((k) => k + 1)
      setShowMeteor(true)
      setTimeout(() => setShowMeteor(false), 5000)
    }, 12000)
    return () => clearInterval(timer)
  }, [])

  return (
    <>
      <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none" />
      <AnimatePresence>
        {showMeteor && (
          <motion.img
            key={meteorKey}
            src="/meteor.png"
            alt="meteor"
            className="fixed pointer-events-none z-10 w-[180px] opacity-80"
            initial={{
              x: -200,
              y: Math.random() * window.innerHeight * 0.3,
              scale: 1.2,
              rotate: -35,
            }}
            animate={{
              x: window.innerWidth + 200,
              y: window.innerHeight + 200,
              opacity: [0, 1, 1, 0],
              scale: [1.2, 0.9],
            }}
            transition={{
              duration: 5.5,
              ease: 'easeInOut',
            }}
          />
        )}
      </AnimatePresence>
    </>
  )
}
