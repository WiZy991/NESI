'use client'

import { Building2, Briefcase, UserRound, User } from 'lucide-react'

type AccountType = 'INDIVIDUAL' | 'SELF_EMPLOYED' | 'SOLE_PROPRIETOR' | 'COMPANY'

interface AccountTypeBadgeProps {
  accountType: AccountType | string | null | undefined
  companyName?: string | null // Название компании для ООО/ИП
  size?: 'xs' | 'sm' | 'md'
  className?: string
  showLabel?: boolean
}

const accountTypeConfig: Record<AccountType, {
  icon: typeof User
  label: string
  shortLabel: string
  bgColor: string
}> = {
  INDIVIDUAL: {
    icon: User,
    label: 'Физическое лицо',
    shortLabel: 'Физ. лицо',
    bgColor: 'bg-slate-500/20 border-slate-500/40 text-slate-300',
  },
  SELF_EMPLOYED: {
    icon: UserRound,
    label: 'Самозанятый',
    shortLabel: 'Самозанятый',
    bgColor: 'bg-purple-500/20 border-purple-500/40 text-purple-300',
  },
  SOLE_PROPRIETOR: {
    icon: Briefcase,
    label: 'Индивидуальный предприниматель',
    shortLabel: 'ИП',
    bgColor: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
  },
  COMPANY: {
    icon: Building2,
    label: 'Компания',
    shortLabel: 'Компания',
    bgColor: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
  },
}

const sizeConfig = {
  xs: {
    container: 'px-1.5 py-0.5 text-[10px] gap-0.5',
    icon: 'w-2.5 h-2.5',
  },
  sm: {
    container: 'px-2 py-0.5 text-xs gap-1',
    icon: 'w-3 h-3',
  },
  md: {
    container: 'px-2.5 py-1 text-sm gap-1.5',
    icon: 'w-4 h-4',
  },
}

export default function AccountTypeBadge({
  accountType,
  companyName,
  size = 'sm',
  className = '',
  showLabel = true,
}: AccountTypeBadgeProps) {
  // Если тип аккаунта не указан или это физическое лицо — можно не показывать бейдж
  if (!accountType || accountType === 'INDIVIDUAL') {
    return null
  }

  const config = accountTypeConfig[accountType as AccountType]
  if (!config) return null

  const sizeStyles = sizeConfig[size]
  const Icon = config.icon

  // Определяем что показывать в бейдже
  // Если есть название компании — показываем его, иначе тип аккаунта
  const displayLabel = companyName || config.shortLabel
  const fullLabel = companyName ? `${config.label}: ${companyName}` : config.label

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${sizeStyles.container} ${config.bgColor} ${className}`}
      title={fullLabel}
    >
      <Icon className={sizeStyles.icon} />
      {showLabel && <span className='truncate max-w-[150px]'>{displayLabel}</span>}
    </span>
  )
}

// Экспортируем функцию для получения полного названия типа аккаунта
export function getAccountTypeLabel(accountType: AccountType | string | null | undefined): string {
  if (!accountType) return 'Физическое лицо'
  const config = accountTypeConfig[accountType as AccountType]
  return config?.label || 'Физическое лицо'
}
