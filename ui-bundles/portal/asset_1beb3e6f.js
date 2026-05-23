// ============================================================
// APP SHELL — Sidebar + Topbar + Router
// ============================================================

const NAV = [
  { id: 'overview',    label: 'Overview',        icon: 'home' },
  { id: 'agents',      label: 'Agents',          icon: 'bot' },
  { id: 'knowledge',   label: 'Knowledge Base',  icon: 'book' },
  { id: 'transcripts', label: 'Transcripts',     icon: 'document' },
  { id: 'analytics',   label: 'Analytics',       icon: 'chart' },
  { id: 'billing',     label: 'Billing',         icon: 'card' },
  { id: 'settings',    label: 'Settings',        icon: 'cog' },
];

function Sidebar({ active, onNav, collapsed, onToggle }) {
  return (
    <aside className={`sidebar ${collapsed ? 'col' : ''}`}>
      <div className="brand" onClick={() => onNav('overview')}>
        <div className="brand-mark" />
        {!collapsed && <div className="brand-name">Aether<span>.</span></div>}
      </div>

      {!collapsed && <div className="nav-section">Main</div>}
      {NAV.slice(0, 5).map((n) => (
        <div
          key={n.id}
          className={`nav-item ${active === n.id ? 'active' : ''}`}
          onClick={() => onNav(n.id)}
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') onNav(n.id); }}
          title={collapsed ? n.label : undefined}
        >
          <Icon name={n.icon} size={17} />
          {!collapsed && <span className="nav-item-label">{n.label}</span>}
        </div>
      ))}

      {!collapsed && <div className="nav-section">Account</div>}
      {NAV.slice(5).map((n) => (
        <div
          key={n.id}
          className={`nav-item ${active === n.id ? 'active' : ''}`}
          onClick={() => onNav(n.id)}
          tabIndex={0}
          title={collapsed ? n.label : undefined}
        >
          <Icon name={n.icon} size={17} />
          {!collapsed && <span className="nav-item-label">{n.label}</span>}
        </div>
      ))}

      <div className="sidebar-foot">
        {!collapsed && (
          <div className="usage-mini">
            <div className="row between"><span>Monthly minutes</span><span className="tabular">73%</span></div>
            <div className="usage-bar"><i style={{ width: '73%' }} /></div>
            <div className="text-3" style={{ fontSize: 10 }}>29,200 / 40,000 used</div>
          </div>
        )}
        <button className="collapse-btn" onClick={onToggle} aria-label="collapse">
          <Icon name={collapsed ? 'panelRight' : 'panelLeft'} size={14} />
        </button>
      </div>
    </aside>
  );
}

function Topbar({ active }) {
  const liveAgents = AGENTS.filter((a) => a.status === 'live').length;
  return (
    <header className="topbar">
      <div className="workspace-pill">
        <div className="ws-icon">A</div>
        <span className="ws-name">Acme Corp</span>
        <Icon name="chevd" size={12} className="ws-chev" />
      </div>

      <div className="agent-count">
        <span className="live-dot" />
        <span><span className="tabular" style={{ fontWeight: 600 }}>{liveAgents}</span> agents live</span>
      </div>

      <div className="spacer" />

      <div className="searchbar">
        <Icon name="search" size={14} color="var(--text-3)" />
        <input placeholder="Search transcripts, agents, KB…" />
        <kbd>⌘K</kbd>
      </div>

      <button className="icon-btn" aria-label="notifications">
        <Icon name="bell" size={16} />
        <span className="badge-dot" />
      </button>
      <div className="avatar">DP</div>
    </header>
  );
}

function App() {
  const [active, setActive] = useState('overview');
  const [collapsed, setCollapsed] = useState(false);

  // Persist current section
  useEffect(() => {
    const saved = localStorage.getItem('aether.active');
    if (saved && NAV.some((n) => n.id === saved)) setActive(saved);
  }, []);
  useEffect(() => { localStorage.setItem('aether.active', active); }, [active]);

  const pages = {
    overview:    <PageOverview goto={setActive} />,
    agents:      <PageAgents />,
    knowledge:   <PageKnowledge />,
    transcripts: <PageTranscripts />,
    analytics:   <PageAnalytics />,
    billing:     <PageBilling />,
    settings:    <PageSettings />,
  };

  return (
    <ToastProvider>
      <div className={`app ${collapsed ? 'collapsed' : ''}`}>
        <Sidebar active={active} onNav={setActive} collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
        <div className="main">
          <Topbar active={active} />
          {pages[active]}
        </div>
      </div>
    </ToastProvider>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
