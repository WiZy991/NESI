'use client'

import { LucideIcon } from 'lucide-react'
import Link from 'next/link'

type EmptyStateProps = {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6 shadow-[0_0_25px_rgba(16,185,129,0.3)]">
        <Icon className="w-10 h-10 text-emerald-400" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400 mb-6 max-w-md leading-relaxed">{description}</p>
      {actionLabel && (actionHref || onAction) && (
        <div>
          {actionHref ? (
            <Link
              href={actionHref}
              className="inline-block px-6 py-3 bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 rounded-lg hover:bg-emerald-500/30 transition-all duration-300 font-medium shadow-[0_0_15px_rgba(16,185,129,0.3)]"
            >
              {actionLabel}
            </Link>
          ) : (
            <button
              onClick={onAction}
              className="px-6 py-3 bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 rounded-lg hover:bg-emerald-500/30 transition-all duration-300 font-medium shadow-[0_0_15px_rgba(16,185,129,0.3)]"
            >
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

