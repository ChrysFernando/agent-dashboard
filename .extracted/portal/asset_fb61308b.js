// ============================================================
// Shared UI primitives — GlassCard, Pill, Buttons, Tooltip,
// Drawer, Toggle, AgentAvatar, CountUp, Sparkline, etc.
// ============================================================

const { useState, useEffect, useRef, useMemo, useCallback, createContext, useContext } = React;

// ---- CountUp ------------------------------------------------
function CountUp({ to, duration = 1100, decimals = 0, prefix = '', suffix = '' }) {
  const [val, setVal] = useState(0);
  const startRef = useRef(null);
  const fromRef = useRef(0);

  useEffect(() => {
    fromRef.current = 0;
    startRef.current = null;
    let raf;
    const tick = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const p = Math.min((ts - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(fromRef.current + (to - fromRef.current) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);

  const formatted = useMemo(() => {
    const n = decimals ? val.toFixed(decimals) : Math.round(val).toLocaleString();
    return prefix + n + suffix;
  }, [val, decimals, prefix, suffix]);

  return <span className="tabular">{formatted}</span>;
}

// ---- Sparkline ----------------------------------------------
function Sparkline({ data, color = '#00d4ff', width = 88, height = 28 }) {
  const path = useMemo(() => {
    if (!data || data.length === 0) return { line: '', area: '' };
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const step = width / (data.length - 1);
    const pts = data.map((v, i) => [i * step, height - ((v - min) / range) * (height - 4) - 2]);
    const line = pts.map((p, i) => (i === 0 ? `M${p[0].toFixed(1)},${p[1].toFixed(1)}` : `L${p[0].toFixed(1)},${p[1].toFixed(1)}`)).join(' ');
    const area = line + ` L${width},${height} L0,${height} Z`;
    return { line, area };
  }, [data, width, height]);

  const id = useMemo(() => 'sp_' + Math.random().toString(36).slice(2, 8), []);
  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={path.area} fill={`url(#${id})`} />
      <path d={path.line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ---- Pill ---------------------------------------------------
function Pill({ children, variant = '', dot = false, className = '' }) {
  return (
    <span className={`pill ${variant} ${className}`}>
      {dot && <i className="dot" />}
      {children}
    </span>
  );
}

// ---- Tooltip ------------------------------------------------
function Tip({ children, text }) {
  return (
    <span className="tt-wrap">
      <span className="tt-trigger" aria-label={text} tabIndex={0}>
        <Icon name="info" size={12} />
      </span>
      <span className="tt">{text}</span>
      {children}
    </span>
  );
}

// ---- AgentAvatar (abstract geometric icon, colored by type) -
function AgentAvatar({ agent, size = 'md' }) {
  const type = AGENT_TYPES[agent.type];
  return (
    <div className={`agent-avatar ${type.color} ${size === 'sm' ? 'sm' : ''}`}>
      <Icon name={type.icon} size={size === 'sm' ? 16 : 22} strokeWidth={1.8} color="#04070f" />
    </div>
  );
}

// ---- Toggle -------------------------------------------------
function Toggle({ on, onChange, ariaLabel }) {
  return (
    <button
      type="button"
      className={`toggle ${on ? 'on' : ''}`}
      onClick={() => onChange(!on)}
      aria-pressed={on}
      aria-label={ariaLabel || 'toggle'}
    />
  );
}

// ---- Drawer (slide-in right panel, ESC closes) --------------
function Drawer({ open, onClose, title, subtitle, children, footer, width = 480 }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="drawer" style={{ width }}>
        <div className="drawer-head">
          <div>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 22 }}>{title}</h3>
            {subtitle && <p style={{ margin: '6px 0 0', color: 'var(--text-2)', fontSize: 13 }}>{subtitle}</p>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="close">
            <Icon name="x" size={16} />
          </button>
        </div>
        <div className="drawer-body">{children}</div>
        {footer && <div className="drawer-foot">{footer}</div>}
      </div>
    </>
  );
}

// ---- Toast system -------------------------------------------
const ToastCtx = createContext({ push: () => {} });
function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((t) => {
    const id = Math.random().toString(36).slice(2, 8);
    setToasts((s) => [...s, { id, ...t }]);
    setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), t.duration || 4000);
  }, []);
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind || 'info'}`}>
            <div style={{
              width: 28, height: 28, borderRadius: 8, display: 'grid', placeItems: 'center', flexShrink: 0,
              background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)',
              color: t.kind === 'success' ? 'var(--emerald)' : t.kind === 'warn' ? 'var(--amber)' : t.kind === 'error' ? 'var(--rose)' : 'var(--cyan)'
            }}>
              <Icon name={t.kind === 'success' ? 'check' : t.kind === 'error' ? 'alert' : 'info'} size={14} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500 }}>{t.title}</div>
              {t.body && <div style={{ color: 'var(--text-2)', fontSize: 12, marginTop: 2 }}>{t.body}</div>}
            </div>
            <button className="icon-btn" style={{ width: 24, height: 24 }} onClick={() => setToasts((s) => s.filter((x) => x.id !== t.id))}>
              <Icon name="x" size={12} />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
function useToast() { return useContext(ToastCtx); }

// ---- Empty state --------------------------------------------
function EmptyState({ icon = 'spark', title, body, action }) {
  return (
    <div className="empty">
      <div className="empty-icon"><Icon name={icon} size={28} /></div>
      <div>
        <div style={{ fontWeight: 500, fontSize: 16 }}>{title}</div>
        {body && <div style={{ color: 'var(--text-2)', fontSize: 13, marginTop: 6 }}>{body}</div>}
      </div>
      {action}
    </div>
  );
}

// ---- ChannelBadges ------------------------------------------
function ChannelBadges({ channels }) {
  return (
    <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
      {channels.includes('voice') && (
        <Pill variant="cyan outline"><Icon name="phone" size={11} /> Voice Call</Pill>
      )}
      {channels.includes('whatsapp') && (
        <Pill variant="violet outline"><Icon name="whatsapp" size={11} /> WhatsApp</Pill>
      )}
    </div>
  );
}

Object.assign(window, {
  CountUp, Sparkline, Pill, Tip, AgentAvatar, Toggle, Drawer,
  ToastProvider, useToast, EmptyState, ChannelBadges,
});
