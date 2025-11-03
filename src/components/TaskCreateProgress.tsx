'use client'

type TaskCreateProgressProps = {
  currentStep: number
  totalSteps: number
}

const steps = [
  { id: 1, label: 'Название' },
  { id: 2, label: 'Описание' },
  { id: 3, label: 'Категория' },
  { id: 4, label: 'Файлы' },
]

export default function TaskCreateProgress({
  currentStep,
  totalSteps,
}: TaskCreateProgressProps) {
  const progress = (currentStep / totalSteps) * 100

  return (
    <div className="w-full mb-6">
      {/* Прогресс-бар */}
      <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Шаги */}
      <div className="flex justify-between items-center text-xs">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`flex flex-col items-center gap-1 ${
              step.id <= currentStep ? 'text-emerald-400' : 'text-gray-500'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${
                step.id < currentStep
                  ? 'bg-emerald-500 border-emerald-500'
                  : step.id === currentStep
                  ? 'border-emerald-500 bg-emerald-500/20'
                  : 'border-gray-600 bg-transparent'
              }`}
            >
              {step.id < currentStep ? (
                <span className="text-white text-xs">✓</span>
              ) : (
                <span className="text-xs">{step.id}</span>
              )}
            </div>
            <span className="text-[10px] hidden sm:block">{step.label}</span>
          </div>
        ))}
      </div>

      {/* Текст прогресса */}
      <p className="text-xs text-gray-400 text-center mt-2">
        Шаг {currentStep} из {totalSteps}
      </p>
    </div>
  )
}

