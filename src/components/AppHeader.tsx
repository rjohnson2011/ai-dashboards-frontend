import { Link } from 'react-router-dom'
import UserMenu from './UserMenu'
import { APP_VERSION } from '../version'

// Refined-minimal app header used across /dashboard and /redesign.
//
// Variants:
// - 'classic'  → links to Sprint Metrics + the Try-redesign tease
// - 'gallery'  → renders the design-switcher segmented control instead
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
            <span className="text-neutral-700 dark:text-zinc-300">
              {props.designs.find(d => d.key === props.activeKey)?.label}
            </span>
            <span className="mx-2 text-neutral-300 dark:text-zinc-700">·</span>
            {props.activeBlurb}
          </p>
        </div>
      )}
    </header>
  )
}

function BrandMark() {
  return (
    <Link to="/dashboard" className="flex items-center gap-2 group shrink-0">
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
      <NavLink to="/sprint-metrics">Sprint Metrics</NavLink>
      <NavLink to="/redesign" accent>
        Gallery
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
  activeKey,
  onSelect,
}: {
  designs: AppHeaderDesign[]
  activeKey: string
  onSelect: (key: string) => void
}) {
  return (
    <>
      <div className="hidden md:flex items-center rounded-lg bg-neutral-100/80 p-0.5 ring-1 ring-neutral-200/80 dark:bg-zinc-900/80 dark:ring-zinc-800/80">
        {designs.map(d => {
          const isActive = d.key === activeKey
          return (
            <button
              key={d.key}
              type="button"
              onClick={() => onSelect(d.key)}
              title={d.blurb}
              className={
                isActive
                  ? 'rounded-md bg-white px-3 py-1 text-[13px] font-medium text-neutral-900 shadow-sm dark:bg-zinc-100 dark:text-zinc-900'
                  : 'rounded-md px-3 py-1 text-[13px] font-medium text-neutral-500 hover:text-neutral-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors'
              }
            >
              {d.label}
            </button>
          )
        })}
      </div>
      <select
        value={activeKey}
        onChange={e => onSelect(e.target.value)}
        className="md:hidden rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
      >
        {designs.map(d => (
          <option key={d.key} value={d.key}>
            {d.label}
          </option>
        ))}
      </select>
      <Link
        to="/dashboard"
        className="hidden sm:inline text-xs text-neutral-500 hover:text-neutral-900 dark:text-zinc-500 dark:hover:text-zinc-200 transition-colors"
      >
        ← Classic
      </Link>
    </>
  )
}

function UpdatedBadge({ lastUpdated }: { lastUpdated: string | Date | null }) {
  if (!lastUpdated) {
    return (
      <span className="hidden lg:inline text-[11px] text-neutral-400 dark:text-zinc-500">
        v{APP_VERSION.version}
      </span>
    )
  }
  const dt = typeof lastUpdated === 'string' ? new Date(lastUpdated) : lastUpdated
  const ago = formatAgo(dt)
  return (
    <span
      className="hidden md:inline text-[11px] tabular-nums text-neutral-500 dark:text-zinc-500"
      title={dt.toLocaleString()}
    >
      Updated {ago}
      <span className="mx-1.5 text-neutral-300 dark:text-zinc-700">·</span>
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
