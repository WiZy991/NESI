export default function ChatSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="p-4 bg-black/40 border border-emerald-500/30 rounded-xl backdrop-blur-sm"
        >
          <div className="flex items-start gap-3">
            {/* Аватар */}
            <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex-shrink-0" />
            
            {/* Контент */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <div className="h-4 bg-emerald-500/15 rounded w-32" />
                <div className="h-3 bg-emerald-500/10 rounded w-16" />
              </div>
              <div className="space-y-1.5">
                <div className="h-3 bg-emerald-500/10 rounded w-full" />
                <div className="h-3 bg-emerald-500/10 rounded w-3/4" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

