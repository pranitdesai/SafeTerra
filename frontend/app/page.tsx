'use client'

import { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Bell,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CloudLightning,
  EyeOff,
  Flag,
  Gauge,
  HeartPulse,
  Info,
  LayoutDashboard,
  LogOut,
  Map,
  MapPin,
  Menu,
  Navigation,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UserPlus,
  Users,
  X,
  Zap
} from 'lucide-react'
import { KavachMap, type MapPoint, type Route } from '../components/map-view'
import { fetchApi, getAuthToken, removeAuthToken } from '../lib/api'

type Page = 'Dashboard' | 'Administrative Units' | 'Hazard Red Zones' | 'Relocation Strategy' | 'User Management'
type Status = 'SAFE' | 'BUFFER' | 'RED'
type SidebarMode = 'expanded' | 'collapsed' | 'hidden'

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
  vulnerable_population?: number;
  road_access?: boolean;
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
  site_suitability_score?: number;
}

interface User {
  id: number;
  full_name: string;
  email: string;
  role: string;
  assigned_district_id?: number | null;
  assigned_district_name?: string | null;
  designation?: string | null;
  phone?: string | null;
  is_active: boolean;
}

interface AlertItem {
  id: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  location: string;
  timestamp: string;
  details: string;
  action_required: string;
}

interface AllocationRecord {
  habitation_id: number;
  habitation_name: string;
  shelter_id: number;
  shelter_name: string;
  people_allocated: number;
  distance_km: number;
  medical_facility_matched: boolean;
  route_positions: [number, number][];
}

interface ShelterUtilization {
  shelter_id: number;
  shelter_name: string;
  max_capacity: number;
  starting_occupancy: number;
  allocated_count: number;
  final_occupancy: number;
  utilization_percentage: number;
  is_at_capacity: boolean;
}

interface RelocationPlan {
  status: string;
  generated_at: string;
  total_evacuees_needed: number;
  total_allocated: number;
  unallocated_count: number;
  allocations: AllocationRecord[];
  shelter_utilization: ShelterUtilization[];
  evacuation_routes: Route[];
}

const nav: { label: Page; icon: typeof LayoutDashboard }[] = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Administrative Units', icon: Building2 },
  { label: 'Hazard Red Zones', icon: Map },
  { label: 'Relocation Strategy', icon: ClipboardList },
  { label: 'User Management', icon: Users }
]

function Badge({ value }: { value: string }) {
  return (
    <span className={`status-badge status-${value.toLowerCase()}`}>
      <span className="status-dot" />
      {value}
    </span>
  )
}

function Header({
  menu,
  user,
  onSimulate,
  onReset,
  simulating,
  sidebarMode = 'expanded',
  onToggleSidebar
}: {
  menu: () => void;
  user: UserInfo | null;
  onSimulate: () => void;
  onReset: () => void;
  simulating: boolean;
  sidebarMode?: SidebarMode;
  onToggleSidebar?: () => void;
}) {
  const router = useRouter()

  const handleLogout = () => {
    removeAuthToken()
    router.push('/login')
  }

  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button className="mobile-menu" onClick={menu} aria-label="Open navigation"><Menu size={20} /></button>
        {onToggleSidebar && (
          <button
            type="button"
            className="topbar-sidebar-toggle"
            onClick={onToggleSidebar}
            title={
              sidebarMode === 'hidden'
                ? "Show Operations Console"
                : sidebarMode === 'collapsed'
                ? "Expand Operations Console"
                : "Shrink Operations Console (Icons only)"
            }
            aria-label="Toggle Operations Console"
          >
            {sidebarMode === 'hidden' ? (
              <PanelLeftOpen size={18} />
            ) : sidebarMode === 'collapsed' ? (
              <PanelLeftOpen size={18} />
            ) : (
              <PanelLeftClose size={18} />
            )}
          </button>
        )}

        <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {user?.role === 'ADMIN' ? (
            <>
              <img src="/logo/ndma-logo.png" alt="NDMA Logo" style={{ height: '42px', width: 'auto' }} />
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ fontSize: '13.5px', fontWeight: '800', lineHeight: '1.2', color: '#1e293b' }}>राष्ट्रीय आपदा प्रबंधन प्राधिकरण</div>
                <div style={{ fontSize: '12px', fontWeight: '700', lineHeight: '1.2', color: '#334155' }}>National Disaster Management Authority</div>
                <div style={{ fontSize: '10px', fontWeight: '600', color: '#64748b', lineHeight: '1.2', marginTop: '1px' }}>गृह मंत्रालय | भारत सरकार (NDRF DM Division)</div>
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
      </div>

      <div className="topbar-actions">
        {/* Real-time simulation triggers */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="sim-button"
            onClick={onSimulate}
            disabled={simulating}
            title="Simulate 135mm/hr Cloudburst and Run AI Re-assessment"
          >
            <CloudLightning size={15} />
            <span>{simulating ? 'Running AI Model...' : 'Simulate Cloudburst'}</span>
          </button>
          <button
            className="sim-button-reset"
            onClick={onReset}
            disabled={simulating}
            title="Reset to Baseline Hazard States"
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
        </div>

        <div className="telemetry-chip">
          <Zap size={11} color="#1c5d8c" />
          <span>Sentinel-2 & SAR Active</span>
        </div>

        <div className="live-status"><span className="pulse-dot" />Live Operations</div>
        <button className="icon-button" aria-label="Notifications"><Bell size={19} /><span className="notification-dot" /></button>
        <div className="user-menu">
          <div className="avatar">{user ? user.full_name.split(' ').map(n => n[0]).join('') : 'U'}</div>
          <div className="user-copy">
            <strong>{user ? user.full_name : 'Loading...'}</strong>
            <span>{user ? (user.role === 'ADMIN' ? 'NDRF / SDMA Admin' : 'DDMO Officer') : ''}</span>
          </div>
        </div>
        <button className="logout-button" onClick={handleLogout}><LogOut size={17} /> <span>Sign out</span></button>
      </div>
    </header>
  )
}

function Sidebar({
  page,
  setPage,
  open,
  close,
  redZoneCount,
  userRole,
  mode = 'expanded',
  onToggleShrink,
  onToggleHide
}: {
  page: Page;
  setPage: (p: Page) => void;
  open: boolean;
  close: () => void;
  redZoneCount: number;
  userRole?: string;
  mode?: SidebarMode;
  onToggleShrink?: () => void;
  onToggleHide?: () => void;
}) {
  const visibleNav = nav.filter(item => item.label !== 'User Management' || userRole === 'ADMIN')

  return (
    <>
      <aside
        className={`sidebar ${open ? 'sidebar-open' : ''} ${
          mode === 'collapsed' ? 'sidebar-collapsed' : ''
        } ${mode === 'hidden' ? 'sidebar-hidden' : ''}`}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: mode === 'collapsed' ? 'center' : 'space-between',
            marginBottom: '14px',
            padding: mode === 'collapsed' ? '0' : '0 8px'
          }}
        >
          {mode !== 'collapsed' && (
            <div className="sidebar-heading sidebar-heading-text" style={{ padding: 0 }}>
              OPERATIONS CONSOLE
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {onToggleShrink && (
              <button
                type="button"
                onClick={onToggleShrink}
                className="sidebar-ctrl-btn"
                title={mode === 'collapsed' ? "Expand Operations Console" : "Shrink Operations Console (Icons only)"}
              >
                {mode === 'collapsed' ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
              </button>
            )}
            {mode !== 'collapsed' && onToggleHide && (
              <button
                type="button"
                onClick={onToggleHide}
                className="sidebar-ctrl-btn"
                title="Hide Operations Console completely"
              >
                <EyeOff size={14} />
              </button>
            )}
          </div>
        </div>

        <nav>
          {visibleNav.map(({ label, icon: Icon }) => (
            <button
              className={`nav-item ${page === label ? 'nav-active' : ''}`}
              key={label}
              onClick={() => { setPage(label); close() }}
              title={label}
            >
              <Icon size={18} className="shrink-0" />
              <span className="nav-label">{label}</span>
              {label === 'Hazard Red Zones' && <span className="nav-count">{redZoneCount}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div style={{ padding: '0 12px 10px', fontSize: '11px', color: '#64748b' }}>
            <div style={{ fontWeight: '700', marginBottom: '2px' }}>SIH PS 26191</div>
            <div>AI Relocation Platform</div>
          </div>
          <div className="version">Kavach Portal <span>v2.4-AI</span></div>
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

function SettlementTable({
  rows,
  selectedId,
  onSelect
}: {
  rows: Settlement[];
  selectedId?: string | null;
  onSelect?: (s: Settlement) => void;
}) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr><th>Settlement</th><th>Population</th><th>Hazard status</th><th>Risk score</th><th>Priority</th></tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const isSelected = selectedId === `s-${r.id}`
            return (
              <tr
                key={r.id}
                onClick={() => onSelect?.(r)}
                style={{
                  cursor: 'pointer',
                  backgroundColor: isSelected ? 'rgba(28, 93, 140, 0.09)' : undefined,
                  borderLeft: isSelected ? '3px solid #1c5d8c' : '3px solid transparent',
                  transition: 'background-color 0.15s ease'
                }}
                className={isSelected ? 'selected-row' : ''}
                title="Click to view and inspect on GIS Satellite map"
              >
                <td><strong>{r.name}</strong><span className="cell-sub">ID: KVC-{String(r.id).padStart(3, '0')}</span></td>
                <td>{r.population.toLocaleString('en-IN')}</td>
                <td><Badge value={r.current_hazard_status} /></td>
                <td>
                  <div className="risk-score">
                    <span className={r.risk_score > 80 ? 'score-high' : r.risk_score > 50 ? 'score-medium' : 'score-low'}>{r.risk_score.toFixed(1)}</span>
                    <div className="score-track"><span style={{ width: `${Math.min(100, r.risk_score)}%` }} /></div>
                  </div>
                </td>
                <td><Badge value={r.priority_level} /></td>
              </tr>
            )
          })}
          {rows.length === 0 && <tr><td colSpan={5} className="text-center py-4">No data available.</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

function Dashboard({
  go,
  user,
  settlements,
  sites,
  alerts,
  simNotice
}: {
  go: (p: Page) => void;
  user: UserInfo | null;
  settlements: Settlement[];
  sites: RelocationSite[];
  alerts: AlertItem[];
  simNotice: string | null;
}) {
  const redZones = settlements.filter(s => s.current_hazard_status === 'RED')
  const immediate = settlements.filter(s => s.priority_level === 'IMMEDIATE')
  const totalPopAffected = immediate.reduce((acc, s) => acc + s.population, 0)
  const safeSites = sites.filter(s => s.water_available && s.medical_facilities)

  return (
    <div className="page-content">
      {simNotice && (
        <div style={{
          marginBottom: '20px',
          padding: '12px 18px',
          background: '#fff3e0',
          border: '1px solid #ffe0b2',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#e65100',
          fontSize: '13px',
          fontWeight: '600'
        }}>
          <CloudLightning size={18} />
          <span>{simNotice}</span>
        </div>
      )}

      <Heading
        eyebrow="MULTI-HAZARD SITUATIONAL PICTURE / DEHRADUN"
        title={`Welcome, ${user ? user.full_name : ''}`}
        text="Real-time GIS intelligence, dynamic Red Zone classification, and carrying capacity relocation readiness."
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="primary-button" onClick={() => go('Relocation Strategy')}>
              <ClipboardList size={16} /> Relocation Strategy Plan
            </button>
          </div>
        }
      />

      <div className="stats-grid">
        <Stat title="Habitations Evaluated" value={settlements.length.toString()} detail="Copernicus Sentinel-2 & DEM" icon={Gauge} tone="blue" />
        <Stat title="Active Red Zones" value={redZones.length.toString()} detail={`${immediate.length} require immediate relocation`} icon={AlertTriangle} tone="red" />
        <Stat title="Vulnerable Evacuees" value={totalPopAffected.toLocaleString()} detail={`Across ${immediate.length} immediate habitations`} icon={Flag} tone="orange" />
        <Stat title="Safe Alternative Shelters" value={sites.length.toString()} detail={`${safeSites.length} equipped with medical units`} icon={ShieldCheck} tone="green" />
      </div>

      <div className="overview-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Multi-Hazard Risk Distribution</h2>
              <p>Sentinel-2 & AI model classification across monitored habitations</p>
            </div>
          </div>
          <div className="risk-visual">
            <div className="donut"><div className="donut-hole"><strong>{settlements.length}</strong><span>Habitations</span></div></div>
            <div className="legend-list">
              <div><span className="legend-color safe" />Safe <strong>{settlements.filter(s => s.current_hazard_status === 'SAFE').length} <small>{settlements.length ? ((settlements.filter(s => s.current_hazard_status === 'SAFE').length / settlements.length) * 100).toFixed(1) : 0}%</small></strong></div>
              <div><span className="legend-color buffer" />Buffer Zone <strong>{settlements.filter(s => s.current_hazard_status === 'BUFFER').length} <small>{settlements.length ? ((settlements.filter(s => s.current_hazard_status === 'BUFFER').length / settlements.length) * 100).toFixed(1) : 0}%</small></strong></div>
              <div><span className="legend-color red" />Hazard Red Zone <strong>{redZones.length} <small>{settlements.length ? ((redZones.length / settlements.length) * 100).toFixed(1) : 0}%</small></strong></div>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Real-Time Operations Alerts</h2>
              <p>Dynamic triggers from IMD Doppler Radar & Sentinel Telemetry</p>
            </div>
            <button className="text-button" onClick={() => go('Hazard Red Zones')}>Live Red Zones</button>
          </div>
          <div className="alert-list">
            {alerts.slice(0, 4).map(alt => (
              <div className="alert-row" key={alt.id}>
                <div className={`alert-icon ${alt.severity === 'CRITICAL' ? 'red' : alt.severity === 'WARNING' ? 'orange' : 'blue'}`}>
                  {alt.severity === 'CRITICAL' ? <AlertTriangle size={16} /> : alt.severity === 'WARNING' ? <Activity size={16} /> : <Info size={16} />}
                </div>
                <div>
                  <strong>{alt.title}</strong>
                  <span>{alt.location} · {alt.timestamp}</span>
                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#64748b' }}>{alt.details}</p>
                </div>
                <ChevronRight size={16} />
              </div>
            ))}
            {alerts.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>No active alerts.</div>}
          </div>
        </section>
      </div>

      <section className="panel priority-panel">
        <div className="panel-header">
          <div>
            <h2>Immediate Relocation Needs</h2>
            <p>Habitations classified under critical hazard risk requiring immediate relocation</p>
          </div>
          <button className="text-button" onClick={() => go('Relocation Strategy')}>
            View evacuation routing <ChevronRight size={14} />
          </button>
        </div>
        <SettlementTable rows={immediate} />
      </section>
    </div>
  )
}

function MapPanel({
  settlements,
  sites,
  userDistrictName,
  selectedPointId,
  onSelectPoint
}: {
  settlements: Settlement[];
  sites: RelocationSite[];
  userDistrictName?: string | null;
  selectedPointId?: string | null;
  onSelectPoint?: (point: MapPoint | null) => void;
}) {
  const hazardPoints: MapPoint[] = settlements.map(s => ({
    id: `s-${s.id}`,
    name: s.name,
    position: [s.latitude || 30.3165, s.longitude || 78.0322],
    kind: 'hazard',
    risk: s.risk_score,
    status: s.current_hazard_status
  }))

  return (
    <div className="map-panel">
      <KavachMap
        points={hazardPoints}
        userDistrictName={userDistrictName}
        selectedPointId={selectedPointId}
        onSelectPoint={onSelectPoint}
      />
    </div>
  )
}

function Hazards({ settlements, sites, userDistrictName }: { settlements: Settlement[], sites: RelocationSite[], userDistrictName?: string | null }) {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'ALL' | 'RED' | 'BUFFER' | 'SAFE'>('ALL')
  const [selectedSettlementId, setSelectedSettlementId] = useState<string | null>(null)

  const rows = useMemo(() => {
    return settlements.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(q.toLowerCase())
      const matchesFilter = filter === 'ALL' || s.current_hazard_status === filter
      return matchesSearch && matchesFilter
    })
  }, [q, filter, settlements])

  return (
    <div className="page-content">
      <Heading
        eyebrow="AI HAZARD MONITORING"
        title="Multi-Hazard Red Zones"
        text="Satellite-inferred Red Zones dynamically updated from slope, rainfall, and vegetation indices."
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className={`filter-button ${filter === 'ALL' ? 'nav-active' : ''}`} onClick={() => setFilter('ALL')}>All ({settlements.length})</button>
            <button className={`filter-button ${filter === 'RED' ? 'nav-active' : ''}`} onClick={() => setFilter('RED')} style={{ color: '#b84328' }}>Red Zones ({settlements.filter(s => s.current_hazard_status === 'RED').length})</button>
            <button className={`filter-button ${filter === 'BUFFER' ? 'nav-active' : ''}`} onClick={() => setFilter('BUFFER')} style={{ color: '#a6772d' }}>Buffer ({settlements.filter(s => s.current_hazard_status === 'BUFFER').length})</button>
          </div>
        }
      />
      <div className="hazard-layout">
        <MapPanel
          settlements={settlements}
          sites={sites}
          userDistrictName={userDistrictName}
          selectedPointId={selectedSettlementId}
          onSelectPoint={(p) => setSelectedSettlementId(p ? p.id : null)}
        />
        <section className="panel zone-panel">
          <div className="panel-header">
            <div>
              <h2>Habitation Risk Status</h2>
              <p>{rows.length} of {settlements.length} habitations listed • Click to inspect on map</p>
            </div>
          </div>
          <SearchBox value={q} setValue={setQ} placeholder="Search habitations..." />
          <SettlementTable
            rows={rows}
            selectedId={selectedSettlementId}
            onSelect={(s) => setSelectedSettlementId(`s-${s.id}`)}
          />
        </section>
      </div>
    </div>
  )
}

function RelocationStrategyView({
  settlements,
  sites,
  userDistrictName,
  relocationPlan,
  onRefreshPlan
}: {
  settlements: Settlement[];
  sites: RelocationSite[];
  userDistrictName?: string | null;
  relocationPlan: RelocationPlan | null;
  onRefreshPlan: () => void;
}) {
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

  const routes = relocationPlan?.evacuation_routes || []

  return (
    <div className="page-content">
      <Heading
        eyebrow="CARRYING CAPACITY & EVACUATION DECISION SUPPORT"
        title="Relocation Strategy & Allocation"
        text="Automated matching of vulnerable habitations to safer alternative shelters respecting carrying capacity and medical needs."
        action={
          <button className="primary-button" onClick={onRefreshPlan}>
            <RefreshCw size={15} /> Recalculate Carrying Capacity Plan
          </button>
        }
      />

      {/* Overview Stat Cards */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <Stat
          title="Evacuees Needing Relocation"
          value={relocationPlan ? relocationPlan.total_evacuees_needed.toLocaleString() : '0'}
          detail="Across Red & Buffer zones"
          icon={Flag}
          tone="orange"
        />
        <Stat
          title="Successfully Allocated"
          value={relocationPlan ? relocationPlan.total_allocated.toLocaleString() : '0'}
          detail={relocationPlan ? `${((relocationPlan.total_allocated / Math.max(1, relocationPlan.total_evacuees_needed)) * 100).toFixed(1)}% Capacity Match` : ''}
          icon={ShieldCheck}
          tone="green"
        />
        <Stat
          title="Evacuation Routes Mapped"
          value={routes.length.toString()}
          detail="Live OSRM Road Network traversal"
          icon={Navigation}
          tone="blue"
        />
        <Stat
          title="Alternative Shelters Active"
          value={sites.length.toString()}
          detail="Dehradun District Staging Hubs"
          icon={Building2}
          tone="blue"
        />
      </div>

      {/* GIS Evacuation Map Panel */}
      <section className="panel full-panel" style={{ marginBottom: '24px' }}>
        <div className="relocation-map-wrap">
          <div className="panel-header">
            <div>
              <h2>Dynamic Evacuation Routing Plan</h2>
              <p>OSRM road routes connecting threatened habitations directly to assigned carrying capacity shelters</p>
            </div>
            <span className="route-summary">{routes.length} Active Evacuation Corridors</span>
          </div>
          <KavachMap
            points={[...hazardPoints, ...relocationPoints]}
            routes={routes}
            showRoutes={true}
            userDistrictName={userDistrictName}
          />
        </div>
      </section>

      {/* Shelter Carrying Capacity Utilization Table */}
      <section className="panel full-panel" style={{ marginBottom: '24px' }}>
        <div className="panel-header">
          <div>
            <h2>Shelter Carrying Capacity Utilization</h2>
            <p>Monitors max capacity, baseline occupancy, and newly allocated evacuee intake</p>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Shelter Facility</th>
                <th>Type</th>
                <th>Max Capacity</th>
                <th>Current Occupancy</th>
                <th>Allocated Evacuees</th>
                <th>Total Utilization</th>
                <th>Amenities</th>
              </tr>
            </thead>
            <tbody>
              {sites.map(s => {
                const u = relocationPlan?.shelter_utilization.find(x => x.shelter_id === s.id)
                const allocated = u ? u.allocated_count : 0
                const finalOcc = s.current_occupancy + allocated
                const pct = Math.min(100, Math.round((finalOcc / Math.max(1, s.max_capacity)) * 100))
                const barClass = pct >= 95 ? 'capacity-fill-full' : pct >= 75 ? 'capacity-fill-warn' : 'capacity-fill-safe'

                return (
                  <tr key={s.id}>
                    <td><strong>{s.name}</strong><span className="cell-sub">Safe Alternative Shelter</span></td>
                    <td>{s.facility_type}</td>
                    <td><strong>{s.max_capacity.toLocaleString()}</strong></td>
                    <td>{s.current_occupancy.toLocaleString()}</td>
                    <td><span style={{ color: '#1c5d8c', fontWeight: '700' }}>+{allocated.toLocaleString()}</span></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="score-track" style={{ width: '80px', height: '6px' }}>
                          <span className={barClass} style={{ width: `${pct}%` }} />
                        </div>
                        <span style={{ fontWeight: '700', fontSize: '11px' }}>{pct}% ({finalOcc}/{s.max_capacity})</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {s.medical_facilities && <span className="telemetry-chip" style={{ color: '#15803d', borderColor: '#bbf7d0', background: '#f0fdf4' }}>Medical Unit</span>}
                        {s.water_available && <span className="telemetry-chip">Water</span>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* AI Allocation Matrix Table */}
      <section className="panel full-panel">
        <div className="panel-header">
          <div>
            <h2>AI-Recommended Habitation &rarr; Shelter Allocation Matrix</h2>
            <p>Calculated via multi-objective optimization minimizing distance and matching medical infrastructure</p>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Vulnerable Habitation</th>
                <th>Assigned Safe Shelter</th>
                <th>Evacuees Allocated</th>
                <th>Transit Distance</th>
                <th>Medical Priority Matched</th>
              </tr>
            </thead>
            <tbody>
              {relocationPlan?.allocations.map((a, idx) => (
                <tr key={idx}>
                  <td><strong>{a.habitation_name}</strong><span className="cell-sub">Threatened Habitation</span></td>
                  <td><strong>{a.shelter_name}</strong></td>
                  <td><span style={{ fontWeight: '700', color: '#b84328' }}>{a.people_allocated.toLocaleString()} persons</span></td>
                  <td>{a.distance_km} km</td>
                  <td>
                    {a.medical_facility_matched ? (
                      <span className="status-badge status-safe"><HeartPulse size={12} /> Medical Available</span>
                    ) : (
                      <span className="cell-sub">Standard Shelter</span>
                    )}
                  </td>
                </tr>
              ))}
              {(!relocationPlan || relocationPlan.allocations.length === 0) && (
                <tr><td colSpan={5} className="text-center py-4">No active allocations generated.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function DataPage({
  page,
  districts,
  sites,
  users,
  onRefreshUsers
}: {
  page: Exclude<Page, 'Dashboard' | 'Hazard Red Zones' | 'Relocation Strategy'>;
  districts: District[];
  sites: RelocationSite[];
  users: User[];
  onRefreshUsers?: () => Promise<void> | void;
}) {
  const [q, setQ] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [modalError, setModalError] = useState('')
  const [successToast, setSuccessToast] = useState<string | null>(null)

  // Form State for creating a user
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'DDMO' | 'ADMIN'>('DDMO')
  const [assignedDistrictId, setAssignedDistrictId] = useState<string>('')
  const [designation, setDesignation] = useState('')
  const [phone, setPhone] = useState('')

  const safeDistricts = Array.isArray(districts) ? districts : []
  const safeUsers = Array.isArray(users) ? users : []
  const type = page === 'Administrative Units' ? 'districts' : 'users'

  // Pre-fill default district if needed
  useEffect(() => {
    if (!assignedDistrictId && safeDistricts.length > 0) {
      setAssignedDistrictId(String(safeDistricts[0].id))
    }
  }, [safeDistricts, assignedDistrictId])

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setModalError('')
    setIsSubmitting(true)

    try {
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters long.')
      }

      const body: any = {
        email: email.trim(),
        full_name: fullName.trim(),
        password,
        role,
        designation: designation.trim() || (role === 'DDMO' ? 'District Disaster Management Officer' : 'National Administrator'),
        phone: phone.trim() || null,
        assigned_district_id: role === 'DDMO' && assignedDistrictId ? Number(assignedDistrictId) : null,
      }

      await fetchApi('/users/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      // Reset form
      setFullName('')
      setEmail('')
      setPassword('')
      setDesignation('')
      setPhone('')
      setShowAddModal(false)

      const districtObj = safeDistricts.find(d => String(d.id) === String(assignedDistrictId))
      const assignedLabel = role === 'DDMO' ? (districtObj ? `District: ${districtObj.name}` : 'District Officer') : 'National Admin'
      setSuccessToast(`Officer account successfully created for ${body.full_name} (${assignedLabel})!`)
      setTimeout(() => setSuccessToast(null), 5000)

      if (onRefreshUsers) {
        await onRefreshUsers()
      }
    } catch (err: any) {
      setModalError(err.message || 'Failed to create user. Please check the inputs.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="page-content">
      {/* Success Notification Banner */}
      {successToast && (
        <div style={{ marginBottom: '16px', padding: '12px 16px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '6px', color: '#065f46', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
          <span style={{ fontWeight: '500' }}>{successToast}</span>
        </div>
      )}

      <Heading
        eyebrow="GOVERNANCE & PERMISSIONS"
        title={page}
        text={type === 'districts' ? 'District and administrative unit coverage across Uttarakhand.' : 'Manage disaster response officers, DDMO credentials, and jurisdiction assignments.'}
        action={
          type === 'users' ? (
            <button className="primary-button" onClick={() => setShowAddModal(true)}>
              <UserPlus size={15} />
              <span>Create Officer Account</span>
            </button>
          ) : (
            <button className="primary-button">
              <span>Add administrative unit</span>
            </button>
          )
        }
      />

      <section className="panel full-panel">
        <div className="panel-header">
          <div>
            <h2>{type === 'districts' ? 'Administrative Units' : 'Authorized Personnel & Jurisdictions'}</h2>
            <p>Showing current database records</p>
          </div>
        </div>
        <SearchBox value={q} setValue={setQ} placeholder={`Search ${type}...`} />

        <div className="table-scroll">
          {type === 'districts' ? (
            <table>
              <thead><tr><th>District</th><th>Code</th><th>Area</th><th>Population</th><th>Coverage</th></tr></thead>
              <tbody>
                {safeDistricts.filter(r => (r.name || '').toLowerCase().includes(q.toLowerCase())).map(r => (
                  <tr key={r.id}>
                    <td><strong>{r.name}</strong><span className="cell-sub">Administrative district</span></td>
                    <td><span className="code-chip">{r.code}</span></td>
                    <td>{r.area_sq_km ? `${r.area_sq_km.toLocaleString()} km²` : 'N/A'}</td>
                    <td>{r.population ? r.population.toLocaleString() : 'N/A'}</td>
                    <td><div className="coverage"><span style={{ width: '85%' }} /></div></td>
                  </tr>
                ))}
                {safeDistricts.length === 0 && <tr><td colSpan={5} className="text-center py-4">No districts found</td></tr>}
              </tbody>
            </table>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Authorized Officer</th>
                  <th>Role & Authority</th>
                  <th>Assigned Jurisdiction</th>
                  <th>Designation</th>
                  <th>Contact</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {safeUsers
                  .filter(r => 
                    (r.full_name || '').toLowerCase().includes(q.toLowerCase()) ||
                    (r.email || '').toLowerCase().includes(q.toLowerCase()) ||
                    (r.assigned_district_name || '').toLowerCase().includes(q.toLowerCase())
                  )
                  .map(r => (
                    <tr key={r.id}>
                      <td>
                        <div className="user-cell">
                          <div className="small-avatar">
                            {(r.full_name || 'U').split(' ').map(x => x[0]).join('').substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <strong>{r.full_name}</strong>
                            <span className="cell-sub">{r.email}</span>
                          </div>
                        </div>
                      </td>
                      <td><Badge value={r.role} /></td>
                      <td>
                        {r.assigned_district_name ? (
                          <span className="code-chip" style={{ background: '#ecfdf5', color: '#047857', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={11} /> {r.assigned_district_name}
                          </span>
                        ) : r.role === 'ADMIN' ? (
                          <span className="code-chip" style={{ background: '#e0f2fe', color: '#0369a1' }}>
                            🏛️ National / All Districts
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">Unassigned</span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', color: '#334155' }}>
                          {r.designation || (r.role === 'ADMIN' ? 'National Administrator' : 'District Officer')}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          {r.phone || '—'}
                        </span>
                      </td>
                      <td>
                        <span className={`active-status ${r.is_active ? 'is-active' : 'is-inactive'}`}>
                          <span />{r.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                {safeUsers.length === 0 && <tr><td colSpan={6} className="text-center py-4">No users found</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Modal: Create Officer Account & Assign District */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '520px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)', border: '1px solid #cbd5e1', overflow: 'hidden' }}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#e0f2fe', color: '#0369a1', display: 'grid', placeItems: 'center' }}>
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Provision Authorized Officer</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Create login credentials & assign district jurisdiction</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowAddModal(false)} 
                style={{ border: 0, background: 'transparent', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} style={{ padding: '22px' }}>
              {modalError && (
                <div style={{ marginBottom: '14px', padding: '10px 14px', borderRadius: '6px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>Officer Full Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Dr. Rajesh Rawat"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>Official Email / Gov ID *</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ddmo@kavach.gov.in"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>Password (min 8 chars) *</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>Role / Command Level *</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as 'DDMO' | 'ADMIN')}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff', boxSizing: 'border-box' }}
                    >
                      <option value="DDMO">District Officer (DDMO)</option>
                      <option value="ADMIN">System Administrator (HQ)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                      {role === 'DDMO' ? 'Assigned District *' : 'Jurisdiction'}
                    </label>
                    {role === 'DDMO' ? (
                      <select
                        required
                        value={assignedDistrictId}
                        onChange={(e) => setAssignedDistrictId(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff', boxSizing: 'border-box' }}
                      >
                        {safeDistricts.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.code})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div style={{ padding: '8px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', color: '#64748b', boxSizing: 'border-box' }}>
                        All Districts (National Oversight)
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>Designation</label>
                    <input
                      type="text"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      placeholder={role === 'DDMO' ? 'District Disaster Mgmt Officer' : 'National Administrator'}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>Phone / Emergency Line</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91-135-2710000"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '22px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ padding: '8px 18px', borderRadius: '6px', border: 0, background: '#1c5d8c', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', opacity: isSubmitting ? 0.7 : 1 }}
                >
                  {isSubmitting ? 'Creating...' : 'Create & Assign District'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Home() {
  const router = useRouter()
  const [page, setPage] = useState<Page>('Dashboard')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [simulating, setSimulating] = useState(false)
  const [simNotice, setSimNotice] = useState<string | null>(null)

  // Data States
  const [user, setUser] = useState<UserInfo | null>(null)
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [districts, setDistricts] = useState<District[]>([])
  const [sites, setSites] = useState<RelocationSite[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [relocationPlan, setRelocationPlan] = useState<RelocationPlan | null>(null)
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>('expanded')

  const handleToggleShrink = () => {
    setSidebarMode(prev => {
      const next = prev === 'collapsed' ? 'expanded' : 'collapsed'
      setTimeout(() => window.dispatchEvent(new Event('resize')), 250)
      return next
    })
  }

  const handleToggleHide = () => {
    setSidebarMode(prev => {
      const next = prev === 'hidden' ? 'expanded' : 'hidden'
      setTimeout(() => window.dispatchEvent(new Event('resize')), 250)
      return next
    })
  }

  const handleCycleSidebar = () => {
    setSidebarMode(prev => {
      const next = prev === 'hidden' ? 'expanded' : prev === 'expanded' ? 'collapsed' : 'expanded'
      setTimeout(() => window.dispatchEvent(new Event('resize')), 250)
      return next
    })
  }

  const reloadUsers = async () => {
    try {
      const uData = await fetchApi<any>('/users/')
      const list = Array.isArray(uData) ? uData : (uData?.users || [])
      setUsers(list)
    } catch (err: any) {
      console.error("Failed to load users:", err)
    }
  }

  const reloadAllData = async () => {
    try {
      const [sData, dData, rData, aData, pData] = await Promise.all([
        fetchApi<Settlement[]>('/settlements/'),
        fetchApi<District[]>('/districts'),
        fetchApi<RelocationSite[]>('/relocation-sites/'),
        fetchApi<AlertItem[]>('/analytics/alerts'),
        fetchApi<RelocationPlan>('/analytics/relocation-plan')
      ])

      setSettlements(sData || [])
      setDistricts(dData || [])
      setSites(rData || [])
      setAlerts(aData || [])
      setRelocationPlan(pData || null)

      if (user?.role === 'ADMIN') {
        await reloadUsers()
      }
    } catch (err: any) {
      console.error("Error refreshing dashboard data:", err)
    }
  }

  useEffect(() => {
    const token = getAuthToken()
    if (!token) {
      router.push('/login')
      return
    }

    const loadInitial = async () => {
      try {
        setLoading(true)
        const me = await fetchApi<UserInfo>('/auth/me')
        setUser(me)

        await reloadAllData()

        if (me.role === 'ADMIN') {
          await reloadUsers()
        }
      } catch (err: any) {
        if (err.status === 401 || err.status === 403) {
          removeAuthToken()
          router.push('/login')
        } else {
          console.error("Failed to load initial data:", err)
        }
      } finally {
        setLoading(false)
      }
    }

    loadInitial()
  }, [router])

  const handleSimulateCloudburst = async () => {
    try {
      setSimulating(true)
      const res = await fetchApi<any>('/analytics/simulate-hazard', {
        method: 'POST',
        body: JSON.stringify({ scenario: 'cloudburst', rainfall_mm_per_hr: 135.0 })
      })

      setSimNotice(`Cloudburst simulated (135 mm/hr). AI escalated ${res.escalated_settlements?.length || 4} habitations into RED Zone!`)
      await reloadAllData()
    } catch (err) {
      console.error("Simulation failed:", err)
    } finally {
      setSimulating(false)
    }
  }

  const handleResetSimulation = async () => {
    try {
      setSimulating(true)
      await fetchApi<any>('/analytics/simulate-hazard', {
        method: 'POST',
        body: JSON.stringify({ scenario: 'reset' })
      })
      setSimNotice('Hazard states reset to default baseline.')
      await reloadAllData()
    } catch (err) {
      console.error("Reset failed:", err)
    } finally {
      setSimulating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 text-slate-700 font-medium">
        Loading Kavach Decision Support Console...
      </div>
    )
  }

  const redZoneCount = settlements.filter(s => s.current_hazard_status === 'RED').length

  return (
    <div className="app-shell">
      <Header
        menu={() => setOpen(true)}
        user={user}
        onSimulate={handleSimulateCloudburst}
        onReset={handleResetSimulation}
        simulating={simulating}
        sidebarMode={sidebarMode}
        onToggleSidebar={handleCycleSidebar}
      />
      <Sidebar
        page={page}
        setPage={setPage}
        open={open}
        close={() => setOpen(false)}
        redZoneCount={redZoneCount}
        userRole={user?.role}
        mode={sidebarMode}
        onToggleShrink={handleToggleShrink}
        onToggleHide={handleToggleHide}
      />
      {sidebarMode === 'hidden' && (
        <button
          type="button"
          onClick={() => {
            setSidebarMode('expanded')
            setTimeout(() => window.dispatchEvent(new Event('resize')), 250)
          }}
          className="floating-show-sidebar"
          title="Restore Operations Console"
        >
          <PanelLeftOpen size={16} />
          <span>Show Operations Console</span>
        </button>
      )}
      <main className={`main-content ${sidebarMode === 'collapsed' ? 'sidebar-collapsed' : sidebarMode === 'hidden' ? 'sidebar-hidden' : ''}`}>
        {page === 'Dashboard' ? (
          <Dashboard
            go={setPage}
            user={user}
            settlements={settlements}
            sites={sites}
            alerts={alerts}
            simNotice={simNotice}
          />
        ) : page === 'Hazard Red Zones' ? (
          <Hazards
            settlements={settlements}
            sites={sites}
            userDistrictName={user?.assigned_district_name}
          />
        ) : page === 'Relocation Strategy' ? (
          <RelocationStrategyView
            settlements={settlements}
            sites={sites}
            userDistrictName={user?.assigned_district_name}
            relocationPlan={relocationPlan}
            onRefreshPlan={reloadAllData}
          />
        ) : (
          <DataPage
            page={page}
            districts={districts}
            sites={sites}
            users={users}
            onRefreshUsers={reloadUsers}
          />
        )}
      </main>
    </div>
  )
}
