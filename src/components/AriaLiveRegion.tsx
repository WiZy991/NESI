'use client'

import { useEffect, useRef } from 'react'

export default function AriaLiveRegion() {
  const liveRegionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Создаем область для aria-live уведомлений
    if (!liveRegionRef.current) {
      const region = document.createElement('div')
      region.setAttribute('role', 'status')
      region.setAttribute('aria-live', 'polite')
      region.setAttribute('aria-atomic', 'true')
      region.className = 'sr-only'
      region.style.cssText = 'position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border-width: 0;'
      document.body.appendChild(region)
      liveRegionRef.current = region as any
    }
  }, [])

  return null
}

