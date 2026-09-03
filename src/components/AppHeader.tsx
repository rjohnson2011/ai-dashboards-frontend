import { Link } from 'react-router-dom'
import { BarChart3, Check, ChevronDown } from 'lucide-react'
import UserMenu from './UserMenu'
import { APP_VERSION } from '../version'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'

// Refined-minimal app header used across /dashboard and /redesign.
//
// Variants:
// - 'classic'  → links to Sprint Analytics + the Dashboard
// - 'gallery'  → the main-view button, an "Other Views" menu for the
//                alternate designs, and a Sprint Analytics button
//
// Both share the same shell, divider, type scale and right-side meta
// cluster (updated-ago · refresh · user). The goal is for the chrome
// to feel like one product, with the inner controls swapping per route.

export interface AppHeaderDesign {
  key: string
  label: string
  blurb?: string
}

interface BaseProps {
  lastUpdated?: string | Date | null
}

interface ClassicProps extends BaseProps {
  variant: 'classic'
}

interface GalleryProps extends BaseProps {
  variant: 'gallery'
  designs: AppHeaderDesign[]
  // The design that is the product's main view. It gets its own button;
  // everything else lives behind "Other Views".
  primaryKey: string
  activeKey: string
  onSelect: (key: string) => void
  activeBlurb?: string
}

type Props = ClassicProps | GalleryProps

export default function AppHeader(props: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200/80 bg-white/80 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-14 max-w-[1480px] items-center gap-4 px-5 sm:px-7">
        <BrandMark />

        {props.variant === 'classic' ? (
          <ClassicNav />
        ) : (
          <GallerySwitcher
            designs={props.designs}
            primaryKey={props.primaryKey}
            activeKey={props.activeKey}
            onSelect={props.onSelect}
          />
        )}

        <div className="ml-auto flex items-center gap-3 sm:gap-4">
          <UpdatedBadge lastUpdated={props.lastUpdated ?? null} />
          <UserMenu />
        </div>
      </div>

      {props.variant === 'gallery' && props.activeBlurb && (
        <div className="mx-auto max-w-[1480px] px-5 sm:px-7 pb-2">
          <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-neutral-400 dark:text-zinc-500">
            {props.activeBlurb}
          </p>
        </div>
      )}
    </header>
  )
}

function BrandMark() {
  return (
    <Link to="/" className="flex items-center gap-2 group shrink-0">
      <span
        aria-hidden
        className="inline-block h-2 w-2 rounded-full bg-indigo-500 group-hover:bg-indigo-400 transition-colors"
      />
      <span className="font-medium tracking-tight text-[15px] text-neutral-900 dark:text-zinc-100">
        PR Dashboard
      </span>
    </Link>
  )
}

function ClassicNav() {
  return (
    <nav className="flex items-center gap-1 sm:gap-2 text-[13px]">
      <NavLink to="/sprint-metrics">Sprint Analytics</NavLink>
      <NavLink to="/" accent>
        Dashboard
      </NavLink>
    </nav>
  )
}

function NavLink({ to, children, accent }: { to: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <Link
      to={to}
      className={
        accent
          ? 'rounded-md px-2.5 py-1.5 font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-500/10 transition-colors'
          : 'rounded-md px-2.5 py-1.5 font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-900 transition-colors'
      }
    >
      {children}
    </Link>
  )
}

function GallerySwitcher({
  designs,
  primaryKey,
  activeKey,
  onSelect,
}: {
  designs: AppHeaderDesign[]
  primaryKey: string
  activeKey: string
  onSelect: (key: string) => void
}) {
  const primary = designs.find(d => d.key === primaryKey) ?? designs[0]
  const others = designs.filter(d => d.key !== primary.key)
  const primaryActive = activeKey === primary.key

  return (
    <nav className="flex items-center gap-1.5 sm:gap-2 text-[13px]">
      <button
        type="button"
        aria-pressed={primaryActive}
        onClick={() => onSelect(primary.key)}
        title={primary.blurb}
        // index.css has an unlayered `.dark button { color: var(--foreground) }`
        // that outguns Tailwind's dark:text-zinc-900 on the active pill,
        // rendering white-on-white. Inline wins over everything.
        style={primaryActive ? { color: '#18181b' } : undefined}
        className={
          primaryActive
            ? 'rounded-md bg-neutral-900 px-3 py-1.5 font-medium text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-900'
            : 'rounded-md px-3 py-1.5 font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100 transition-colors'
        }
      >
        {primary.label}
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger
          className={
            primaryActive
              ? 'inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400'
              : 'inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2.5 py-1.5 font-medium text-neutral-900 ring-1 ring-neutral-200 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-zinc-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400'
          }
        >
          Other Views
          <ChevronDown aria-hidden className="h-3.5 w-3.5 opacity-70" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-64"
          // The gallery pages paint their own dark ground, where the popover
          // tokens resolve to transparent; pin the surface so the menu never
          // bleeds into the board behind it.
          style={{ background: '#11151D', border: '1px solid rgba(148,163,184,0.2)', color: '#FFFFFF' }}
        >
          {others.map(d => {
            const isActive = d.key === activeKey
            return (
              <DropdownMenuItem
                key={d.key}
                onSelect={() => onSelect(d.key)}
                className="flex items-start gap-2 py-2"
              >
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                  {isActive && <Check aria-hidden className="h-3.5 w-3.5" />}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-[13px] font-medium">{d.label}</span>
                  {d.blurb && (
                    <span className="truncate text-[11px] text-muted-foreground">{d.blurb}</span>
                  )}
                </span>
              </DropdownMenuItem>
            )
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild className="py-2">
            <Link to="/classic" className="flex items-start gap-2">
              <span className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="flex flex-col">
                <span className="text-[13px] font-medium">Classic table</span>
                <span className="text-[11px] text-muted-foreground">The original full-width PR table</span>
              </span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Link
        to="/sprint-metrics"
        className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-500/10 transition-colors"
      >
        <BarChart3 aria-hidden className="h-3.5 w-3.5" />
        Sprint Analytics
      </Link>
    </nav>
  )
}

function UpdatedBadge({ lastUpdated }: { lastUpdated: string | Date | null }) {
  if (!lastUpdated) {
    return (
      <span className="hidden lg:inline text-[11px] text-neutral-500 dark:text-white">
        v{APP_VERSION.version}
      </span>
    )
  }
  const dt = typeof lastUpdated === 'string' ? new Date(lastUpdated) : lastUpdated
  const ago = formatAgo(dt)
  return (
    <span
      className="hidden md:inline text-[11px] tabular-nums text-neutral-500 dark:text-white"
      title={dt.toLocaleString()}
    >
      Updated {ago}
      <span className="mx-1.5 text-neutral-300 dark:text-white/60">·</span>
      v{APP_VERSION.version}
    </span>
  )
}


function formatAgo(dt: Date): string {
  const secs = Math.max(0, Math.floor((Date.now() - dt.getTime()) / 1000))
  if (secs < 60) return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}
