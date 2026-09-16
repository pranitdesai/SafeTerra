'use client'

import { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Activity, AlertTriangle, Bell, Building2, ChevronRight, ClipboardList, Flag, Gauge, LayoutDashboard, LogOut, Map, Menu, Search, Settings, ShieldCheck, SlidersHorizontal, Users, X } from 'lucide-react'
import { KavachMap, type MapPoint, type Route } from '../components/map-view'
import { fetchApi, getAuthToken, removeAuthToken } from '../lib/api'

type Page = 'Dashboard' | 'Administrative Units' | 'Hazard Red Zones' | 'Relocation Strategy' | 'User Management'
type Status = 'SAFE' | 'BUFFER' | 'RED'

// API Types
interface UserInfo {
  id: number;
  email: string;
  full_name: string;
  role: string;
  assigned_district_name: string | null;
}

interface Settlement {
  id: number;
  name: string;
  population: number;
  current_hazard_status: Status;
  risk_score: number;
  priority_level: string;
  latitude: number;
  longitude: number;
}

interface District {
  id: number;
  name: string;
  code: string;
  area_sq_km: number;
  population: number;
}

interface RelocationSite {
  id: number;
  name: string;
  facility_type: string;
  max_capacity: number;
  current_occupancy: number;
  water_available: boolean;
  medical_facilities: boolean;
  latitude: number;
  longitude: number;
}

interface User {
  id: number;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
}

const nav: { label: Page; icon: typeof LayoutDashboard }[] = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Administrative Units', icon: Building2 },
  { label: 'Hazard Red Zones', icon: Map },
  { label: 'Relocation Strategy', icon: ClipboardList },
  { label: 'User Management', icon: Users }
]

function Badge({ value }: { value: string }) { return <span className={`status-badge status-${value.toLowerCase()}`}><span className="status-dot" />{value}</span> }

function Header({ menu, user }: { menu: () => void, user: UserInfo | null }) {
  const router = useRouter()
  
  const handleLogout = () => {
    removeAuthToken()
    router.push('/login')
  }

  return (
    <header className="topbar">
      <button className="mobile-menu" onClick={menu} aria-label="Open navigation"><Menu size={20} /></button>
      <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 'max-content' }}>
        {user?.role === 'ADMIN' ? (
          <>
            <img src="/logo/ndma-logo.png" alt="NDMA Logo" style={{ height: '48px', width: 'auto' }} />
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: '15px', fontWeight: '800', lineHeight: '1.2', color: '#1e293b' }}>राष्ट्रीय आपदा प्रबंधन प्राधिकरण</div>
              <div style={{ fontSize: '13px', fontWeight: '700', lineHeight: '1.2', color: '#334155' }}>National Disaster Management Authority</div>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', lineHeight: '1.2', marginTop: '2px' }}>गृह मंत्रालय | भारत सरकार</div>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', lineHeight: '1.2' }}>Ministry of Home Affairs | Government of India</div>
            </div>
          </>
        ) : (
          <>
            <div className="brand-mark"><ShieldCheck size={21} /></div>
            <div>
              <div className="brand-name" style={{ fontSize: '14px' }}>{user?.assigned_district_name ? `${user.assigned_district_name.toUpperCase()}` : 'DISTRICT PORTAL'}</div>
              <div className="brand-subtitle">DISASTER DECISION SUPPORT</div>
            </div>
          </>
        )}
      </div>
      <div className="topbar-actions">
        <div className="live-status"><span className="pulse-dot" />System operational</div>
        <button className="icon-button" aria-label="Notifications"><Bell size={19} /><span className="notification-dot" /></button>
        <div className="user-menu">
          <div className="avatar">{user ? user.full_name.split(' ').map(n => n[0]).join('') : 'U'}</div>
          <div className="user-copy">
            <strong>{user ? user.full_name : 'Loading...'}</strong>
            <span>{user ? (user.role === 'ADMIN' ? 'Administrator' : 'DDMO') : ''}</span>
          </div>
        </div>
        <button className="logout-button" onClick={handleLogout}><LogOut size={17} /> <span>Sign out</span></button>
      </div>
    </header>
  )
}

function Sidebar({ page, setPage, open, close, redZoneCount }: { page: Page; setPage: (p: Page) => void; open: boolean; close: () => void, redZoneCount: number }) {
  return (
    <>
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="sidebar-heading">OPERATIONS CONSOLE</div>
        <nav>
          {nav.map(({ label, icon: Icon }) => (
            <button className={`nav-item ${page === label ? 'nav-active' : ''}`} key={label} onClick={() => { setPage(label); close() }}>
              <Icon size={18} /><span>{label}</span>
              {label === 'Hazard Red Zones' && <span className="nav-count">{redZoneCount}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="nav-item"><Settings size={18} /><span>Settings</span></button>
          <div className="version">Kavach Portal <span>v1.0.4</span></div>
        </div>
      </aside>
      {open && <button className="sidebar-overlay" onClick={close} aria-label="Close navigation" />}
    </>
  )
}

function Stat({ title, value, detail, icon: Icon, tone }: { title: string; value: string; detail: string; icon: typeof Activity; tone: string }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}><Icon size={21} /></div>
      <div><div className="stat-label">{title}</div><div className="stat-value">{value}</div><div className="stat-detail">{detail}</div></div>
      <ChevronRight className="stat-arrow" size={17} />
    </div>
  )
}

function Heading({ eyebrow, title, text, action }: { eyebrow: string; title: string; text: string; action?: React.ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{text}</p></div>{action}</div>
}

function SearchBox({ value, setValue, placeholder }: { value: string; setValue: (v: string) => void; placeholder: string }) {
  return (
    <div className="table-tools">
      <div className="search-field"><Search size={17} /><input value={value} onChange={e => setValue(e.target.value)} placeholder={placeholder} /></div>
      <button className="filter-button"><SlidersHorizontal size={16} /> Filters</button>
    </div>
  )
}

function SettlementTable({ rows }: { rows: Settlement[] }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr><th>Settlement</th><th>Population</th><th>Hazard status</th><th>Risk score</th><th>Priority</th></tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id}>
              <td><strong>{r.name}</strong><span className="cell-sub">ID: KVC-{String(r.id).padStart(3, '0')}</span></td>
              <td>{r.population.toLocaleString('en-IN')}</td>
              <td><Badge value={r.current_hazard_status} /></td>
              <td>
                <div className="risk-score">
                  <span className={r.risk_score > 80 ? 'score-high' : r.risk_score > 50 ? 'score-medium' : 'score-low'}>{r.risk_score.toFixed(1)}</span>
                  <div className="score-track"><span style={{ width: `${r.risk_score}%` }} /></div>
                </div>
              </td>
              <td><Badge value={r.priority_level} /></td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={5} className="text-center py-4">No data available.</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

function Dashboard({ go, user, settlements, sites }: { go: (p: Page) => void, user: UserInfo | null, settlements: Settlement[], sites: RelocationSite[] }) {
  const redZones = settlements.filter(s => s.current_hazard_status === 'RED')
  const immediate = settlements.filter(s => s.priority_level === 'IMMEDIATE')
  const totalPopAffected = immediate.reduce((acc, s) => acc + s.population, 0)
  
  const safeSites = sites.filter(s => s.water_available && s.medical_facilities)

  return (
    <div className="page-content">
      <Heading eyebrow="OVERVIEW / 13 SEPTEMBER 2026" title={`Good morning, ${user ? user.full_name.split(' ')[0] : ''}`} text="Here is the current readiness picture across monitored districts." action={<button className="outline-button"><SlidersHorizontal size={16} /> Configure view</button>} />
      <div className="stats-grid">
        <Stat title="Habitations evaluated" value={settlements.length.toString()} detail="Active tracking" icon={Gauge} tone="blue" />
        <Stat title="Active red zones" value={redZones.length.toString()} detail={`${immediate.length} require immediate action`} icon={AlertTriangle} tone="red" />
        <Stat title="Relocation needs" value={totalPopAffected.toLocaleString()} detail={`Across ${immediate.length} habitations`} icon={Flag} tone="orange" />
        <Stat title="Available safe sites" value={sites.length.toString()} detail={`${safeSites.length} with medical facilities`} icon={ShieldCheck} tone="green" />
      </div>
      <div className="overview-grid">
        <section className="panel">
          <div className="panel-header"><div><h2>Risk distribution</h2><p>Evaluated habitations by current hazard status</p></div></div>
          <div className="risk-visual">
            <div className="donut"><div className="donut-hole"><strong>{settlements.length}</strong><span>total</span></div></div>
            <div className="legend-list">
              <div><span className="legend-color safe" />Safe <strong>{settlements.filter(s => s.current_hazard_status === 'SAFE').length} <small>{settlements.length ? ((settlements.filter(s => s.current_hazard_status === 'SAFE').length / settlements.length) * 100).toFixed(1) : 0}%</small></strong></div>
              <div><span className="legend-color buffer" />Buffer <strong>{settlements.filter(s => s.current_hazard_status === 'BUFFER').length} <small>{settlements.length ? ((settlements.filter(s => s.current_hazard_status === 'BUFFER').length / settlements.length) * 100).toFixed(1) : 0}%</small></strong></div>
              <div><span className="legend-color red" />Red zone <strong>{redZones.length} <small>{settlements.length ? ((redZones.length / settlements.length) * 100).toFixed(1) : 0}%</small></strong></div>
            </div>
          </div>
        </section>
        <section className="panel">
          <div className="panel-header"><div><h2>Recent alerts</h2><p>Latest system-generated notifications</p></div><button className="text-button">View all</button></div>
          <div className="alert-list">
            <div className="alert-row"><div className="alert-icon red"><AlertTriangle size={16} /></div><div><strong>High landslide risk detected</strong><span>Kholi Village · 18 minutes ago</span></div><ChevronRight size={16} /></div>
            <div className="alert-row"><div className="alert-icon orange"><Activity size={16} /></div><div><strong>Relocation site nearing capacity</strong><span>Community Hall, Mussoorie · 2 hours ago</span></div><ChevronRight size={16} /></div>
            <div className="alert-row"><div className="alert-icon blue"><Activity size={16} /></div><div><strong>New assessment data synced</strong><span>Tehri Garhwal · 4 hours ago</span></div><ChevronRight size={16} /></div>
          </div>
        </section>
      </div>
      <section className="panel priority-panel">
        <div className="panel-header"><div><h2>Priority settlements</h2><p>Habitations requiring the closest attention</p></div><button className="text-button" onClick={() => go('Hazard Red Zones')}>Open hazard map <ChevronRight size={14} /></button></div>
        <SettlementTable rows={immediate.slice(0, 4)} />
      </section>
    </div>
  )
}

function MapPanel({ settlements, sites, userDistrictName }: { settlements: Settlement[], sites: RelocationSite[], userDistrictName?: string | null }) {
  const hazardPoints: MapPoint[] = settlements.map(s => ({
    id: `s-${s.id}`,
    name: s.name,
    position: [s.latitude || 30.3165, s.longitude || 78.0322],
    kind: 'hazard',
    risk: s.risk_score,
    status: s.current_hazard_status
  }))
  return <div className="map-panel"><KavachMap points={hazardPoints} userDistrictName={userDistrictName} /></div>
}

function Hazards({ settlements, sites, userDistrictName }: { settlements: Settlement[], sites: RelocationSite[], userDistrictName?: string | null }) {
  const [q, setQ] = useState('')
  const rows = useMemo(() => settlements.filter(s => s.name.toLowerCase().includes(q.toLowerCase())), [q, settlements])
  
  return (
    <div className="page-content">
      <Heading eyebrow="HAZARD MONITORING" title="Hazard red zones" text="Live view of settlement risk across the monitored region." action={<button className="primary-button"><Map size={16} /> Refresh map data</button>} />
      <div className="hazard-layout">
        <MapPanel settlements={settlements} sites={sites} userDistrictName={userDistrictName} />
        <section className="panel zone-panel">
          <div className="panel-header"><div><h2>Settlement status</h2><p>{rows.length} of {settlements.length} settlements shown</p></div></div>
          <SearchBox value={q} setValue={setQ} placeholder="Search settlements..." />
          <SettlementTable rows={rows} />
        </section>
      </div>
    </div>
  )
}

function DataPage({ page, districts, sites, users, userDistrictName, settlements }: { page: Exclude<Page, 'Dashboard' | 'Hazard Red Zones'>, districts: District[], sites: RelocationSite[], users: User[], userDistrictName?: string | null, settlements: Settlement[] }) {
  const [q, setQ] = useState('')
  const type = page === 'Administrative Units' ? 'districts' : page === 'Relocation Strategy' ? 'sites' : 'users'
  
  const hazardPoints: MapPoint[] = settlements.map(s => ({
    id: `s-${s.id}`,
    name: s.name,
    position: [s.latitude || 30.3165, s.longitude || 78.0322],
    kind: 'hazard',
    risk: s.risk_score,
    status: s.current_hazard_status
  }))

  const relocationPoints: MapPoint[] = sites.map(s => ({
    id: `rs-${s.id}`,
    name: s.name,
    position: [s.latitude || 30.3165, s.longitude || 78.0322],
    kind: 'site',
    capacity: `${s.current_occupancy} / ${s.max_capacity}`
  }))

  return (
    <div className="page-content">
      <Heading 
        eyebrow="DATA MANAGEMENT" 
        title={page} 
        text={type === 'districts' ? 'District and administrative unit coverage across the state.' : type === 'sites' ? 'Monitor capacity, occupancy, and readiness of safe relocation sites.' : 'Manage portal operators and their access permissions.'} 
        action={<button className="primary-button">{type === 'districts' ? 'Add administrative unit' : type === 'sites' ? 'Register safe site' : 'Invite user'}</button>} 
      />
      <section className="panel full-panel">
        {type === 'sites' && (
          <div className="relocation-map-wrap">
            <div className="panel-header"><div><h2>Reallocation routes</h2><p>Recommended paths from hazard sites to available safe locations</p></div></div>
            <KavachMap points={[...hazardPoints, ...relocationPoints]} routes={[]} showRoutes userDistrictName={userDistrictName} />
          </div>
        )}
        <div className="panel-header">
          <div><h2>{type === 'districts' ? 'Administrative units' : type === 'sites' ? 'Relocation sites' : 'Portal users'}</h2><p>Showing all current records</p></div>
        </div>
        <SearchBox value={q} setValue={setQ} placeholder={`Search ${type}...`} />
        
        <div className="table-scroll">
          {type === 'districts' ? (
            <table>
              <thead><tr><th>District</th><th>Code</th><th>Area</th><th>Population</th><th>Coverage</th></tr></thead>
              <tbody>
                {districts.filter(r => r.name.toLowerCase().includes(q.toLowerCase())).map(r => (
                  <tr key={r.id}>
                    <td><strong>{r.name}</strong><span className="cell-sub">Administrative district</span></td>
                    <td><span className="code-chip">{r.code}</span></td>
                    <td>{r.area_sq_km ? `${r.area_sq_km.toLocaleString()} km²` : 'N/A'}</td>
                    <td>{r.population ? r.population.toLocaleString() : 'N/A'}</td>
                    <td><div className="coverage"><span style={{ width: '76%' }} /></div></td>
                  </tr>
                ))}
                {districts.length === 0 && <tr><td colSpan={5} className="text-center py-4">No districts found</td></tr>}
              </tbody>
            </table>
          ) : type === 'sites' ? (
            <table>
              <thead><tr><th>Site</th><th>Type</th><th>Capacity</th><th>Water</th><th>Medical</th></tr></thead>
              <tbody>
                {sites.filter(r => r.name.toLowerCase().includes(q.toLowerCase())).map(r => (
                  <tr key={r.id}>
                    <td><strong>{r.name}</strong><span className="cell-sub">Relocation site</span></td>
                    <td>{r.facility_type}</td>
                    <td>{r.current_occupancy} / {r.max_capacity}</td>
                    <td><span className={r.water_available ? 'check yes' : 'check no'}>{r.water_available ? 'Available' : 'Unavailable'}</span></td>
                    <td><span className={r.medical_facilities ? 'check yes' : 'check no'}>{r.medical_facilities ? 'Available' : 'Unavailable'}</span></td>
                  </tr>
                ))}
                {sites.length === 0 && <tr><td colSpan={5} className="text-center py-4">No relocation sites found</td></tr>}
              </tbody>
            </table>
          ) : (
            <table>
              <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {users.filter(r => r.full_name.toLowerCase().includes(q.toLowerCase())).map(r => (
                  <tr key={r.id}>
                    <td>
                      <div className="user-cell">
                        <div className="small-avatar">{r.full_name.split(' ').map(x => x[0]).join('').substring(0, 2).toUpperCase()}</div>
                        <div><strong>{r.full_name}</strong><span className="cell-sub">{r.email}</span></div>
                      </div>
                    </td>
                    <td><Badge value={r.role} /></td>
                    <td><span className={`active-status ${r.is_active ? 'is-active' : 'is-inactive'}`}><span />{r.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td><button className="row-action">Manage</button></td>
                  </tr>
                ))}
                {users.length === 0 && <tr><td colSpan={4} className="text-center py-4">No users found</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  )
}

export default function Home() {
  const router = useRouter()
  const [page, setPage] = useState<Page>('Dashboard')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  // Data States
  const [user, setUser] = useState<UserInfo | null>(null)
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [districts, setDistricts] = useState<District[]>([])
  const [sites, setSites] = useState<RelocationSite[]>([])
  const [users, setUsers] = useState<User[]>([])

  useEffect(() => {
    const token = getAuthToken()
    if (!token) {
      router.push('/login')
      return
    }

    const loadData = async () => {
      try {
        setLoading(true)
        const me = await fetchApi<UserInfo>('/auth/me')
        setUser(me)

        const [sData, dData, rData] = await Promise.all([
          fetchApi<Settlement[]>('/settlements/'),
          fetchApi<District[]>('/districts'),
          fetchApi<RelocationSite[]>('/relocation-sites/')
        ])
        
        setSettlements(sData || [])
        setDistricts(dData || [])
        setSites(rData || [])
        
        if (me.role === 'ADMIN') {
          const uData = await fetchApi<User[]>('/users/')
          setUsers(uData || [])
        }
      } catch (err: any) {
        if (err.status === 401 || err.status === 403) {
          console.warn("Session expired. Redirecting to login.")
          removeAuthToken()
          router.push('/login')
        } else {
          console.error("Failed to load dashboard data:", err)
        }
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-gray-50">Loading Kavach Dashboard...</div>
  }

  const redZoneCount = settlements.filter(s => s.current_hazard_status === 'RED').length

  return (
    <div className="app-shell">
      <Header menu={() => setOpen(true)} user={user} />
      <Sidebar page={page} setPage={setPage} open={open} close={() => setOpen(false)} redZoneCount={redZoneCount} />
      <main className="main-content">
        {page === 'Dashboard' ? <Dashboard go={setPage} user={user} settlements={settlements} sites={sites} /> 
          : page === 'Hazard Red Zones' ? <Hazards settlements={settlements} sites={sites} userDistrictName={user?.assigned_district_name} /> 
          : <DataPage page={page} districts={districts} sites={sites} users={users} userDistrictName={user?.assigned_district_name} settlements={settlements} />}
      </main>
    </div>
  )
}
