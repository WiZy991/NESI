'use client'

import { getLevelVisuals } from '@/lib/level/rewards'
import '@/styles/level-animations.css'

type LevelBadgeProps = {
  level: number
  showIcon?: boolean
  showName?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function LevelBadge({ 
  level, 
  showIcon = true, 
  showName = false,
  size = 'md' 
}: LevelBadgeProps) {
  const visuals = getLevelVisuals(level)
  
  if (!visuals.icon && !showName) {
    return null
  }

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  }

  const animationClass = level >= 6 
    ? 'level-6-animated level-shimmer' 
    : level === 5 
    ? 'level-5-animated' 
    : ''

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${sizeClasses[size]} ${animationClass} ${
        level >= 6
          ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-300 border border-yellow-400/30'
          : level === 5
          ? 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 text-yellow-300 border border-yellow-400/30'
          : level === 4
          ? 'bg-gradient-to-r from-purple-500/20 to-purple-600/20 text-purple-300 border border-purple-400/30'
          : level === 3
          ? 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-blue-300 border border-blue-400/30'
          : level === 2
          ? 'bg-gradient-to-r from-green-500/20 to-green-600/20 text-green-300 border border-green-400/30'
          : 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
      }`}
    >
      {showIcon && visuals.icon && (
        <span className={level >= 6 ? 'level-icon-rotate inline-block' : ''}>
          {visuals.icon}
        </span>
      )}
      {showName && <span>{visuals.name}</span>}
    </span>
  )
}

