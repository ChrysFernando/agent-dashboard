// ============================================================
// BILLING PAGE
// ============================================================

function PageBilling() {
  const [sortKey, setSortKey] = useState('total');
  const [sortDir, setSortDir] = useState('desc');
  const [threshold, setThreshold] = useState('9500');
  const toast = useToast();

  const sortedRows = [...USAGE_ROWS].sort((a, b) => {
    let av = a[sortKey], bv = b[sortKey];
    if (typeof av === 'string') {
      const cmp = av.localeCompare(bv);
      return sortDir === 'asc' ? cmp : -cmp;
    }
    return sortDir === 'asc' ? av - bv : bv - av;
  });

  const handleSort = (k) => {
    if (sortKey === k) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('desc'); }
  };

  const arrow = (k) => sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : '';

  const total = USAGE_ROWS.reduce((s, r) => s + r.total, 0);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Billing</h1>
          <p className="page-sub">Detailed usage and cost breakdown · all vendor pricing abstracted</p>
        </div>
        <button className="btn btn-sm"><Icon name="external" size={12} /> Customer portal</button>
      </div>

      {/* Header strip */}
      <div className="glass row" style={{ padding: '14px 20px', marginBottom: 20, gap: 24, flexWrap: 'wrap' }}>
        <div>
          <div className="cap text-3 mb-2">Current Plan</div>
          <div className="row gap-2">
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>Scale</span>
            <Pill variant="cyan">$899 / mo</Pill>
          </div>
        </div>
        <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--glass-border)' }} />
        <div>
          <div className="cap text-3 mb-2">Billing Cycle</div>
          <div style={{ fontWeight: 500 }}>Monthly · May 1 – May 31, 2026</div>
        </div>
        <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--glass-border)' }} />
        <div>
          <div className="cap text-3 mb-2">Next Invoice</div>
          <div className="row gap-2">
            <span style={{ fontWeight: 500 }}>Jun 1, 2026</span>
            <Pill variant="amber">9 days</Pill>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn">Upgrade plan</button>
      </div>

      {/* Cost cards */}
      <div className="grid-3 mb-5">
        <div className="glass kpi-card hover tint-cyan">
          <div className="kpi-head">
            <div className="kpi-label">
              <Tip text="Total spend on voice / call processing — what powers your voice agents.">
                Voice Agent Cost
              </Tip>
            </div>
            <div className="kpi-icon" style={{ color: 'var(--cyan)' }}><Icon name="phone" size={16} /></div>
          </div>
          <div className="kpi-value"><CountUp to={2890} prefix="$" />.40</div>
          <div className="kpi-foot">
            <span className="text-2">42% of total</span>
            <span className="delta up"><Icon name="trend" size={11} />+13.7%</span>
          </div>
        </div>
        <div className="glass kpi-card hover tint-violet">
          <div className="kpi-head">
            <div className="kpi-label">
              <Tip text="Total LLM processing cost — what your agents 'think' with.">
                AI Agent Cost
              </Tip>
            </div>
            <div className="kpi-icon" style={{ color: 'var(--violet-soft)' }}><Icon name="zap" size={16} /></div>
          </div>
          <div className="kpi-value"><CountUp to={3480} prefix="$" />.12</div>
          <div className="kpi-foot">
            <span className="text-2">50% of total</span>
            <span className="delta up"><Icon name="trend" size={11} />+11.5%</span>
          </div>
        </div>
        <div className="glass kpi-card hover">
          <div className="kpi-head">
            <div className="kpi-label">
              <Tip text="Telephony / connection cost — what the carrier charges per call.">
                Call Cost
              </Tip>
            </div>
            <div className="kpi-icon" style={{ color: 'var(--amber)' }}><Icon name="link" size={16} /></div>
          </div>
          <div className="kpi-value"><CountUp to={588} prefix="$" />.72</div>
          <div className="kpi-foot">
            <span className="text-2">8% of total</span>
            <span className="delta up"><Icon name="trend" size={11} />+14.8%</span>
          </div>
        </div>
      </div>

      {/* Cost trend chart */}
      <div className="glass mb-5" style={{ padding: 22 }}>
        <div className="row between mb-4">
          <div>
            <div className="cap text-2 mb-2">Cost Trend · 6 months</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600 }}>$6,958.24 <span className="text-2" style={{ fontSize: 13, fontWeight: 400 }}>this month</span></div>
          </div>
          <div className="row gap-4">
            <div className="row gap-2"><i style={{ width: 9, height: 9, borderRadius: 2, background: '#00d4ff', boxShadow: '0 0 8px #00d4ff80' }} /><span style={{ fontSize: 12 }}>Voice Agent</span></div>
            <div className="row gap-2"><i style={{ width: 9, height: 9, borderRadius: 2, background: '#7b61ff', boxShadow: '0 0 8px #7b61ff80' }} /><span style={{ fontSize: 12 }}>AI Agent</span></div>
            <div className="row gap-2"><i style={{ width: 9, height: 9, borderRadius: 2, background: '#ffb347', boxShadow: '0 0 8px #ffb34780' }} /><span style={{ fontSize: 12 }}>Call</span></div>
          </div>
        </div>
        <CostStackedArea data={BILLING_MONTHS} />
      </div>

      {/* Usage table */}
      <div className="glass mb-5">
        <div className="row between" style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)' }}>
          <span className="cap text-2">Usage breakdown by agent</span>
          <span className="text-2" style={{ fontSize: 12 }}>Total: <span className="tabular" style={{ color: 'var(--text-0)', fontWeight: 600 }}>${total.toFixed(2)}</span></span>
        </div>
        <div style={{ maxHeight: 380, overflowY: 'auto' }}>
          <table className="gtable">
            <thead>
              <tr>
                <th onClick={() => handleSort('agent')}>Agent {arrow('agent')}</th>
                <th onClick={() => handleSort('type')}>Type {arrow('type')}</th>
                <th onClick={() => handleSort('count')} style={{ textAlign: 'right' }}>Calls / Msgs {arrow('count')}</th>
                <th onClick={() => handleSort('dur')} style={{ textAlign: 'right' }}>Duration {arrow('dur')}</th>
                <th onClick={() => handleSort('unit')} style={{ textAlign: 'right' }}>Unit Cost {arrow('unit')}</th>
                <th onClick={() => handleSort('total')} style={{ textAlign: 'right' }}>Total {arrow('total')}</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((r, i) => (
                <tr key={i}>
                  <td><span style={{ fontWeight: 500 }}>{r.agent}</span></td>
                  <td><span className="text-2">{r.type}</span></td>
                  <td className="num" style={{ textAlign: 'right' }}>{r.count.toLocaleString()}</td>
                  <td className="num" style={{ textAlign: 'right' }}>{r.dur}</td>
                  <td className="num" style={{ textAlign: 'right' }}>{r.unit}</td>
                  <td className="num" style={{ textAlign: 'right', color: 'var(--text-0)', fontWeight: 600 }}>${r.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice + spending alert */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 18 }}>
        <div className="glass">
          <div className="row between" style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)' }}>
            <span className="cap text-2">Invoice History</span>
            <button className="btn btn-sm btn-ghost">View all</button>
          </div>
          <div>
            {INVOICES.map((inv) => (
              <div key={inv.id} className="row gap-4" style={{
                padding: '14px 20px',
                borderBottom: '1px solid var(--glass-border)',
              }}>
                <div className="flex-1">
                  <div style={{ fontWeight: 500 }}>{inv.id}</div>
                  <div className="text-2" style={{ fontSize: 12, marginTop: 2 }}>{inv.date}</div>
                </div>
                <div className="tabular" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>${inv.amount.toFixed(2)}</div>
                <Pill variant={inv.cls} dot>{inv.status.toUpperCase()}</Pill>
                <button className="icon-btn" onClick={() => toast.push({ kind: 'success', title: `${inv.id} downloaded` })}>
                  <Icon name="download" size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="glass" style={{ padding: 22 }}>
          <div className="row gap-3 mb-4">
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,179,71,0.1)', border: '1px solid rgba(255,179,71,0.3)', display: 'grid', placeItems: 'center', color: 'var(--amber)' }}>
              <Icon name="alert" size={16} />
            </div>
            <div>
              <div style={{ fontWeight: 500 }}>Spending Alert</div>
              <div className="text-2" style={{ fontSize: 12 }}>Get notified when spend crosses your threshold</div>
            </div>
          </div>
          <label className="field-label">Threshold (USD)</label>
          <div className="row gap-2">
            <div className="row" style={{ flex: 1, padding: '0 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: 10 }}>
              <span className="text-3">$</span>
              <input
                className="input"
                style={{ background: 'transparent', border: 0, padding: '10px 6px' }}
                value={threshold}
                onChange={(e) => setThreshold(e.target.value.replace(/[^0-9.]/g, ''))}
              />
            </div>
            <button className="btn btn-primary" onClick={() => toast.push({ kind: 'success', title: 'Alert saved', body: `Notify when spend exceeds $${threshold}` })}>Save</button>
          </div>
          <div className="mt-4 col gap-2">
            <div className="row between" style={{ fontSize: 12 }}>
              <span className="text-2">Current month</span>
              <span className="tabular">$6,958.24 / ${parseInt(threshold || 0).toLocaleString()}</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
              <div style={{
                width: `${Math.min(100, (6958 / parseInt(threshold || 1)) * 100)}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #00d4ff, #ffb347)',
                boxShadow: '0 0 8px rgba(0,212,255,0.5)',
              }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.PageBilling = PageBilling;
