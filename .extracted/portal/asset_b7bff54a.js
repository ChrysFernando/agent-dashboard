// ============================================================
// ANALYTICS PAGE — per-type stats + shared
// ============================================================

function HeroStat({ label, value, suffix = '', delta, deltaDir = 'up', hint }) {
  return (
    <div className="glass" style={{ padding: 22 }}>
      <div className="cap text-2 mb-3">
        {hint ? <Tip text={hint}>{label}</Tip> : label}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 44, fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1 }}>
        <CountUp to={value} decimals={String(value).includes('.') ? 1 : 0} />{suffix}
      </div>
      {delta && (
        <div className="row gap-2 mt-3">
          <span className={`delta ${deltaDir}`}>
            <Icon name={deltaDir === 'up' ? 'trend' : 'trendDown'} size={11} /> {delta}
          </span>
          <span className="text-3" style={{ fontSize: 11 }}>vs last 30 days</span>
        </div>
      )}
    </div>
  );
}

function PanelTitle({ children, hint }) {
  return (
    <div className="row between mb-4">
      <div className="cap text-2">
        {hint ? <Tip text={hint}>{children}</Tip> : children}
      </div>
    </div>
  );
}

function SalesView() {
  return (
    <div className="col gap-5">
      <div className="grid-3">
        <HeroStat label="Conversion Rate" value={31.4} suffix="%" delta="+4.2%" deltaDir="up" hint="Calls that resulted in a closed deal." />
        <HeroStat label="Calls to Close" value={4.8} delta="−0.6" deltaDir="up" hint="Average calls needed per won deal. Lower is better." />
        <HeroStat label="Revenue Attributed" value={148720} suffix="" delta="+22%" deltaDir="up" hint="Total revenue from deals first contacted by this agent." />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <div className="glass" style={{ padding: 22 }}>
          <PanelTitle hint="How often each objection comes up during sales conversations.">
            Objection frequency
          </PanelTitle>
          <HBarChart data={OBJECTION_BAR} color="#7b61ff" />
        </div>
        <div className="glass" style={{ padding: 22 }}>
          <PanelTitle hint="Best calling windows by day-of-week and hour of day.">
            Best performing time slots
          </PanelTitle>
          <Heatmap data={HEATMAP} accentColor="#00d4ff" />
        </div>
      </div>
    </div>
  );
}

function BookingView() {
  return (
    <div className="col gap-5">
      <div className="grid-3">
        <HeroStat label="Bookings vs Calls" value={78.5} suffix="%" delta="+5.1%" deltaDir="up" hint="Percentage of calls that produced a confirmed booking." />
        <HeroStat label="No-show Rate" value={11.2} suffix="%" delta="−2.4%" deltaDir="up" hint="Confirmed bookings that did not attend. Lower is better." />
        <HeroStat label="Avg Time to Book" value={2.9} suffix=" min" delta="−0.4 min" deltaDir="up" hint="Average call duration to confirm a booking." />
      </div>
      <div className="glass" style={{ padding: 22 }}>
        <PanelTitle hint="Booking density across hours and days.">
          Booking density heatmap
        </PanelTitle>
        <Heatmap data={HEATMAP} accentColor="#7b61ff" />
      </div>
    </div>
  );
}

function SupportView() {
  return (
    <div className="col gap-5">
      <div className="grid-3">
        <HeroStat label="First-Call Resolution" value={92.1} suffix="%" delta="+3.4%" deltaDir="up" hint="Issues fully resolved in a single interaction." />
        <HeroStat label="Avg Handle Time" value={6.2} suffix=" min" delta="−0.8 min" deltaDir="up" hint="Average duration from greeting to call close." />
        <HeroStat label="Escalation Rate" value={4.8} suffix="%" delta="−1.2%" deltaDir="up" hint="Conversations transferred to a human agent." />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <div className="glass" style={{ padding: 22 }}>
          <PanelTitle hint="Top issue categories handled.">
            Issue category breakdown
          </PanelTitle>
          <div className="row gap-5" style={{ alignItems: 'center' }}>
            <Donut data={ISSUE_DONUT} total="100%" totalLabel="ISSUES" size={180} />
            <div className="flex-1"><DonutLegend data={ISSUE_DONUT} /></div>
          </div>
        </div>
        <div className="glass" style={{ padding: 22 }}>
          <PanelTitle hint="Customer Satisfaction score, 12-week rolling.">
            CSAT trend (12 weeks)
          </PanelTitle>
          <LineMetric data={CSAT_TREND} dataKey="csat" name="CSAT" color="#00e5a0" yDomain={[3.8, 5]} />
        </div>
      </div>
    </div>
  );
}

function ColdView() {
  return (
    <div className="col gap-5">
      <div className="grid-4">
        <HeroStat label="Connect Rate" value={34.2} suffix="%" delta="+2.8%" deltaDir="up" hint="Calls reaching a live person." />
        <HeroStat label="Interest Rate" value={12.6} suffix="%" delta="+1.4%" deltaDir="up" hint="Conversations that progressed past the opener." />
        <HeroStat label="Callbacks Requested" value={6.8} suffix="%" delta="+0.9%" deltaDir="up" hint="Prospects who asked to be contacted later." />
        <HeroStat label="DNC Hits" value={1.4} suffix="%" delta="−0.3%" deltaDir="up" hint="Do-Not-Call requests during outbound calls. Lower is better." />
      </div>
      <div className="glass" style={{ padding: 22 }}>
        <PanelTitle hint="Comparing opener scripts side-by-side.">
          Script performance
        </PanelTitle>
        <div className="col gap-3">
          {[
            { name: 'Pattern Interrupt v3', connect: 38.1, interest: 14.2, best: true },
            { name: 'Direct Value Prop',    connect: 31.5, interest: 11.8 },
            { name: 'Question-First',       connect: 29.0, interest: 10.4 },
            { name: 'Referral Mention',     connect: 35.7, interest: 13.1 },
            { name: 'Quick Pitch v1',       connect: 22.3, interest:  7.9, worst: true },
          ].map((s, i) => (
            <div key={i} className="row" style={{
              padding: '12px 16px',
              background: s.best ? 'linear-gradient(90deg, rgba(0,229,160,0.08), transparent)' :
                          s.worst ? 'linear-gradient(90deg, rgba(255,77,109,0.08), transparent)' :
                          'rgba(255,255,255,0.02)',
              borderRadius: 10,
              border: '1px solid ' + (s.best ? 'rgba(0,229,160,0.25)' : s.worst ? 'rgba(255,77,109,0.25)' : 'var(--glass-border)'),
              gap: 16,
            }}>
              <div style={{ width: 22 }}>
                {s.best && <Icon name="trophy" size={14} color="var(--emerald)" />}
                {s.worst && <Icon name="alert" size={14} color="var(--rose)" />}
              </div>
              <div className="flex-1" style={{ fontWeight: 500 }}>{s.name}</div>
              <div className="row gap-5" style={{ width: 280 }}>
                <div style={{ flex: 1 }}>
                  <div className="cap text-3">Connect</div>
                  <div className="row gap-2 mt-2">
                    <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                      <div style={{ width: `${s.connect * 2.5}%`, height: '100%', background: 'linear-gradient(90deg, #00d4ff, #00d4ff80)', boxShadow: '0 0 6px #00d4ff80' }} />
                    </div>
                    <span className="tabular text-2" style={{ fontSize: 11, minWidth: 36 }}>{s.connect}%</span>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div className="cap text-3">Interest</div>
                  <div className="row gap-2 mt-2">
                    <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                      <div style={{ width: `${s.interest * 5}%`, height: '100%', background: 'linear-gradient(90deg, #7b61ff, #7b61ff80)', boxShadow: '0 0 6px #7b61ff80' }} />
                    </div>
                    <span className="tabular text-2" style={{ fontSize: 11, minWidth: 36 }}>{s.interest}%</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AllView() {
  return (
    <div className="col gap-5">
      <div className="grid-4">
        <HeroStat label="Total Interactions" value={28744} delta="+12%" deltaDir="up" hint="Voice + WhatsApp across all agents." />
        <HeroStat label="Overall Conv. Rate" value={42.1} suffix="%" delta="+3.6%" deltaDir="up" hint="Successful outcome / total interactions." />
        <HeroStat label="Avg Sentiment" value={0.72} delta="+0.08" deltaDir="up" hint="0–1 scale, higher is more positive." />
        <HeroStat label="Live Coverage" value={24} suffix="h" hint="Total hours of agent uptime today." />
      </div>
    </div>
  );
}

function PageAnalytics() {
  const [type, setType] = useState('all');

  const views = {
    all: <AllView />,
    sales: <SalesView />,
    support: <SupportView />,
    booking: <BookingView />,
    coldcall: <ColdView />,
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-sub">Cross-agent performance · drill into a type to compare</p>
        </div>
        <div className="row gap-2">
          <button className="btn btn-sm"><Icon name="calendar" size={12} /> Last 30 days <Icon name="chevd" size={10} color="var(--text-3)" /></button>
          <button className="btn btn-sm"><Icon name="download" size={12} /> Export</button>
        </div>
      </div>

      <div className="row between mb-5">
        <div className="tabs">
          {[
            { id: 'all',      label: 'All Agents' },
            { id: 'support',  label: 'Call Center' },
            { id: 'sales',    label: 'Sales' },
            { id: 'booking',  label: 'Booking' },
            { id: 'coldcall', label: 'Cold Call' },
          ].map((t) => (
            <button key={t.id} className={`tab ${type === t.id ? 'active' : ''}`} onClick={() => setType(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {views[type]}

      {/* Shared analytics — always visible */}
      <div className="mt-5">
        <h2 className="cap text-2" style={{ margin: '24px 0 12px' }}>Shared metrics</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 18 }}>
          <div className="glass" style={{ padding: 22 }}>
            <PanelTitle>Monthly volume trend</PanelTitle>
            <VolumeChart data={VOLUME_30D} />
          </div>
          <div className="glass" style={{ padding: 22 }}>
            <PanelTitle>Peak hours</PanelTitle>
            <HoursBar data={PEAK_HOURS} />
          </div>
          <div className="glass" style={{ padding: 22 }}>
            <PanelTitle>Channel split</PanelTitle>
            <Donut data={CHANNEL_DONUT} total="100%" totalLabel="SPLIT" size={160} />
            <div className="mt-4"><DonutLegend data={CHANNEL_DONUT} /></div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.PageAnalytics = PageAnalytics;
