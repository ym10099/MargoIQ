'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import MargoChat from '@/components/MargoChat'

const GLOW = '#000000'
const PANEL = '#0E0E13'
const BORDER = '#2B2B35'
const INK = '#F4F5F7'
const SUB = '#9A9CA3'
const FAINT = '#5C5E66'
const GREEN = '#3FD98A'
const RED = '#F2607A'
const AMBER = '#E8B44F'
const BLUE = '#3B82F6'

type Goal = { id: string; title: string; why: string | null; type: string; target: number; deadline: string | null; start_date: string | null; created_at: string }
type Txn = { txn_date: string; amount: number; type: 'income' | 'expense' }

const TYPES = [
  { key: 'profit', label: 'Profit target' },
  { key: 'revenue', label: 'Revenue target' },
  { key: 'expense', label: 'Expense ceiling' },
  { key: 'margin', label: 'Margin goal' },
]

const CARD: React.CSSProperties = {
  background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '20px 22px',
  boxShadow: '0 10px 30px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07)',
}
const INPUT: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', background: '#141417', border: `1px solid ${BORDER}`,
  borderRadius: 10, padding: '11px 13px', color: INK, fontSize: 14, outline: 'none',
}

const todayISO = () => new Date().toLocaleDateString('en-CA')

export default function GoalsPage() {
  const supabase = createClient()
  const [goals, setGoals] = useState<Goal[]>([])
  const [txns, setTxns] = useState<Txn[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [advice, setAdvice] = useState<Record<string, string>>({})
  const [adviceLoading, setAdviceLoading] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [why, setWhy] = useState('')
  const [type, setType] = useState('profit')
  const [target, setTarget] = useState('')
  const [deadline, setDeadline] = useState('')
  const [startDate, setStartDate] = useState(todayISO())

  async function load() {
    try {
      const [gRes, tRes] = await Promise.all([
        supabase.from('goals').select('id, title, why, type, target, deadline, start_date, created_at').order('created_at', { ascending: false }),
        supabase.from('transactions').select('txn_date, amount, type'),
      ])
      if (gRes.error) console.error('goals query failed:', gRes.error)
      if (tRes.error) console.error('transactions query failed:', tRes.error)
      setGoals((gRes.data ?? []) as Goal[])
      setTxns((tRes.data ?? []) as Txn[])
    } catch (e) {
      console.error('load() threw:', e)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  function resetForm() {
    setTitle(''); setWhy(''); setTarget(''); setDeadline(''); setType('profit'); setStartDate(todayISO())
    setEditingId(null); setShowForm(false); setError('')
  }

  function startEdit(g: Goal) {
    setEditingId(g.id); setTitle(g.title); setWhy(g.why ?? ''); setType(g.type)
    setTarget(String(g.target)); setDeadline(g.deadline ?? ''); setStartDate(g.start_date ?? todayISO()); setShowForm(true); setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function saveGoal() {
    setError('')
    if (!title.trim()) { setError('Give your goal a name.'); return }
    const num = parseFloat(target.replace(/,/g, ''))
    if (!num || num <= 0) { setError('Enter a target number.'); return }
    if (!deadline) { setError('Pick a deadline so MargoiQ can track your pace.'); return }
    if (startDate && startDate > deadline) { setError('The start date has to come before the deadline.'); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('You must be logged in.'); return }

    const payload = { title: title.trim(), why: why.trim() || null, type, target: num, deadline, start_date: startDate || todayISO() }
    const { error: err } = editingId
      ? await supabase.from('goals').update(payload).eq('id', editingId)
      : await supabase.from('goals').insert({ ...payload, user_id: user.id })
    if (err) { setError(err.message); return }
    resetForm(); load()
  }

  async function deleteGoal(id: string) {
    if (!window.confirm('Delete this goal?')) return
    await supabase.from('goals').delete().eq('id', id)
    load()
  }

  const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

  function progressFor(g: Goal) {
    const startISO = g.start_date ?? g.created_at.slice(0, 10)
    const relevant = txns.filter(t => t.txn_date >= startISO)
    const income = relevant.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expense = relevant.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

    let current = 0
    if (g.type === 'profit') current = income - expense
    else if (g.type === 'revenue') current = income
    else if (g.type === 'expense') current = expense
    else current = income > 0 ? ((income - expense) / income) * 100 : 0

    const isCeiling = g.type === 'expense'
    const pct = g.target > 0 ? (current / g.target) * 100 : 0
    const fmt = (n: number) => g.type === 'margin' ? `${n.toFixed(1)}%` : money(n)

    let daysLeft = 0
    if (g.deadline) daysLeft = Math.max(0, Math.ceil((new Date(g.deadline + 'T00:00:00').getTime() - Date.now()) / 86400000))

    const remaining = g.target - current
    const reached = isCeiling ? current <= g.target : pct >= 100
    const color = isCeiling ? (reached ? GREEN : RED) : (pct >= 100 ? GREEN : pct >= 60 ? AMBER : RED)

    const perDay = !isCeiling && remaining > 0 && daysLeft > 0 ? remaining / daysLeft : 0
    const perWeek = perDay * 7
    const perMonth = perDay * 30

    let headline = ''
    if (isCeiling) headline = reached ? `Under budget by ${fmt(g.target - current)}` : `Over budget by ${fmt(current - g.target)}`
    else if (reached) headline = 'Goal reached'
    else if (daysLeft === 0) headline = `Deadline passed at ${fmt(current)}`
    else headline = `${fmt(remaining)} to go in ${daysLeft} days`

    return { current, pct, color, daysLeft, headline, fmt, perDay, perWeek, perMonth, reached, isCeiling, income, expense, startISO }
  }

  async function getAdvice(g: Goal) {
    const p = progressFor(g)
    setAdviceLoading(g.id)
    const summary = `Counting from ${p.startISO}: income ${money(p.income)}, expenses ${money(p.expense)}, net ${money(p.income - p.expense)}. All-time transactions on file: ${txns.length}.`
    const progress = `Currently at ${p.fmt(p.current)} of ${p.fmt(g.target)} (${Math.round(p.pct)}%). ${p.headline}.${p.perWeek > 0 ? ` Needs about ${money(p.perWeek)} per week.` : ''}`
    try {
      const res = await fetch('/api/goal-advice', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: g, progress, summary }),
      })
      const data = await res.json()
      setAdvice(a => ({ ...a, [g.id]: data.advice || data.error || 'Could not generate advice.' }))
    } catch {
      setAdvice(a => ({ ...a, [g.id]: 'Something went wrong. Try again.' }))
    }
    setAdviceLoading(null)
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: GLOW, fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      <Sidebar active="Goals" />
      <main style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: `1px solid ${BORDER}` }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, margin: 0, color: INK }}>Goals</p>
            <p style={{ fontSize: 12, color: FAINT, margin: 0 }}>Set a target, and MargoiQ tracks it against your real numbers</p>
          </div>
          <button onClick={() => showForm ? resetForm() : setShowForm(true)}
            style={{ fontSize: 13, background: '#fff', color: '#0A0A0B', border: 'none', padding: '9px 16px', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>
            {showForm ? 'Cancel' : '+ New goal'}
          </button>
        </div>

        <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 880 }}>
          {showForm && (
            <div style={CARD}>
              <p style={{ fontSize: 11, color: FAINT, fontWeight: 600, letterSpacing: 1.2, margin: '0 0 14px' }}>
                {editingId ? 'EDIT GOAL' : 'NEW GOAL'}
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                {TYPES.map(t => (
                  <button key={t.key} onClick={() => setType(t.key)}
                    style={{ padding: '8px 14px', borderRadius: 10, fontSize: 13, cursor: 'pointer',
                      background: type === t.key ? 'rgba(255,255,255,0.10)' : 'transparent',
                      color: type === t.key ? INK : SUB, border: `1px solid ${type === t.key ? '#444' : BORDER}` }}>
                    {t.label}
                  </button>
                ))}
              </div>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Goal name (e.g. Save for a second truck)" style={{ ...INPUT, marginBottom: 10 }} />
              <input value={target} onChange={e => setTarget(e.target.value)} inputMode="decimal"
                placeholder={type === 'margin' ? 'Target percent (e.g. 30)' : 'Target amount (e.g. 15000)'} style={{ ...INPUT, marginBottom: 10 }} />
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ color: FAINT, fontSize: 10.5, fontWeight: 600, letterSpacing: 0.8, margin: '0 0 5px' }}>COUNT FROM</p>
                  <input value={startDate} onChange={e => setStartDate(e.target.value)} type="date" style={INPUT} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ color: FAINT, fontSize: 10.5, fontWeight: 600, letterSpacing: 0.8, margin: '0 0 5px' }}>DEADLINE</p>
                  <input value={deadline} onChange={e => setDeadline(e.target.value)} type="date" style={INPUT} />
                </div>
              </div>
              <input value={why} onChange={e => setWhy(e.target.value)} placeholder="Why does this matter? (optional)" style={{ ...INPUT, marginBottom: 12 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={saveGoal} style={{ background: BLUE, color: '#fff', border: 'none', padding: '11px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  {editingId ? 'Save changes' : 'Create goal'}
                </button>
                {editingId && (
                  <button onClick={resetForm} style={{ background: 'transparent', color: SUB, border: `1px solid ${BORDER}`, padding: '11px 20px', borderRadius: 10, fontSize: 14, cursor: 'pointer' }}>
                    Cancel
                  </button>
                )}
              </div>
              {error && <p style={{ color: RED, fontSize: 13, margin: '10px 0 0' }}>{error}</p>}
            </div>
          )}

          {loading && <p style={{ color: SUB }}>Loading your goals…</p>}

          {!loading && goals.length === 0 && !showForm && (
            <div style={{ ...CARD, padding: 40, textAlign: 'center' }}>
              <p style={{ color: INK, fontSize: 15, fontWeight: 600, margin: 0 }}>No goals yet</p>
              <p style={{ color: SUB, fontSize: 13, margin: '8px 0 0', lineHeight: 1.6 }}>
                Set a target like "$15,000 profit by September" and MargoiQ measures it against your real
                transactions, tells you the pace you need, and coaches you toward it.
              </p>
            </div>
          )}

          {goals.map(g => {
            const p = progressFor(g)
            const typeLabel = TYPES.find(t => t.key === g.type)?.label ?? g.type
            return (
              <div key={g.id} style={CARD}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ color: INK, fontSize: 16, fontWeight: 600, margin: 0 }}>{g.title}</p>
                    <p style={{ color: FAINT, fontSize: 12, margin: '3px 0 0' }}>
                      {typeLabel} · target {p.fmt(g.target)} · counting from {p.startISO}{g.deadline ? ` · ${p.daysLeft} days left` : ''}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
                    <button onClick={() => startEdit(g)} style={{ background: 'transparent', border: 'none', color: SUB, cursor: 'pointer', fontSize: 12 }}>Edit</button>
                    <button onClick={() => deleteGoal(g.id)} style={{ background: 'transparent', border: 'none', color: FAINT, cursor: 'pointer', fontSize: 12 }}>Delete</button>
                  </div>
                </div>

                <div style={{ marginTop: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ color: p.color, fontSize: 22, fontWeight: 700 }}>{p.fmt(p.current)}</span>
                    <span style={{ color: SUB, fontSize: 13, alignSelf: 'flex-end' }}>{Math.round(p.pct)}%</span>
                  </div>
                  <div style={{ height: 8, background: '#1A1A22', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.max(0, Math.min(100, p.pct))}%`, height: '100%', background: p.color, borderRadius: 999, transition: 'width 0.4s' }} />
                  </div>
                  <p style={{ color: p.color, fontSize: 13, margin: '10px 0 0', fontWeight: 500 }}>{p.headline}</p>

                  {!p.isCeiling && g.type !== 'margin' && !p.reached && p.perDay > 0 && (
                    <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                      {[['Per day', p.perDay], ['Per week', p.perWeek], ['Per month', p.perMonth]].map(([label, val]) => (
                        <div key={label as string} style={{ flex: 1, background: '#141417', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '10px 12px' }}>
                          <p style={{ color: FAINT, fontSize: 10.5, fontWeight: 600, letterSpacing: 0.6, margin: '0 0 3px' }}>{(label as string).toUpperCase()}</p>
                          <p style={{ color: INK, fontSize: 15, fontWeight: 600, margin: 0 }}>{money(val as number)}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {g.why && <p style={{ color: SUB, fontSize: 13, margin: '12px 0 0', fontStyle: 'italic' }}>Why: {g.why}</p>}

                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${BORDER}` }}>
                    {!advice[g.id] && (
                      <button onClick={() => getAdvice(g)} disabled={adviceLoading === g.id}
                        style={{ background: 'transparent', color: BLUE, border: `1px solid ${BORDER}`, padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                        {adviceLoading === g.id ? 'Margo is thinking…' : 'Get advice from Margo'}
                      </button>
                    )}
                    {advice[g.id] && (
                      <div style={{ background: '#141417', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 16px' }}>
                        <p style={{ color: FAINT, fontSize: 10.5, fontWeight: 600, letterSpacing: 1, margin: '0 0 8px' }}>MARGO'S ADVICE</p>
                        <p style={{ color: INK, fontSize: 14, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{advice[g.id]}</p>
                        <button onClick={() => getAdvice(g)} disabled={adviceLoading === g.id}
                          style={{ background: 'transparent', color: SUB, border: 'none', padding: '8px 0 0', fontSize: 12, cursor: 'pointer' }}>
                          {adviceLoading === g.id ? 'Thinking…' : 'Refresh advice'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {!loading && goals.length > 0 && <MargoChat />}
        </div>
      </main>
    </div>
  )
}
