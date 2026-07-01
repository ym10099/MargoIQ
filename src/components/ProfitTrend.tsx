'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import type { MonthlyPnL } from '@/lib/calculations'

const GREEN = '#3FD98A'
const RED = '#F2607A'
const INK = '#F4F5F7'
const SUB = '#9A9CA3'
const PANEL = 'rgba(20,20,23,0.72)'
const BORDER = '#23232A'

function money(n: number) {
  const sign = n < 0 ? '−' : ''
  return `${sign}$${Math.abs(Math.round(n)).toLocaleString('en-US')}`
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null
  const d = payload[0].payload as MonthlyPnL
  const positive = d.netProfit >= 0
  return (
    <div style={{ background: '#15151A', border: `0.5px solid ${BORDER}`, borderRadius: 10, padding: '10px 12px' }}>
      <p style={{ margin: 0, color: SUB, fontSize: 11 }}>{d.label}</p>
      <p style={{ margin: '4px 0 0', color: positive ? GREEN : RED, fontSize: 16, fontWeight: 600 }}>
        {money(d.netProfit)}
      </p>
      <p style={{ margin: '2px 0 0', color: SUB, fontSize: 11 }}>
        Rev {money(d.revenue)} · Exp {money(d.expenses)}
      </p>
    </div>
  )
}

export default function ProfitTrend({ data }: { data: MonthlyPnL[] }) {
  // Need at least 2 months to draw a meaningful trend
  if (data.length < 2) {
    return (
      <div style={{ background: PANEL, border: `0.5px solid ${BORDER}`, borderRadius: 16, padding: 24, backdropFilter: 'blur(8px)' }}>
        <p style={{ color: INK, fontSize: 14, fontWeight: 600, margin: 0 }}>Profit trend</p>
        <p style={{ color: SUB, fontSize: 13, margin: '8px 0 0' }}>
          Upload at least two months of data to see your trend over time.
        </p>
      </div>
    )
  }

  const latest = data[data.length - 1].netProfit
  const first = data[0].netProfit
  const climbing = latest > first

  return (
    <div style={{ background: PANEL, border: `0.5px solid ${BORDER}`, borderRadius: 16, padding: '22px 22px 14px', backdropFilter: 'blur(8px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ color: INK, fontSize: 14, fontWeight: 600 }}>Profit trend</span>
        <span style={{ fontSize: 11, color: climbing ? GREEN : RED, fontWeight: 600 }}>
          {climbing ? '▲ trending up' : '▼ trending down'}
        </span>
      </div>
      <p style={{ color: SUB, fontSize: 12, margin: '0 0 12px' }}>
        Net profit by month, {data[0].label} → {data[data.length - 1].label}
      </p>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={GREEN} stopOpacity={0.45} />
              <stop offset="100%" stopColor={GREEN} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            tick={{ fill: SUB, fontSize: 11 }}
            axisLine={{ stroke: BORDER }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: SUB, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={48}
            tickFormatter={(v) => money(v)}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: BORDER }} />
          <ReferenceLine y={0} stroke={RED} strokeDasharray="3 3" strokeOpacity={0.5} />
          <Area
            type="monotone"
            dataKey="netProfit"
            stroke={GREEN}
            strokeWidth={2.5}
            fill="url(#profitFill)"
            dot={{ fill: GREEN, r: 3 }}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}