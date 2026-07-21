'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'

const GLOW = '#000000'
const PANEL = '#0E0E13'
const BORDER = '#2B2B35'
const INK = '#F4F5F7'
const SUB = '#9A9CA3'
const FAINT = '#5C5E66'
const GREEN_TEXT = '#3FD98A'
const RED_TEXT = '#F2607A'
const BLUE_TEXT = '#3B82F6'

type Row = {
  id?: string
  txn_date: string
  description: string
  amount: number
  type: 'income' | 'expense'
  project_id: string | null
}

type Project = { id: string; name: string }

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
function monthLabel(key: string) {
  const [y, m] = key.split('-')
  return `${MONTHS[parseInt(m, 10) - 1] ?? m} ${y}`
}

export default function TransactionsPage() {
  const supabase = createClient()
  const router = useRouter()

  const [rows, setRows] = useState<Row[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [month, setMonth] = useState('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [assignError, setAssignError] = useState('')

  async function load() {
    const [{ data: txnData }, { data: projData }] = await Promise.all([
      supabase
        .from('transactions')
        .select('id, txn_date, description, amount, type, project_id')
        .order('txn_date', { ascending: false }),
      supabase
        .from('projects')
        .select('id, name')
        .order('created_at', { ascending: false }),
    ])
    setRows((txnData ?? []) as Row[])
    setProjects((projData ?? []) as Project[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const months = useMemo(() => {
    const set = new Set(rows.map((r) => r.txn_date.slice(0, 7)))
    return Array.from(set).sort().reverse()
  }, [rows])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const matchesMonth = month === 'all' || r.txn_date.slice(0, 7) === month
      const matchesType = typeFilter === 'all' || r.type === typeFilter
      const matchesSearch =
        search.trim() === '' ||
        r.description.toLowerCase().includes(search.trim().toLowerCase())
      return matchesMonth && matchesType && matchesSearch
    })
  }, [rows, search, month, typeFilter])

  const totals = useMemo(() => {
    const income = filtered.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0)
    const expenses = filtered.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0)
    return { income, expenses, net: income - expenses }
  }, [filtered])

  async function handleAssign(row: Row, projectId: string) {
    if (!row.id) return
    setAssignError('')
    setSavingId(row.id)
    const newProjectId = projectId === '' ? null : projectId
    const { error } = await supabase
      .from('transactions')
      .update({ project_id: newProjectId })
      .eq('id', row.id)
    if (error) {
      setAssignError(`Could not assign: ${error.message}`)
    } else {
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, project_id: newProjectId } : r))
      )
    }
    setSavingId(null)
  }

  async function handleDelete(row: Row) {
    if (!row.id) return
    const ok = window.confirm(`Delete "${row.description}"?`)
    if (!ok) return
    setDeletingId(row.id)
    await supabase.from('transactions').delete().eq('id', row.id)
    await load()
    setDeletingId(null)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const money = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: GLOW, fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      {/* Sidebar */}
      <Sidebar active="Transactions" />

      {/* Main */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: `1px solid ${BORDER}` }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, margin: 0, color: INK }}>Transactions</p>
            <p style={{ fontSize: 12, color: FAINT, margin: 0 }}>Every transaction you've uploaded</p>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1020 }}>

          {/* Summary strip */}
          {!loading && rows.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <SummaryCard label="Income" value={money(totals.income)} color={GREEN_TEXT} />
              <SummaryCard label="Expenses" value={money(totals.expenses)} color={RED_TEXT} />
              <SummaryCard label="Net" value={money(totals.net)} color={totals.net >= 0 ? GREEN_TEXT : RED_TEXT} />
            </div>
          )}

          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search descriptions…"
              style={{ flex: 1, minWidth: 180, background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '10px 14px', color: INK, fontSize: 14, outline: 'none' }}
            />
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              style={{ background: "#141417 url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path d='M1 1l4 4 4-4' stroke='%239A9CA3' stroke-width='1.5' fill='none' stroke-linecap='round'/></svg>\") no-repeat right 14px center", border: `1px solid ${BORDER}`, borderRadius: 10, padding: '10px 34px 10px 14px', color: INK, fontSize: 14, outline: 'none', cursor: 'pointer', WebkitAppearance: 'none', appearance: 'none' }}
            >
              <option value="all" style={{ background: '#141417' }}>All months</option>
              {months.map((m) => (
                <option key={m} value={m} style={{ background: '#141417' }}>{monthLabel(m)}</option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['all', 'income', 'expense'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  style={{
                    padding: '10px 14px', borderRadius: 10, fontSize: 13, cursor: 'pointer', fontWeight: 500,
                    background: typeFilter === t ? (t === 'income' ? '#0E2A1C' : t === 'expense' ? '#2A1116' : 'rgba(255,255,255,0.08)') : 'transparent',
                    color: typeFilter === t ? (t === 'income' ? GREEN_TEXT : t === 'expense' ? RED_TEXT : INK) : SUB,
                    border: `1px solid ${typeFilter === t ? (t === 'income' ? '#1F5C3E' : t === 'expense' ? '#5C2230' : '#444') : BORDER}`,
                  }}
                >
                  {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {assignError && <p style={{ color: RED_TEXT, fontSize: 13, margin: 0 }}>⚠️ {assignError}</p>}

          {loading && <p style={{ color: SUB }}>Loading…</p>}

          {!loading && filtered.length === 0 && (
            <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 40, textAlign: 'center', backdropFilter: 'blur(8px)' }}>
              <p style={{ color: INK, fontSize: 15, fontWeight: 600, margin: 0 }}>No transactions found</p>
              <p style={{ color: SUB, fontSize: 13, margin: '8px 0 0' }}>
                {rows.length === 0 ? 'Upload a CSV from the dashboard to get started.' : 'Try a different search or filter.'}
              </p>
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: 'hidden', backdropFilter: 'blur(8px)' }}>
              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 80px 150px 110px 40px', padding: '12px 18px', borderBottom: `1px solid ${BORDER}`, fontSize: 11, color: FAINT, fontWeight: 600, letterSpacing: 0.4 }}>
                <span>DATE</span>
                <span>DESCRIPTION</span>
                <span>TYPE</span>
                <span>PROJECT</span>
                <span style={{ textAlign: 'right' }}>AMOUNT</span>
                <span />
              </div>
              {filtered.map((r, i) => (
                <div
                  key={r.id ?? i}
                  style={{ display: 'grid', gridTemplateColumns: '100px 1fr 80px 150px 110px 40px', padding: '12px 18px', borderBottom: i === filtered.length - 1 ? 'none' : `1px solid ${BORDER}`, fontSize: 14, alignItems: 'center', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ color: SUB, fontSize: 13 }}>{r.txn_date}</span>
                  <span style={{ color: INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 }}>{r.description}</span>
                  <span style={{ fontSize: 11, color: r.type === 'income' ? GREEN_TEXT : RED_TEXT, fontWeight: 500 }}>
                    {r.type === 'income' ? 'Income' : 'Expense'}
                  </span>
                  <select
                    value={r.project_id ?? ''}
                    onChange={(e) => handleAssign(r, e.target.value)}
                    disabled={savingId === r.id}
                    style={{
                      background: "#141417 url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='8' height='5' viewBox='0 0 8 5'><path d='M1 1l3 3 3-3' stroke='%235C5E66' stroke-width='1.2' fill='none' stroke-linecap='round'/></svg>\") no-repeat right 8px center",
                      border: `1px solid ${r.project_id ? BLUE_TEXT : BORDER}`,
                      borderRadius: 8,
                      padding: '5px 22px 5px 8px',
                      color: r.project_id ? BLUE_TEXT : FAINT,
                      fontSize: 12,
                      outline: 'none',
                      cursor: 'pointer',
                      maxWidth: 150,
                      opacity: savingId === r.id ? 0.5 : 1,
                      WebkitAppearance: 'none',
                      appearance: 'none',
                    }}
                  >
                    <option value="" style={{ background: '#141417' }}>No project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id} style={{ background: '#141417' }}>{p.name}</option>
                    ))}
                  </select>
                  <span style={{ textAlign: 'right', color: r.type === 'income' ? GREEN_TEXT : RED_TEXT, fontWeight: 600 }}>
                    {r.type === 'income' ? '+' : '−'}{money(r.amount).replace('-', '')}
                  </span>
                  <button
                    onClick={() => handleDelete(r)}
                    disabled={deletingId === r.id}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: FAINT, fontSize: 15, padding: 4, lineHeight: 1, transition: 'color 0.15s' }}
                    onMouseEnter={e => ((e.target as HTMLElement).style.color = RED_TEXT)}
                    onMouseLeave={e => ((e.target as HTMLElement).style.color = FAINT)}
                    title="Delete"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <p style={{ color: FAINT, fontSize: 12 }}>
              Showing {filtered.length} of {rows.length} transaction{rows.length === 1 ? '' : 's'}
            </p>
          )}
        </div>
      </main>
    </div>
  )
}

function NavItem({ label, active, href }: { label: string; active?: boolean; href: string }) {
  return (
    <Link
      href={href}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9, background: active ? 'rgba(255,255,255,0.06)' : 'transparent', color: active ? '#F4F5F7' : '#9A9CA3', fontSize: 14, fontWeight: active ? 600 : 400, cursor: 'pointer', textDecoration: 'none' }}
    >
      {label}
    </Link>
  )
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: '#0E0E13', border: '1px solid #2B2B35', borderRadius: 12, padding: '14px 18px', backdropFilter: 'blur(8px)' }}>
      <p style={{ fontSize: 11, color: '#5C5E66', fontWeight: 600, letterSpacing: 0.4, margin: '0 0 6px' }}>{label.toUpperCase()}</p>
      <p style={{ fontSize: 20, fontWeight: 600, margin: 0, color }}>{value}</p>
    </div>
  )
}