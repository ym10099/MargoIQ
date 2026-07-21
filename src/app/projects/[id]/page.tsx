'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import MargoChat from '@/components/MargoChat'

const GLOW = '#000000'
const PANEL = '#0E0E13'
const BORDER = '#2B2B35'
const INK = '#F4F5F7'
const SUB = '#9A9CA3'
const FAINT = '#5C5E66'
const GREEN_TEXT = '#3FD98A'
const RED_TEXT = '#F2607A'

type Txn = { id: string; txn_date: string; description: string; amount: number; type: 'income' | 'expense' }

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [name, setName] = useState('')
  const [txns, setTxns] = useState<Txn[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: proj }, { data }] = await Promise.all([
        supabase.from('projects').select('name').eq('id', id).single(),
        supabase
          .from('transactions')
          .select('id, txn_date, description, amount, type')
          .eq('project_id', id)
          .order('txn_date', { ascending: false }),
      ])
      if (proj) setName(proj.name)
      setTxns((data ?? []) as Txn[])
      setLoading(false)
    }
    load()
  }, [id])

  const income = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expenses = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const net = income - expenses
  const profitable = net >= 0

  const expenseTotals: Record<string, number> = {}
  for (const t of txns) if (t.type === 'expense') expenseTotals[t.description] = (expenseTotals[t.description] || 0) + t.amount
  const biggest = Object.entries(expenseTotals).sort((a, b) => b[1] - a[1])[0]

  const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: GLOW, fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      <Sidebar active="Projects" />

      <main style={{ flex: 1 }}>
        <div style={{ padding: '16px 28px', borderBottom: '1px solid ' + BORDER, display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link href="/projects" style={{ color: SUB, textDecoration: 'none', fontSize: 20, lineHeight: 1 }}>←</Link>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <p style={{ fontSize: 15, fontWeight: 600, margin: 0, color: INK }}>{loading ? 'Loading…' : name}</p>
              {!loading && txns.length > 0 && (
                <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: profitable ? '#0E2A1C' : '#2A1116', color: profitable ? GREEN_TEXT : RED_TEXT, border: '1px solid ' + (profitable ? '#1F5C3E' : '#5C2230') }}>
                  {profitable ? 'Profitable' : 'Losing money'}
                </span>
              )}
            </div>
            <p style={{ fontSize: 12, color: FAINT, margin: 0 }}>Full breakdown</p>
          </div>
        </div>

        <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 900 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <Stat label="MONEY IN" value={money(income)} color={GREEN_TEXT} />
            <Stat label="MONEY OUT" value={money(expenses)} color={RED_TEXT} />
            <Stat label="NET PROFIT" value={money(net)} color={profitable ? GREEN_TEXT : RED_TEXT} />
          </div>

          {biggest && (
            <div style={{ background: PANEL, border: '1px solid ' + BORDER, borderRadius: 12, padding: '12px 18px', display: 'flex', gap: 20, alignItems: 'center' }}>
              <p style={{ color: SUB, fontSize: 13, margin: 0 }}>
                Biggest cost: <span style={{ color: INK, fontWeight: 600 }}>{biggest[0]}</span> at <span style={{ color: RED_TEXT, fontWeight: 600 }}>{money(biggest[1])}</span>
              </p>
              <p style={{ color: FAINT, fontSize: 13, margin: 0, marginLeft: 'auto' }}>{txns.length} transaction{txns.length === 1 ? '' : 's'}</p>
            </div>
          )}

          {loading && <p style={{ color: SUB }}>Loading…</p>}

          {!loading && txns.length === 0 && (
            <div style={{ background: PANEL, border: '1px solid ' + BORDER, borderRadius: 16, padding: 40, textAlign: 'center' }}>
              <p style={{ color: INK, fontSize: 15, fontWeight: 600, margin: 0 }}>No transactions assigned yet</p>
              <p style={{ color: SUB, fontSize: 13, margin: '8px 0 0' }}>Assign transactions to this project from the Transactions page to see its breakdown.</p>
            </div>
          )}

          {!loading && txns.length > 0 && (
            <div style={{ background: PANEL, border: '1px solid ' + BORDER, borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 90px 120px', padding: '12px 18px', borderBottom: '1px solid ' + BORDER, fontSize: 11, color: FAINT, fontWeight: 600, letterSpacing: 0.4 }}>
                <span>DATE</span><span>DESCRIPTION</span><span>TYPE</span><span style={{ textAlign: 'right' }}>AMOUNT</span>
              </div>
              {txns.map((t, i) => (
                <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 90px 120px', padding: '12px 18px', borderBottom: i === txns.length - 1 ? 'none' : '1px solid ' + BORDER, fontSize: 14, alignItems: 'center' }}>
                  <span style={{ color: SUB, fontSize: 13 }}>{t.txn_date}</span>
                  <span style={{ color: INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 }}>{t.description}</span>
                  <span style={{ fontSize: 11, color: t.type === 'income' ? GREEN_TEXT : RED_TEXT, fontWeight: 500 }}>{t.type === 'income' ? 'Income' : 'Expense'}</span>
                  <span style={{ textAlign: 'right', color: t.type === 'income' ? GREEN_TEXT : RED_TEXT, fontWeight: 600 }}>
                    {t.type === 'income' ? '+' : '−'}{money(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {!loading && txns.length > 0 && <MargoChat projectId={id} projectName={name} />}
        </div>
      </main>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: PANEL, border: '1px solid ' + BORDER, borderRadius: 14, padding: '16px 20px' }}>
      <p style={{ fontSize: 11, color: FAINT, fontWeight: 600, letterSpacing: 0.5, margin: '0 0 6px' }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 600, margin: 0, color }}>{value}</p>
    </div>
  )
}

function NavItem({ label, active, href }: { label: string; active?: boolean; href: string }) {
  return (
    <Link href={href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9, background: active ? 'rgba(255,255,255,0.06)' : 'transparent', color: active ? '#F4F5F7' : '#9A9CA3', fontSize: 14, fontWeight: active ? 600 : 400, cursor: 'pointer', textDecoration: 'none' }}>
      {label}
    </Link>
  )
}
