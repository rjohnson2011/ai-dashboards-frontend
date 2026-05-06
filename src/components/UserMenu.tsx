import { useState } from 'react'
import { authService } from '../services/auth'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'

function firstName(fullName: string | undefined): string {
  if (!fullName) return ''
  return fullName.trim().split(/\s+/)[0]
}

function initials(name: string | undefined, email: string | undefined): string {
  if (name) {
    const parts = name.trim().split(/\s+/).filter(Boolean)
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
  }
  return (email?.[0] ?? '?').toUpperCase()
}

function colorFor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash)
  const palette = [
    'bg-teal-600',
    'bg-sky-600',
    'bg-indigo-600',
    'bg-violet-600',
    'bg-fuchsia-600',
    'bg-rose-600',
    'bg-amber-600',
    'bg-emerald-600',
    'bg-cyan-600',
  ]
  return palette[Math.abs(hash) % palette.length]
}

export default function UserMenu() {
  const user = authService.getUser()
  const [imgFailed, setImgFailed] = useState(false)
  if (!user) return null

  const display = firstName(user.name) || user.email
  const showImage = !!user.picture && !imgFailed
  const seed = user.email || user.name || '?'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full px-2 py-1 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className="relative inline-flex h-8 w-8 shrink-0 overflow-hidden rounded-full">
          {showImage ? (
            <img
              src={user.picture}
              alt={user.name || user.email}
              referrerPolicy="no-referrer"
              crossOrigin="anonymous"
              onError={() => setImgFailed(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <span
              className={`flex h-full w-full items-center justify-center text-xs font-medium text-white ${colorFor(seed)}`}
            >
              {initials(user.name, user.email)}
            </span>
          )}
        </span>
        <span className="hidden sm:inline max-w-[120px] truncate">{display}</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{user.name || display}</span>
            <span className="truncate text-xs text-muted-foreground">{user.email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => authService.logout()}>
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
