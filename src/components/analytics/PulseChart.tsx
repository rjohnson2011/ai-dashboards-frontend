import { useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { A, SERIES, prefersReducedMotion } from './theme'
import type { DayPoint } from '../../lib/analytics'

interface Props {
  data: DayPoint[]
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function shortDate(key: string): string {
  const [, m, d] = key.split('-')
  return `${MONTHS[Number(m) - 1]} ${Number(d)}`
}

function longDate(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

interface TipPayload {
  payload?: DayPoint
}

function PulseTooltip({ active, payload }: { active?: boolean; payload?: TipPayload[] }) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null
  const total = point.human + point.dependabot
  return (
    <div
      className="rounded-md px-3 py-2"
      style={{ background: A.bg, border: `1px solid ${A.line}`, color: A.text, fontSize: 12, minWidth: 168 }}
    >
      <div style={{ fontWeight: 500, marginBottom: 4 }}>{longDate(point.date)}</div>
      <TipRow color={SERIES.human.color} label={SERIES.human.label} value={point.human} />
      <TipRow color={SERIES.dependabot.color} label={SERIES.dependabot.label} value={point.dependabot} />
      <div className="mt-1 flex items-center justify-between" style={{ borderTop: `1px solid ${A.line}`, paddingTop: 4 }}>
        <span>Total</span>
        <span style={{ fontWeight: 600 }}>{total}</span>
      </div>
    </div>
  )
}

function TipRow({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-2">
        <span aria-hidden style={{ width: 12, height: 2, background: color, borderRadius: 1, display: 'inline-block' }} />
        {label}
      </span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  )
}

export function SeriesLegend() {
  return (
    <div className="flex items-center gap-4" style={{ fontSize: 12, color: A.text }}>
      {Object.values(SERIES).map(s => (
        <span key={s.label} className="flex items-center gap-1.5">
          <span aria-hidden style={{ width: 10, height: 10, borderRadius: 2, background: s.color, display: 'inline-block' }} />
          {s.label}
        </span>
      ))}
    </div>
  )
}

// Stacked gradient area of daily approvals. Human approvals sit on the
// baseline (they are the story); dependabot rides on top in slate.
export default function PulseChart({ data }: Props) {
  const [view, setView] = useState<'chart' | 'table'>('chart')
  const animate = !prefersReducedMotion()
  const tickEvery = Math.max(1, Math.floor(data.length / 6))
  const ticks = data.filter((_, i) => (data.length - 1 - i) % tickEvery === 0).map(p => p.date)

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 style={{ color: A.text, fontSize: 14, fontWeight: 500 }}>Daily approvals, last 90 days</h2>
          <p style={{ color: A.text, fontSize: 12 }}>Hover a day for the split.</p>
        </div>
        <div className="flex items-center gap-4">
          <SeriesLegend />
          <button
            type="button"
            onClick={() => setView(v => (v === 'chart' ? 'table' : 'chart'))}
            aria-pressed={view === 'table'}
            className="rounded-md px-2 py-1"
            style={{ color: A.text, fontSize: 12, border: `1px solid ${A.line}`, background: view === 'table' ? A.accentSoft : 'transparent' }}
          >
            {view === 'chart' ? 'Show table' : 'Show chart'}
          </button>
        </div>
      </div>

      {view === 'chart' ? (
        <div className="mt-3 min-h-[260px] flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
              <defs>
                <linearGradient id="pulse-human" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={A.accent} stopOpacity={0.38} />
                  <stop offset="100%" stopColor={A.accent} stopOpacity={0.04} />
                </linearGradient>
                <linearGradient id="pulse-dep" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={A.muted} stopOpacity={0.32} />
                  <stop offset="100%" stopColor={A.muted} stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={A.grid} strokeWidth={1} />
              <XAxis
                dataKey="date"
                ticks={ticks}
                tickFormatter={shortDate}
                tick={{ fill: A.text, fontSize: 11 }}
                axisLine={{ stroke: A.line }}
                tickLine={false}
                tickMargin={8}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: A.text, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip content={<PulseTooltip />} cursor={{ stroke: A.line, strokeWidth: 1 }} />
              <Area
                type="monotone"
                dataKey="human"
                name={SERIES.human.label}
                stackId="approvals"
                stroke={A.accent}
                strokeWidth={2}
                fill="url(#pulse-human)"
                isAnimationActive={animate}
                animationDuration={900}
                activeDot={{ r: 4, fill: A.accent, stroke: A.surface, strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="dependabot"
                name={SERIES.dependabot.label}
                stackId="approvals"
                stroke={A.muted}
                strokeWidth={2}
                fill="url(#pulse-dep)"
                isAnimationActive={animate}
                animationDuration={900}
                activeDot={{ r: 4, fill: A.muted, stroke: A.surface, strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="mt-3 max-h-[260px] overflow-auto rounded-md" style={{ border: `1px solid ${A.line}` }}>
          <table className="w-full" style={{ color: A.text, fontSize: 12 }}>
            <thead className="sticky top-0" style={{ background: A.surface }}>
              <tr>
                <th className="px-3 py-1.5 text-left font-medium">Day</th>
                <th className="px-3 py-1.5 text-right font-medium">Human</th>
                <th className="px-3 py-1.5 text-right font-medium">Dependabot</th>
                <th className="px-3 py-1.5 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {[...data].reverse().map(p => (
                <tr key={p.date} style={{ borderTop: `1px solid ${A.grid}` }}>
                  <td className="px-3 py-1">{longDate(p.date)}</td>
                  <td className="px-3 py-1 text-right">{p.human}</td>
                  <td className="px-3 py-1 text-right">{p.dependabot}</td>
                  <td className="px-3 py-1 text-right font-medium">{p.human + p.dependabot}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
