// ============================================================
// OVERVIEW PAGE
// ============================================================

function PageOverview({ goto }) {
  const totalCallsSpark = VOLUME_30D.map((d) => d.voice + d.whatsapp).slice(-14);
  const liveAgents = AGENTS.filter((a) => a.status === 'live').length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Overview</h1>
          <p className="page-sub">Real-time mission control for your agent fleet · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="row gap-2">
          <button className="btn btn-sm">
            <Icon name="download" size={13} /> Export report
          </button>
          <button className="btn btn-sm btn-primary" onClick={() => goto('agents')}>
            <Icon name="plus" size={13} /> New Agent
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid-4 mb-5">
        <div className="glass kpi-card hover">
          <div className="kpi-head">
            <div className="kpi-label">
              <Tip text="All voice + WhatsApp interactions handled by your agents in the current billing month.">
                Total Calls
              </Tip>
            </div>
            <div className="kpi-icon"><Icon name="phone" size={16} /></div>
          </div>
          <div className="kpi-value">
            <CountUp to={18472} />
          </div>
          <div className="kpi-foot">
            <Sparkline data={totalCallsSpark} color="#00d4ff" width={120} height={26} />
            <span className="delta up"><Icon name="trend" size={11} />+12.4%</span>
          </div>
        </div>

        <div className="glass kpi-card hover">
          <div className="kpi-head">
            <div className="kpi-label">
              <Tip text="Agents currently running and receiving traffic. Paused agents are not counted.">
                Active Agents
              </Tip>
            </div>
            <div className="kpi-icon" style={{ color: 'var(--emerald)' }}>
              <span className="live-dot" style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--emerald)', boxShadow: '0 0 12px var(--emerald)' }} />
            </div>
          </div>
          <div className="kpi-value"><CountUp to={liveAgents} /> <span className="unit">/ {AGENTS.length}</span></div>
          <div className="kpi-foot">
            <span className="text-2">3 live · 1 paused</span>
            <Pill variant="live" dot>STREAMING</Pill>
          </div>
        </div>

        <div className="glass kpi-card hover">
          <div className="kpi-head">
            <div className="kpi-label">
              <Tip text="Sum of Voice Agent Cost + AI Agent Cost + Call Cost for the current billing month.">
                Total Spend
              </Tip>
            </div>
            <div className="kpi-icon" style={{ color: 'var(--violet-soft)' }}><Icon name="dollar" size={16} /></div>
          </div>
          <div className="kpi-value">
            <CountUp to={6958} prefix="$" />
            <span className="unit">.24</span>
          </div>
          <div className="kpi-foot">
            <span className="text-2">of $9,500 budget</span>
            <span className="delta up"><Icon name="trend" size={11} />+8.1%</span>
          </div>
        </div>

        <div className="glass kpi-card hover">
          <div className="kpi-head">
            <div className="kpi-label">
              <Tip text="Average duration of completed conversations across all channels.">
                Avg Duration
              </Tip>
            </div>
            <div className="kpi-icon" style={{ color: 'var(--amber)' }}><Icon name="clock" size={16} /></div>
          </div>
          <div className="kpi-value">
            <span style={{ display: 'inline-flex', alignItems: 'baseline' }}>4<span style={{ fontSize: 22, color: 'var(--text-2)', margin: '0 2px' }}>m</span>26<span style={{ fontSize: 22, color: 'var(--text-2)', marginLeft: 2 }}>s</span></span>
          </div>
          <div className="kpi-foot">
            <span className="text-2">vs 3m 58s last month</span>
            <span className="delta down"><Icon name="trendDown" size={11} />−2.3%</span>
          </div>
        </div>
      </div>

      {/* Two-column body */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 20 }}>
        {/* LEFT */}
        <div className="col gap-5">
          {/* Live activity feed */}
          <div className="glass">
            <div className="row between" style={{ padding: '16px 20px 12px' }}>
              <div className="row gap-3">
                <span className="cap text-2">Live Activity</span>
                <Pill variant="live" dot>STREAMING</Pill>
              </div>
              <button className="btn btn-sm btn-ghost">View all <Icon name="chevron" size={12} /></button>
            </div>
            <div className="feed">
              {FEED.map((f) => {
                const agent = AGENTS.find((a) => a.name === f.agent);
                return (
                  <div key={f.id} className="feed-row">
                    <div className="feed-icon" style={{
                      color: f.pill.cls === 'emerald' ? 'var(--emerald)' :
                             f.pill.cls === 'rose'    ? 'var(--rose)' :
                             f.pill.cls === 'amber'   ? 'var(--amber)' : 'var(--cyan)'
                    }}>
                      <Icon name={f.icon} size={14} />
                    </div>
                    {agent && <AgentAvatar agent={agent} size="sm" />}
                    <div className="feed-main">
                      <div className="feed-title">{f.text}</div>
                      <div className="feed-meta">
                        <span style={{ color: 'var(--text-1)' }}>{f.agent}</span>
                        {' · '}
                        {AGENT_TYPES[agent.type].label}
                      </div>
                    </div>
                    <Pill variant={f.pill.cls} dot={f.pill.cls === 'live' || f.pill.cls === 'emerald'}>{f.pill.label}</Pill>
                    <span className="feed-time">{f.when}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Volume chart */}
          <div className="glass" style={{ padding: 20 }}>
            <div className="row between mb-4">
              <div>
                <div className="cap text-2 mb-2">Daily Volume · last 30 days</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600 }}>
                  18,472 <span className="text-2" style={{ fontSize: 14, fontWeight: 400 }}>interactions</span>
                </div>
              </div>
              <div className="row gap-4">
                <div className="row gap-2"><i style={{ width: 9, height: 9, borderRadius: 2, background: '#00d4ff', boxShadow: '0 0 8px #00d4ff80' }} /><span style={{ fontSize: 12 }}>Voice Calls</span></div>
                <div className="row gap-2"><i style={{ width: 9, height: 9, borderRadius: 2, background: '#7b61ff', boxShadow: '0 0 8px #7b61ff80' }} /><span style={{ fontSize: 12 }}>WhatsApp</span></div>
              </div>
            </div>
            <VolumeChart data={VOLUME_30D} />
          </div>
        </div>

        {/* RIGHT */}
        <div className="col gap-5">
          <div className="glass" style={{ padding: 20 }}>
            <div className="row between mb-4">
              <span className="cap text-2">Agent Status</span>
              <button className="btn btn-sm btn-ghost" onClick={() => goto('agents')}>Manage <Icon name="chevron" size={12} /></button>
            </div>
            <div className="col gap-3">
              {AGENTS.map((a) => (
                <div key={a.id} className="mini-agent">
                  <AgentAvatar agent={a} size="sm" />
                  <div className="mini-info">
                    <div className="mini-name">{a.name}</div>
                    <div className="mini-type">{AGENT_TYPES[a.type].label}</div>
                  </div>
                  <Pill variant={a.status === 'live' ? 'live' : a.status === 'paused' ? 'paused' : 'idle'} dot>
                    {a.status.toUpperCase()}
                  </Pill>
                  <div style={{ minWidth: 64 }}>
                    <div className="mini-stat tabular">{a.callsToday}</div>
                    <div className="mini-stat-label">Today</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top performer */}
          <div className="glass top-perf">
            <div className="row between mb-4">
              <div className="crown"><Icon name="trophy" size={11} /> Top Performer</div>
              <Pill variant="emerald">+18% vs last week</Pill>
            </div>
            <div className="row gap-4 mb-4">
              <AgentAvatar agent={AGENTS[1]} />
              <div className="flex-1">
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }}>Max</div>
                <div className="text-2" style={{ fontSize: 12 }}>Call Center Support · Voice + WhatsApp</div>
              </div>
              <div className="stars" title="4.9 / 5">★★★★★</div>
            </div>
            <div className="grid-3" style={{ gap: 12 }}>
              <div className="col" style={{ padding: 12, background: 'rgba(255,255,255,0.025)', borderRadius: 10, border: '1px solid var(--glass-border)' }}>
                <div className="display" style={{ fontSize: 22, fontWeight: 600, color: '#00e5a0' }}>92.1%</div>
                <div className="cap text-3 mt-2">Resolution</div>
              </div>
              <div className="col" style={{ padding: 12, background: 'rgba(255,255,255,0.025)', borderRadius: 10, border: '1px solid var(--glass-border)' }}>
                <div className="display" style={{ fontSize: 22, fontWeight: 600 }}>287</div>
                <div className="cap text-3 mt-2">Calls today</div>
              </div>
              <div className="col" style={{ padding: 12, background: 'rgba(255,255,255,0.025)', borderRadius: 10, border: '1px solid var(--glass-border)' }}>
                <div className="display" style={{ fontSize: 22, fontWeight: 600 }}>4.9</div>
                <div className="cap text-3 mt-2">CSAT</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.PageOverview = PageOverview;
