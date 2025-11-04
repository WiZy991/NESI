'use client'

import { useMemo } from 'react'
import Image from 'next/image'

type BadgeIconProps = {
  icon: string
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

// Маппинг эмодзи на CSS-стили для игровых иконок
const getBadgeStyle = (icon: string, name: string) => {
  const iconLower = icon.toLowerCase()
  const nameLower = name.toLowerCase()

  // Определяем тип бейджа по иконке или названию
  if (nameLower.includes('первый') || nameLower.includes('шаг') || icon.includes('🌱')) {
    return {
      gradient: 'from-gray-700 via-gray-600 to-gray-700',
      border: 'border-gray-500/60',
      glow: '0_0_15px_rgba(156,163,175,0.4)',
      iconBg: 'bg-gray-900/90'
    }
  }
  if (nameLower.includes('исполнитель') || icon.includes('⚔️')) {
    return {
      gradient: 'from-blue-700 via-blue-600 to-blue-700',
      border: 'border-blue-500/60',
      glow: '0_0_25px_rgba(59,130,246,0.6)',
      iconBg: 'bg-blue-900/90'
    }
  }
  if (nameLower.includes('ветеран') || nameLower.includes('поле') || icon.includes('🛡️')) {
    return {
      gradient: 'from-green-700 via-green-600 to-green-700',
      border: 'border-green-500/60',
      glow: '0_0_25px_rgba(34,197,94,0.6)',
      iconBg: 'bg-green-900/90'
    }
  }
  if (nameLower.includes('мастер') || nameLower.includes('дела') || icon.includes('👑')) {
    return {
      gradient: 'from-yellow-700 via-yellow-600 to-yellow-700',
      border: 'border-yellow-500/60',
      glow: '0_0_30px_rgba(234,179,8,0.7)',
      iconBg: 'bg-yellow-900/90'
    }
  }
  if (nameLower.includes('легенда') || nameLower.includes('платформы') || icon.includes('💎')) {
    return {
      gradient: 'from-purple-700 via-purple-600 to-purple-700',
      border: 'border-purple-500/60',
      glow: '0_0_35px_rgba(168,85,247,0.8)',
      iconBg: 'bg-purple-900/90'
    }
  }
  if (nameLower.includes('ученик') || nameLower.includes('мудрости') || icon.includes('📜')) {
    return {
      gradient: 'from-orange-700 via-orange-600 to-orange-700',
      border: 'border-orange-500/60',
      glow: '0_0_25px_rgba(249,115,22,0.6)',
      iconBg: 'bg-orange-900/90'
    }
  }
  if (nameLower.includes('хранитель') || nameLower.includes('знаний') || icon.includes('🎓')) {
    return {
      gradient: 'from-indigo-700 via-indigo-600 to-indigo-700',
      border: 'border-indigo-500/60',
      glow: '0_0_30px_rgba(99,102,241,0.7)',
      iconBg: 'bg-indigo-900/90'
    }
  }
  if (nameLower.includes('звёздный') || nameLower.includes('профи') || icon.includes('⭐')) {
    return {
      gradient: 'from-amber-700 via-amber-600 to-amber-700',
      border: 'border-amber-500/60',
      glow: '0_0_30px_rgba(245,158,11,0.7)',
      iconBg: 'bg-amber-900/90'
    }
  }
  if (nameLower.includes('любимец') || nameLower.includes('клиентов') || icon.includes('💝')) {
    return {
      gradient: 'from-pink-700 via-pink-600 to-pink-700',
      border: 'border-pink-500/60',
      glow: '0_0_30px_rgba(236,72,153,0.7)',
      iconBg: 'bg-pink-900/90'
    }
  }
  if (nameLower.includes('странник') || nameLower.includes('опыта') || icon.includes('🔥')) {
    return {
      gradient: 'from-red-700 via-red-600 to-red-700',
      border: 'border-red-500/60',
      glow: '0_0_25px_rgba(239,68,68,0.6)',
      iconBg: 'bg-red-900/90'
    }
  }
  if (nameLower.includes('всех времён') || icon.includes('🌟')) {
    return {
      gradient: 'from-cyan-700 via-cyan-600 to-cyan-700',
      border: 'border-cyan-500/60',
      glow: '0_0_35px_rgba(6,182,212,0.8)',
      iconBg: 'bg-cyan-900/90'
    }
  }
  if (nameLower.includes('возвышенный') || nameLower.includes('божественный') || icon.includes('🚀') || icon.includes('💫')) {
    return {
      gradient: 'from-violet-700 via-violet-600 to-violet-700',
      border: 'border-violet-500/60',
      glow: '0_0_35px_rgba(139,92,246,0.8)',
      iconBg: 'bg-violet-900/90'
    }
  }
  
  // Дополнительные бейджи
  if (nameLower.includes('быстрый') || nameLower.includes('удар') || icon.includes('🎯')) {
    return {
      gradient: 'from-red-700 via-red-600 to-red-700',
      border: 'border-red-500/60',
      glow: '0_0_25px_rgba(239,68,68,0.6)',
      iconBg: 'bg-red-900/80'
    }
  }
  
  // Дефолтный стиль для других бейджей
  return {
    gradient: 'from-emerald-700 via-emerald-600 to-emerald-700',
    border: 'border-emerald-500/50',
    glow: '0_0_20px_rgba(16,185,129,0.5)',
    iconBg: 'bg-emerald-800/80'
  }
}

export default function BadgeIcon({ icon, name, size = 'md', className = '' }: BadgeIconProps) {
  const isIconUrl = icon.startsWith('http') || icon.startsWith('/') || icon.includes('.')
  const style = useMemo(() => getBadgeStyle(icon, name), [icon, name])
  
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-28 h-28'
  }

  const iconSizeClasses = {
    sm: 'text-3xl',
    md: 'text-5xl',
    lg: 'text-6xl'
  }

  return (
    <div 
      className={`relative ${sizeClasses[size]} rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 ${className}`}
    >
      {/* Внешнее свечение - большой радиус */}
      <div className={`absolute -inset-2 rounded-full bg-gradient-to-br ${style.gradient} opacity-40 blur-md animate-pulse`}></div>
      
      {/* Основной круг с градиентом */}
      <div 
        className={`absolute inset-0 rounded-full bg-gradient-to-br ${style.gradient} ${style.border}`}
        style={{
          boxShadow: style.glow,
          borderWidth: '4px'
        }}
      ></div>
      
      {/* Внутренний круг с темным фоном для контраста */}
      <div className={`absolute inset-1.5 rounded-full ${style.iconBg} backdrop-blur-sm`}></div>
      
      {/* Внутренний градиент для глубины */}
      <div className="absolute inset-1.5 rounded-full bg-gradient-to-br from-black/50 via-transparent to-white/15"></div>
      
      {/* Блестящие ободки для объема */}
      <div className="absolute inset-0 rounded-full border-2 border-white/40"></div>
      <div className="absolute inset-1 rounded-full border border-white/20"></div>
      <div className="absolute inset-2 rounded-full border border-black/40"></div>
      
      {/* Иконка с эффектом свечения */}
      <div className="relative z-10 flex items-center justify-center">
        {isIconUrl ? (
          <Image
            src={icon}
            alt={name}
            width={size === 'sm' ? 48 : size === 'md' ? 64 : 80}
            height={size === 'sm' ? 48 : size === 'md' ? 64 : 80}
            className="w-2/3 h-2/3 object-contain drop-shadow-[0_0_12px_rgba(255,255,255,0.7)] filter brightness-125 contrast-110"
          />
        ) : (
          <span className={`${iconSizeClasses[size]} drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] filter brightness-125 contrast-110`}>
            {icon}
          </span>
        )}
      </div>
      
      {/* Блестящий эффект при наведении */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/40 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
      
      {/* Анимация сияния - вращающийся блик */}
      <div className="absolute inset-0 rounded-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
      </div>
      
      {/* Дополнительное внутреннее свечение */}
      <div className={`absolute inset-2 rounded-full ${style.gradient} opacity-20 blur-sm`}></div>
    </div>
  )
}

