// ============================================================
// Chart wrappers — Recharts with our dark glass styling
// ============================================================

const R = window.Recharts;

// ---- Tooltip content ----------------------------------------
function GlassTooltip({ active, payload, label, valueFormatter }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div style={{
      background: 'rgba(4,7,15,0.95)',
      border: '1px solid var(--glass-border)',
      borderRadius: 10,
      padding: '10px 12px',
      backdropFilter: 'blur(20px)',
      boxShadow: '0 12px 40px -6px rgba(0,0,0,0.6)',
      fontSize: 12,
      minWidth: 140,
    }}>
      <div style={{ color: 'var(--text-3)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '2px 0' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-1)' }}>
            <i style={{ width: 8, height: 8, borderRadius: 2, background: p.color, boxShadow: `0 0 8px ${p.color}` }} />
            {p.name}
          </span>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
            {valueFormatter ? valueFormatter(p.value) : p.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---- Volume area chart (30-day, 2 series) -------------------
function VolumeChart({ data }) {
  return (
    <R.ResponsiveContainer width="100%" height={240}>
      <R.AreaChart data={data} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="grad-voice" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#00d4ff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="grad-wa" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7b61ff" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#7b61ff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <R.CartesianGrid strokeDasharray="3 6" />
        <R.XAxis dataKey="label" interval={3} tickLine={false} axisLine={false} />
        <R.YAxis tickLine={false} axisLine={false} />
        <R.Tooltip content={<GlassTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
        <R.Area type="monotone" dataKey="voice"    name="Voice Calls"     stroke="#00d4ff" strokeWidth={2} fill="url(#grad-voice)" animationDuration={900} animationBegin={200} />
        <R.Area type="monotone" dataKey="whatsapp" name="WhatsApp"        stroke="#7b61ff" strokeWidth={2} fill="url(#grad-wa)"    animationDuration={900} animationBegin={400} />
      </R.AreaChart>
    </R.ResponsiveContainer>
  );
}

// ---- Cost stacked area --------------------------------------
function CostStackedArea({ data }) {
  return (
    <R.ResponsiveContainer width="100%" height={260}>
      <R.AreaChart data={data} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="cs-voice" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#00d4ff" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="cs-ai" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7b61ff" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#7b61ff" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="cs-call" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffb347" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#ffb347" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <R.CartesianGrid strokeDasharray="3 6" />
        <R.XAxis dataKey="m" tickLine={false} axisLine={false} />
        <R.YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} />
        <R.Tooltip content={<GlassTooltip valueFormatter={(v) => `$${v.toLocaleString()}`} />} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} />
        <R.Area type="monotone" stackId="1" dataKey="voice" name="Voice Agent Cost" stroke="#00d4ff" strokeWidth={2} fill="url(#cs-voice)" animationDuration={900} animationBegin={200} />
        <R.Area type="monotone" stackId="1" dataKey="ai"    name="AI Agent Cost"    stroke="#7b61ff" strokeWidth={2} fill="url(#cs-ai)"    animationDuration={900} animationBegin={400} />
        <R.Area type="monotone" stackId="1" dataKey="call"  name="Call Cost"        stroke="#ffb347" strokeWidth={2} fill="url(#cs-call)"  animationDuration={900} animationBegin={600} />
      </R.AreaChart>
    </R.ResponsiveContainer>
  );
}

// ---- Horizontal bar (objections) ----------------------------
function HBarChart({ data, color = '#00d4ff' }) {
  const max = Math.max(...data.map((d) => d.value));
  return (
    <div className="col gap-3" style={{ paddingTop: 4 }}>
      {data.map((d, i) => (
        <div key={i} className="col gap-2">
          <div className="row between" style={{ fontSize: 12 }}>
            <span style={{ color: 'var(--text-1)' }}>{d.label}</span>
            <span className="text-2 tabular">{d.value}%</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
            <div
              style={{
                width: `${(d.value / max) * 100}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${color}, ${color}80)`,
                boxShadow: `0 0 10px ${color}80`,
                borderRadius: 4,
                animation: `barIn 800ms ${i * 100}ms cubic-bezier(0.2,0.7,0.2,1) backwards`,
              }}
            />
          </div>
        </div>
      ))}
      <style>{`@keyframes barIn { from { transform: scaleX(0); transform-origin: 0 0; } to { transform: scaleX(1); } }`}</style>
    </div>
  );
}

// ---- Donut --------------------------------------------------
function Donut({ data, total, totalLabel = 'TOTAL', size = 200 }) {
  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <R.ResponsiveContainer width="100%" height="100%">
        <R.PieChart>
          <R.Pie
            data={data}
            innerRadius={size * 0.31}
            outerRadius={size * 0.48}
            paddingAngle={2}
            dataKey="value"
            stroke="rgba(4,7,15,0.8)"
            strokeWidth={2}
            animationDuration={900}
            animationBegin={200}
          />
          <R.Tooltip content={<GlassTooltip valueFormatter={(v) => `${v}%`} />} />
        </R.PieChart>
      </R.ResponsiveContainer>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
      }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 28, lineHeight: 1 }}>
          {total}
        </div>
        <div className="cap" style={{ color: 'var(--text-3)', marginTop: 4 }}>{totalLabel}</div>
      </div>
    </div>
  );
}

function DonutLegend({ data, unit = '%' }) {
  return (
    <div className="col gap-2">
      {data.map((d) => (
        <div key={d.name} className="row between" style={{ fontSize: 12 }}>
          <span className="row gap-2">
            <i style={{ width: 9, height: 9, borderRadius: 2, background: d.fill, boxShadow: `0 0 8px ${d.fill}80` }} />
            <span style={{ color: 'var(--text-1)' }}>{d.name}</span>
          </span>
          <span className="tabular text-2">{d.value}{unit}</span>
        </div>
      ))}
    </div>
  );
}

// ---- Bar chart (peak hours) ---------------------------------
function HoursBar({ data }) {
  return (
    <R.ResponsiveContainer width="100%" height={180}>
      <R.BarChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="b-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#7b61ff" stopOpacity="0.6" />
          </linearGradient>
        </defs>
        <R.CartesianGrid strokeDasharray="3 6" vertical={false} />
        <R.XAxis dataKey="hour" tickLine={false} axisLine={false} interval={2} />
        <R.YAxis tickLine={false} axisLine={false} />
        <R.Tooltip content={<GlassTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <R.Bar dataKey="calls" name="Calls" fill="url(#b-grad)" radius={[3, 3, 0, 0]} animationDuration={900} animationBegin={300} />
      </R.BarChart>
    </R.ResponsiveContainer>
  );
}

// ---- CSAT line ----------------------------------------------
function LineMetric({ data, dataKey, name, color = '#00e5a0', yDomain }) {
  return (
    <R.ResponsiveContainer width="100%" height={180}>
      <R.LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <R.CartesianGrid strokeDasharray="3 6" vertical={false} />
        <R.XAxis dataKey="week" tickLine={false} axisLine={false} />
        <R.YAxis tickLine={false} axisLine={false} domain={yDomain || ['auto', 'auto']} />
        <R.Tooltip content={<GlassTooltip />} />
        <R.Line type="monotone" dataKey={dataKey} name={name} stroke={color} strokeWidth={2.4} dot={{ r: 3, fill: color, strokeWidth: 0 }} activeDot={{ r: 5, fill: color, strokeWidth: 2, stroke: '#04070f' }} animationDuration={900} animationBegin={200} />
      </R.LineChart>
    </R.ResponsiveContainer>
  );
}

// ---- Heatmap ------------------------------------------------
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
function Heatmap({ data, accentColor = '#00d4ff' }) {
  // data: 7×24 grid of values 0–100
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '36px repeat(24, 1fr)', gap: 3 }}>
        <div></div>
        {Array.from({ length: 24 }).map((_, h) => (
          <div key={h} style={{ fontSize: 9, textAlign: 'center', color: 'var(--text-3)', visibility: h % 3 === 0 ? 'visible' : 'hidden' }}>
            {String(h).padStart(2, '0')}
          </div>
        ))}
        {data.map((row, d) => (
          <React.Fragment key={d}>
            <div style={{ fontSize: 10, color: 'var(--text-3)', alignSelf: 'center', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{DAYS[d]}</div>
            {row.map((v, h) => {
              const alpha = Math.max(0.04, Math.min(0.95, v / 100));
              return (
                <div
                  key={h}
                  title={`${DAYS[d]} ${String(h).padStart(2, '0')}:00 — ${v}`}
                  style={{
                    aspectRatio: 1,
                    borderRadius: 3,
                    background: `${accentColor}`,
                    opacity: alpha,
                    transition: 'all 150ms',
                    cursor: 'pointer',
                    boxShadow: v > 70 ? `0 0 6px ${accentColor}80` : 'none',
                  }}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>
      <div className="row gap-2 mt-4" style={{ justifyContent: 'flex-end', fontSize: 10, color: 'var(--text-3)' }}>
        <span>Less</span>
        {[0.1, 0.25, 0.45, 0.7, 0.95].map((a, i) => (
          <i key={i} style={{ width: 12, height: 12, borderRadius: 2, background: accentColor, opacity: a }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

Object.assign(window, {
  GlassTooltip, VolumeChart, CostStackedArea, HBarChart,
  Donut, DonutLegend, HoursBar, LineMetric, Heatmap,
});
