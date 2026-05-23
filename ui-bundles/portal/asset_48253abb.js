// ============================================================
// TRANSCRIPTS PAGE
// ============================================================

function fakeWaveBars(seed, count = 80) {
  const rng = (i) => {
    const x = Math.sin(seed * 9301 + i * 49297) * 233280;
    return x - Math.floor(x);
  };
  return Array.from({ length: count }, (_, i) => {
    const env = Math.exp(-Math.pow((i / count - 0.5) / 0.4, 2));
    return Math.max(4, Math.round((rng(i) * 80 + 20) * (0.4 + 0.6 * env)));
  });
}

function PageTranscripts() {
  const [selectedId, setSelectedId] = useState(TRANSCRIPTS[0].id);
  const [filterAgent, setFilterAgent] = useState('All');
  const [filterChannel, setFilterChannel] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [search, setSearch] = useState('');
  const toast = useToast();

  const filtered = TRANSCRIPTS.filter((t) => {
    if (filterAgent !== 'All' && t.agent !== filterAgent) return false;
    if (filterChannel !== 'All' && t.channel !== filterChannel.toLowerCase()) return false;
    if (filterStatus !== 'All' && t.outcome !== filterStatus) return false;
    if (search && !t.thread.some((m) => m.text.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  const tx = TRANSCRIPTS.find((t) => t.id === selectedId);
  const agent = tx ? AGENTS.find((a) => a.name === tx.agent) : null;

  const waveBars = useMemo(() => tx ? fakeWaveBars(tx.id.charCodeAt(3) || 5) : [], [tx?.id]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Transcripts</h1>
          <p className="page-sub">{TRANSCRIPTS.length} conversations · full searchable history with sentiment scoring</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="glass row gap-3 mb-5" style={{ padding: 12, flexWrap: 'wrap' }}>
        <select className="select" style={{ width: 'auto', minWidth: 140 }} value={filterAgent} onChange={(e) => setFilterAgent(e.target.value)}>
          <option>All</option>
          {AGENTS.map((a) => <option key={a.id}>{a.name}</option>)}
        </select>
        <button className="btn btn-sm">
          <Icon name="calendar" size={12} /> May 1 – May 23
          <Icon name="chevd" size={11} color="var(--text-3)" />
        </button>
        <select className="select" style={{ width: 'auto', minWidth: 120 }} value={filterChannel} onChange={(e) => setFilterChannel(e.target.value)}>
          <option>All</option>
          <option>Voice</option>
          <option>WhatsApp</option>
        </select>
        <select className="select" style={{ width: 'auto', minWidth: 130 }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option>All</option>
          <option>Converted</option>
          <option>Booked</option>
          <option>Completed</option>
          <option>Escalated</option>
          <option>No Answer</option>
          <option>Failed</option>
        </select>
        <div className="searchbar flex-1" style={{ minWidth: 240 }}>
          <Icon name="search" size={14} color="var(--text-3)" />
          <input placeholder="Search by keyword in conversation…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-sm" onClick={() => { setFilterAgent('All'); setFilterChannel('All'); setFilterStatus('All'); setSearch(''); }}>
          <Icon name="x" size={12} /> Clear
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '35% 65%', gap: 18, minHeight: 700 }}>
        {/* LEFT — list */}
        <div className="glass" style={{ overflow: 'hidden' }}>
          <div className="row between" style={{ padding: '14px 18px', borderBottom: '1px solid var(--glass-border)' }}>
            <span className="cap text-2">{filtered.length} results</span>
            <button className="btn btn-sm btn-ghost"><Icon name="filter" size={12} /></button>
          </div>
          <div style={{ maxHeight: 720, overflowY: 'auto' }}>
            {filtered.length === 0 && <EmptyState icon="document" title="No transcripts match" body="Adjust your filters or search." />}
            {filtered.map((t) => {
              const ag = AGENTS.find((a) => a.name === t.agent);
              return (
                <div key={t.id} className={`tx-row ${t.id === selectedId ? 'active' : ''}`} onClick={() => setSelectedId(t.id)}>
                  <div className="tx-top">
                    <div className="row gap-2">
                      <AgentAvatar agent={ag} size="sm" />
                      <div>
                        <div className="tx-agent">{t.agent}</div>
                        <div className="tx-id mono">{t.caller}</div>
                      </div>
                    </div>
                    <span className={`sentiment-dot ${t.sentiment}`} title={`Sentiment: ${t.sentiment}`} />
                  </div>
                  <div className="tx-bot">
                    <Icon name={t.channel === 'voice' ? 'phone' : 'whatsapp'} size={11} color="var(--text-2)" />
                    <span>{t.duration}</span>
                    <span>·</span>
                    <span>{t.timestamp.slice(11)}</span>
                    <span style={{ flex: 1 }} />
                    <Pill variant={t.outcomePill}>{t.outcome.toUpperCase()}</Pill>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT — detail */}
        {tx && (
          <div className="glass" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', maxHeight: 800 }}>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--glass-border)' }}>
              <div className="row between mb-3">
                <div className="row gap-3">
                  <AgentAvatar agent={agent} />
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>{tx.agent}</div>
                    <div className="row gap-2" style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
                      <Icon name={tx.channel === 'voice' ? 'phone' : 'whatsapp'} size={12} />
                      <span>{tx.channel === 'voice' ? 'Voice Call' : 'WhatsApp'}</span>
                      <span>·</span>
                      <span>{tx.duration}</span>
                      <span>·</span>
                      <span className="mono">{tx.caller}</span>
                      <span>·</span>
                      <span>{tx.timestamp}</span>
                    </div>
                  </div>
                </div>
                <div className="row gap-2">
                  <Pill variant={tx.outcomePill}>{tx.outcome.toUpperCase()}</Pill>
                  <button className="btn btn-sm" onClick={() => toast.push({ kind: 'success', title: 'Transcript exported' })}>
                    <Icon name="download" size={12} /> Export
                  </button>
                </div>
              </div>

              {/* Metrics strip */}
              <div className="grid-4" style={{ gap: 10 }}>
                {[
                  { l: 'Response Time',   v: tx.metrics.responseTime,                       hint: 'Average ms before first reply.' },
                  { l: 'Sentiment Score', v: tx.metrics.sentimentScore.toFixed(2),          hint: 'Range 0.00–1.00. Higher is more positive.' },
                  { l: 'Resolution',      v: tx.metrics.resolution,                         hint: 'Was the customer issue resolved?' },
                  { l: 'Follow-up',       v: tx.metrics.followUp,                           hint: 'Is a follow-up scheduled?' },
                ].map((m, i) => (
                  <div key={i} style={{
                    padding: '10px 14px',
                    background: 'rgba(255,255,255,0.025)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 10,
                  }}>
                    <div className="cap text-3"><Tip text={m.hint}>{m.l}</Tip></div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, marginTop: 4 }}>{m.v}</div>
                  </div>
                ))}
              </div>

              {/* Waveform (voice only) */}
              {tx.channel === 'voice' && tx.chapters && (
                <div className="mt-4">
                  <div className="waveform">
                    <div className="progress" />
                    <div className="wave-bars">
                      {waveBars.map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}
                    </div>
                    <div className="wave-markers">
                      {tx.chapters.map((c) => <span key={c}>{c}</span>)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Conversation */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              <div className="col gap-3" style={{ alignItems: 'stretch' }}>
                {tx.thread.map((m, i) => (
                  <div key={i} className={`bubble ${m.who}`}>
                    <div className="who">{m.who === 'agent' ? 'AI Agent' : 'Customer'}</div>
                    <div>{m.text}</div>
                    <div className="ts mono">{m.t}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

window.PageTranscripts = PageTranscripts;
