'use client'
import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { createClient } from '@/lib/supabase/client'

const PANEL = '#0E0E13'
const BORDER = '#2B2B35'
const INK = '#F4F5F7'
const SUB = '#9A9CA3'
const FAINT = '#5C5E66'

const COLORS = ['#7CB3F5', '#6EE7D8', '#E8837B', '#C9A84C', '#A78BFA', '#E48FC6', '#C97B4A', '#94A3B8']

export default function ExpenseDonut() {
  const supabase = createClient()
  const [data, setData] = useState<{ name: string; value: number }[]>([])
  const [total, setTotal] = useState(0)

  useEffect(() => {
    async function load() {
      const { data: txns } = await supabase
        .from('transactions')
        .select('description, amount, type')
      if (!txns) return
      const totals: Record<string, number> = {}
      for (const t of txns) {
        if (t.type === 'expense') totals[t.description] = (totals[t.description] || 0) + t.amount
      }
      const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1])
      const top = sorted.slice(0, 6).map(([name, value]) => ({ name, value }))
      const restSum = sorted.slice(6).reduce((s, [, v]) => s + v, 0)
      if (restSum > 0) top.push({ name: 'Other', value: restSum })
      setData(top)
      setTotal(sorted.reduce((s, [, v]) => s + v, 0))
    }
    load()
  }, [])

  if (data.length === 0) return null

  const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

  return (
    <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 20, boxShadow: '0 10px 30px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07)' }}>
      <p style={{ color: FAINT, fontSize: 11, fontWeight: 600, letterSpacing: 1.2, margin: '0 0 4px' }}>CATEGORY BREAKDOWN</p>
      <p style={{ color: INK, fontSize: 15, fontWeight: 600, margin: '0 0 6px' }}>Where your money goes</p>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        {/* Bubble-segment donut */}
        <div style={{ position: 'relative', width: 210, height: 210, flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={78}
                outerRadius={92}
                paddingAngle={5}
                cornerRadius={12}
                strokeWidth={0}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <p style={{ color: INK, fontSize: 24, fontWeight: 700, margin: 0 }}>{money(total)}</p>
            <p style={{ color: SUB, fontSize: 12, margin: 0 }}>Total expenses</p>
          </div>
        </div>

        {/* Origin-style legend rows */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
          {data.map((d, i) => (
            <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 2px', borderBottom: i === data.length - 1 ? 'none' : `1px solid ${BORDER}` }}>
              <span style={{ width: 30, height: 30, borderRadius: '50%', background: COLORS[i % COLORS.length] + '33', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS[i % COLORS.length] }} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: INK, fontSize: 13.5, fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</p>
                <p style={{ color: FAINT, fontSize: 11.5, margin: 0 }}>{Math.round((d.value / total) * 100)}% of expenses</p>
              </div>
              <span style={{ color: INK, fontSize: 13.5, fontWeight: 600 }}>{money(d.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
