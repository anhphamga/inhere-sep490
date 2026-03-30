import { Star } from 'lucide-react'

export default function StarRating({
  value = 0,
  onChange,
  size = 18,
  disabled = false,
}) {
  const currentValue = Number(value || 0)

  return (
    <div className="inline-flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= currentValue
        return (
          <button
            key={star}
            type="button"
            disabled={disabled || typeof onChange !== 'function'}
            onClick={() => onChange?.(star)}
            className={`transition ${disabled ? 'cursor-not-allowed' : 'hover:scale-105'}`}
            aria-label={`${star} sao`}
          >
            <Star
              size={size}
              className={active ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
            />
          </button>
        )
      })}
    </div>
  )
}
