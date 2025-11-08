'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

interface AnimatedCheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  id?: string
  className?: string
}

export function AnimatedCheckbox({ checked, onChange, id, className = '' }: AnimatedCheckboxProps) {
  return (
    <label
      htmlFor={id}
      className={`relative inline-flex items-center cursor-pointer ${className}`}
    >
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <motion.div
        className={`relative w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
          checked
            ? 'bg-emerald-500 border-emerald-500'
            : 'bg-transparent border-gray-600 hover:border-gray-500'
        }`}
        initial={false}
        animate={{
          scale: checked ? [1, 1.1, 1] : 1,
        }}
        transition={{
          duration: 0.2,
          ease: 'easeOut',
        }}
      >
        {checked && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{
              duration: 0.15,
              ease: 'easeOut',
            }}
          >
            <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
          </motion.div>
        )}
      </motion.div>
    </label>
  )
}

