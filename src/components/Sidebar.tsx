'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const BORDER = '#2B2B35'
const INK = '#F4F5F7'
const SUB = '#9A9CA3'
const FAINT = '#5C5E66'

const icon = (d: string) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

const ICONS: Record<string, JSX.Element> = {
  dashboard: icon('M3 12l9-9 9 9M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10'),
  closeout: icon('M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z'),
  po: icon('M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8'),
  projects: icon('M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z'),
  transactions: icon('M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01'),
  digest: icon('M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zM22 6l-10 7L2 6'),
  goals: icon('M12 2v20M2 12h20M12 7a5 5 0 015 5M12 17a5 5 0 01-5-5'),
  settings: icon('M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 008.6 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 8.6a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z'),
}

const GROUPS = [
  { label: 'OVERVIEW', items: [{ name: 'Dashboard', href: '/dashboard', ic: 'dashboard' }] },
  { label: 'OPERATIONS', items: [
    { name: 'Close out night', href: '/close-out', ic: 'closeout' },
    { name: 'Purchase orders', href: '/purchase-orders', ic: 'po' },
    { name: 'Projects', href: '/projects', ic: 'projects' },
    { name: 'Transactions', href: '/transactions', ic: 'transactions' },
  ]},
  { label: 'INSIGHTS', items: [
    { name: 'Goals', href: '/goals', ic: 'goals' },
    { name: 'Weekly digest', href: '/weekly-digest', ic: 'digest' },
  ]},
]

export default function Sidebar({ active }: { active: string }) {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside style={{ width: 210, borderRight: `1px solid ${BORDER}`, padding: '22px 14px', display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
      <div style={{ padding: '0 8px', marginBottom: 26 }}>
        <img src="/logo.png" alt="MargoiQ" style={{ height: 26 }} />
      </div>

      {GROUPS.map((g) => (
        <div key={g.label} style={{ marginBottom: 14 }}>
          <p style={{ color: FAINT, fontSize: 10.5, fontWeight: 600, letterSpacing: 1.4, margin: '0 0 6px', padding: '0 10px' }}>{g.label}</p>
          {g.items.map((it) => {
            const isActive = it.name === active
            return (
              <Link key={it.name} href={it.href}
                style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 10px', borderRadius: 10, marginBottom: 2, background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent', color: isActive ? INK : SUB, fontSize: 13.5, fontWeight: isActive ? 600 : 400, textDecoration: 'none' }}>
                <span style={{ display: 'flex', color: isActive ? INK : FAINT }}>{ICONS[it.ic]}</span>
                {it.name}
              </Link>
            )
          })}
        </div>
      ))}

      <div style={{ marginTop: 'auto' }}>
        <Link href="/settings"
          style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 10px', borderRadius: 10, background: active === 'Settings' ? 'rgba(255,255,255,0.08)' : 'transparent', color: active === 'Settings' ? INK : SUB, fontSize: 13.5, textDecoration: 'none' }}>
          <span style={{ display: 'flex', color: FAINT }}>{ICONS.settings}</span>
          Settings
        </Link>
        <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 11, padding: '9px 10px', borderRadius: 10, background: 'transparent', border: 'none', cursor: 'pointer', color: SUB, fontSize: 13.5, textAlign: 'left' }}>
          <span style={{ display: 'flex', color: FAINT }}>{icon('M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9')}</span>
          Log out
        </button>
      </div>
    </aside>
  )
}
