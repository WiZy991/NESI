export default function TaskSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="p-4 sm:p-6 bg-black/40 border border-emerald-500/30 rounded-xl space-y-4 backdrop-blur-sm">
        {/* Заголовок */}
        <div className="h-6 bg-emerald-500/20 rounded w-3/4" />
        
        {/* Описание */}
        <div className="space-y-2">
          <div className="h-4 bg-emerald-500/10 rounded w-full" />
          <div className="h-4 bg-emerald-500/10 rounded w-5/6" />
          <div className="h-4 bg-emerald-500/10 rounded w-4/6" />
        </div>
        
        {/* Мета-информация */}
        <div className="flex flex-wrap gap-4 pt-2">
          <div className="h-4 bg-emerald-500/10 rounded w-20" />
          <div className="h-4 bg-emerald-500/10 rounded w-24" />
          <div className="h-4 bg-emerald-500/10 rounded w-32" />
        </div>
        
        {/* Бюджет и статус */}
        <div className="flex items-center justify-between pt-2 border-t border-emerald-500/10">
          <div className="h-5 bg-emerald-500/15 rounded w-28" />
          <div className="h-6 bg-emerald-500/10 rounded w-24" />
        </div>
      </div>
    </div>
  )
}

