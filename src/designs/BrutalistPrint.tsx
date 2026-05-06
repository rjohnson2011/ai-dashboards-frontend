import { useMemo, useState } from 'react'
import {
  type PullRequest,
  BACKEND_REVIEWERS,
  isReadyForReview,
  isTrulyExemptFromBackendReview,
} from '../types/pull-request'
import {
  type FilterKey,
  FILTERS,
  classifyStatus,
  reviewerBadgesFor,
  timeAgo,
  absoluteTime,
  nameFromHandle,
  countByFilter,
  applyFilter,
} from '../lib/dashboard'
import { displayUser } from '../lib/utils'

interface Props {
  pullRequests: PullRequest[]
}

const STATUS_GLYPH: Record<string, string> = {
  failing: '✕',
  changes_requested: '!',
  ci_pending: '○',
  approved: '✓',
  ready: '→',
  draft: '·',
  open: '·',
}

export default function BrutalistPrint({ pullRequests }: Props) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>('ready')
  const [searchTerm, setSearchTerm] = useState('')

  const counts = useMemo(() => countByFilter(pullRequests), [pullRequests])
  const filtered = useMemo(
    () => applyFilter(pullRequests, activeFilter, searchTerm),
    [pullRequests, activeFilter, searchTerm]
  )
  const heroNames = useMemo(
    () =>
      pullRequests
        .filter(isReadyForReview)
        .slice(0, 3)
        .map(pr => displayUser(pr.author).toUpperCase()),
    [pullRequests]
  )

  return (
    <div className="brutalist-shell min-h-[calc(100vh-48px)]">
      <BrutalistStyle />

      <div className="mx-auto max-w-[1480px] px-6 py-6">
        {/* Masthead */}
        <header className="border-y-[3px] border-black py-4 mb-6">
          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <div className="flex items-baseline gap-3">
              <span className="font-display text-[44px] leading-none tracking-[-0.04em] font-black">
                THE QUEUE
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.3em]">
                vol. iv · iss. 6
              </span>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.3em]">
              vets-api · platform-atlas · vets-api-mockdata
            </span>
          </div>
        </header>

        {/* Hero block — magazine spread */}
        <section className="grid grid-cols-12 border-y-[3px] border-black mb-6">
          <div className="col-span-12 md:col-span-7 border-r border-black p-6 md:p-8 relative">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] mb-2">
              On the desk
            </div>
            <div className="font-display font-black tracking-[-0.05em] leading-[0.78]">
              <span className="text-[220px] block" style={{ color: '#e8331c' }}>
                {String(counts.ready).padStart(2, '0')}
              </span>
            </div>
            <div className="font-display text-[28px] leading-tight tracking-tight mt-3 max-w-md">
              pull requests waiting on a backend reviewer.
            </div>
            {heroNames.length > 0 && (
              <div className="mt-5 font-mono text-[11px] uppercase tracking-[0.2em]">
                Authors of the moment ―{' '}
                <span className="font-display font-black tracking-tight not-italic">
                  {heroNames.join(' · ')}
                </span>
              </div>
            )}
          </div>

          <div className="col-span-12 md:col-span-5 p-6 md:p-8 grid grid-cols-2 gap-y-4 gap-x-6 content-start">
            <BrutalistStat label="Failing CI" value={counts.failing} accent />
            <BrutalistStat label="Approved" value={counts.approved} />
            <BrutalistStat label="Awaiting author" value={counts.awaiting} />
            <BrutalistStat label="Drafts" value={counts.drafts} />
            <BrutalistStat label="Dependabot" value={counts.dependabot} />
            <BrutalistStat label="All open" value={counts.all} />
          </div>
        </section>

        {/* Filter rail — index strip */}
        <nav className="border-b border-black mb-6">
          <div className="flex items-stretch divide-x divide-black overflow-x-auto">
            {FILTERS.map(f => {
              const isActive = activeFilter === f.key
              return (
                <button
                  key={f.key}
                  onClick={() => setActiveFilter(f.key)}
                  className={`flex-1 min-w-[110px] flex flex-col items-start px-3 py-2 transition-colors ${
                    isActive ? 'bg-black text-[var(--brut-bg)]' : 'hover:bg-black/5'
                  }`}
                >
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em]">
                    {String(counts[f.key]).padStart(2, '0')}
                  </span>
                  <span className="font-display font-black text-[15px] tracking-tight mt-1 leading-tight">
                    {f.label}
                  </span>
                </button>
              )
            })}
          </div>
        </nav>

        {/* Search */}
        <div className="mb-2 flex items-baseline gap-3 flex-wrap border-b border-black/40 pb-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em]">Search</span>
          <input
            type="text"
            placeholder="title · author · repo · #number"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[200px] bg-transparent outline-none font-mono text-sm placeholder:text-black/35"
          />
          <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.22em]">
            {filtered.length} of {counts.all}
          </span>
        </div>

        {/* Listings */}
        <section>
          <div className="grid grid-cols-[34px_1fr_180px_180px_120px] gap-x-4 px-3 py-2 border-b-[3px] border-black">
            <ColHead>NO.</ColHead>
            <ColHead>Pull request</ColHead>
            <ColHead>Status</ColHead>
            <ColHead>Reviewers</ColHead>
            <ColHead align="right">Activity</ColHead>
          </div>

          {filtered.length === 0 ? (
            <BrutalistEmpty filterKey={activeFilter} hasSearch={!!searchTerm} />
          ) : (
            filtered.map((pr, idx) => <BrutalistRow key={pr.id} pr={pr} idx={idx + 1} />)
          )}
        </section>
      </div>
    </div>
  )
}

function BrutalistStat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="border-t-[2px] border-black pt-2">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em]">{label}</div>
      <div
        className="font-display font-black tracking-[-0.04em] text-[44px] leading-none mt-1 tabular-nums"
        style={{ color: accent ? '#e8331c' : '#0a0a0a' }}
      >
        {value}
      </div>
    </div>
  )
}

function ColHead({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <span className={`font-mono text-[10px] uppercase tracking-[0.3em] ${align === 'right' ? 'text-right' : ''}`}>
      {children}
    </span>
  )
}

function BrutalistRow({ pr, idx }: { pr: PullRequest; idx: number }) {
  const status = classifyStatus(pr)
  const reviewers = reviewerBadgesFor(pr)
  const exempt = isTrulyExemptFromBackendReview(pr)
  const isFailing = status.key === 'failing' || status.key === 'changes_requested'
  const beApproved = pr.approval_summary?.approved_users?.some(u => BACKEND_REVIEWERS.includes(u))

  return (
    <button
      className="group w-full grid grid-cols-[34px_1fr_180px_180px_120px] items-start gap-x-4 px-3 py-3 border-b border-black/30 last:border-0 text-left hover:bg-black hover:text-[var(--brut-bg)] transition-colors"
      onClick={() => window.open(pr.url, '_blank', 'noopener,noreferrer')}
    >
      <span className="font-mono text-[10px] tabular-nums text-black/45 group-hover:text-[var(--brut-bg)]/60 mt-1">
        {String(idx).padStart(3, '0')}
      </span>

      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-mono text-[10px] tabular-nums text-black/55 group-hover:text-[var(--brut-bg)]/65">
            #{pr.number}
          </span>
          <span className="font-mono text-[10px] tracking-wide uppercase text-black/55 group-hover:text-[var(--brut-bg)]/65">
            {pr.repository_name}
          </span>
          {pr.draft && (
            <span className="font-mono text-[9px] uppercase tracking-[0.22em] border border-current px-1">
              draft
            </span>
          )}
          {exempt && (
            <span className="font-mono text-[9px] uppercase tracking-[0.22em] border border-current px-1">
              exempt
            </span>
          )}
        </div>
        <div className="font-display font-bold text-[18px] leading-snug tracking-[-0.01em] truncate">
          {pr.title}
        </div>
        <div className="font-mono text-[11px] uppercase tracking-[0.18em] mt-1 text-black/60 group-hover:text-[var(--brut-bg)]/75">
          By {displayUser(pr.author)}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <span
          className="inline-flex items-baseline gap-2 self-start font-display font-black uppercase tracking-tight text-[16px]"
          style={{ color: isFailing ? '#e8331c' : 'inherit' }}
        >
          <span className="font-mono text-[10px] tracking-[0.3em] opacity-60">
            {STATUS_GLYPH[status.key] || '·'}
          </span>
          {status.label}
        </span>
        {pr.changes_requested_info?.message && (
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/60 group-hover:text-[var(--brut-bg)]/70 line-clamp-1">
            {pr.changes_requested_info.message}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap min-h-[22px]">
        {reviewers.length === 0 ? (
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-black/45 group-hover:text-[var(--brut-bg)]/55">
            none
          </span>
        ) : (
          reviewers.slice(0, 3).map(({ user, state }) => (
            <span
              key={user + state}
              className="font-mono text-[10px] uppercase tracking-[0.18em] border border-current px-1 py-px"
              style={state === 'changes_requested' ? { color: '#e8331c' } : {}}
              title={`${state.replace('_', ' ')}`}
            >
              {nameFromHandle(user)}
            </span>
          ))
        )}
        {reviewers.length > 3 && (
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-black/45 group-hover:text-[var(--brut-bg)]/55">
            +{reviewers.length - 3}
          </span>
        )}
        {beApproved && (
          <span
            className="font-mono text-[9px] uppercase tracking-[0.2em] px-1 py-px"
            style={{ color: '#0a0a0a', backgroundColor: '#9ab877' }}
            title="Backend approved"
          >
            BE
          </span>
        )}
      </div>

      <div
        className="text-right font-mono text-[10px] tabular-nums leading-tight uppercase tracking-[0.16em]"
        title={`Updated ${absoluteTime(pr.updated_at)}\nCreated ${absoluteTime(pr.created_at)}`}
      >
        <div>{timeAgo(pr.updated_at)} ago</div>
        <div className="text-black/50 group-hover:text-[var(--brut-bg)]/55 mt-0.5">
          opened {timeAgo(pr.created_at)}
        </div>
      </div>
    </button>
  )
}

function BrutalistEmpty({ filterKey, hasSearch }: { filterKey: FilterKey; hasSearch: boolean }) {
  if (hasSearch) {
    return (
      <div className="px-6 py-20 text-center">
        <div className="font-display font-black text-[60px] leading-none tracking-[-0.04em]">NO MATCH.</div>
        <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.3em]">Try another term</div>
      </div>
    )
  }
  const titles: Record<FilterKey, string> = {
    ready: 'CAUGHT UP.',
    awaiting: 'INBOX ZERO.',
    failing: 'ALL GREEN.',
    drafts: 'NO DRAFTS.',
    dependabot: 'NONE.',
    approved: 'NONE.',
    all: 'EMPTY.',
  }
  return (
    <div className="px-6 py-24 text-center">
      <div className="font-display font-black text-[80px] leading-none tracking-[-0.04em]" style={{ color: '#e8331c' }}>
        {titles[filterKey]}
      </div>
    </div>
  )
}

function BrutalistStyle() {
  return (
    <style>{`
      .brutalist-shell {
        --brut-bg: #f3ede0;
        background-color: var(--brut-bg);
        color: #0a0a0a;
        background-image:
          repeating-linear-gradient(0deg, rgba(0,0,0,0.025) 0 1px, transparent 1px 3px);
      }
      .brutalist-shell .font-display {
        font-family: 'Archivo Black', 'Helvetica Neue Bold Condensed', Impact, sans-serif;
        font-weight: 900;
      }
      .brutalist-shell .font-mono {
        font-family: 'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace;
      }
    `}</style>
  )
}
