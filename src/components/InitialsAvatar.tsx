interface Props {
  name: string
  size?: number
  className?: string
}

function getInitials(name: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/[\s-]+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

// Deterministic hue per name so the same person always gets the same color.
function colorClasses(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const palette = [
    'bg-teal-700 text-teal-50',
    'bg-emerald-700 text-emerald-50',
    'bg-cyan-700 text-cyan-50',
    'bg-sky-700 text-sky-50',
    'bg-indigo-700 text-indigo-50',
    'bg-violet-700 text-violet-50',
    'bg-fuchsia-700 text-fuchsia-50',
    'bg-rose-700 text-rose-50',
    'bg-amber-700 text-amber-50',
    'bg-lime-700 text-lime-50',
  ]
  return palette[Math.abs(hash) % palette.length]
}

export default function InitialsAvatar({ name, size = 40, className = '' }: Props) {
  const initials = getInitials(name)
  const color = colorClasses(name)
  const fontSize = Math.max(10, Math.floor(size * 0.4))

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full font-medium border border-teal-500/30 ${color} ${className}`}
      style={{ width: size, height: size, fontSize }}
      aria-label={name}
      title={name}
    >
      {initials}
    </div>
  )
}
