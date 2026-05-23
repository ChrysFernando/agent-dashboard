// ============================================================
// SETTINGS PAGE
// ============================================================

function SettingsSection({ title, icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="glass" style={{ marginBottom: 16 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '18px 22px', background: 'transparent', border: 0, cursor: 'pointer',
          color: 'inherit', textAlign: 'left',
        }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--glass-border)',
          display: 'grid', placeItems: 'center',
          color: 'var(--cyan)',
        }}>
          <Icon name={icon} size={15} />
        </div>
        <span style={{ flex: 1, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16 }}>{title}</span>
        <Icon name="chevd" size={14} color="var(--text-3)" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 200ms' }} />
      </button>
      {open && <div style={{ padding: '4px 22px 22px', borderTop: '1px solid var(--glass-border)' }}>{children}</div>}
    </div>
  );
}

function PageSettings() {
  const [notifs, setNotifs] = useState({
    emailCall: true, webhookCall: true,
    emailError: true, webhookError: false,
    emailSpend: true, webhookSpend: true,
  });
  const [retention, setRetention] = useState('90');
  const [wsName, setWsName] = useState('Acme Corp');
  const [wsTz, setWsTz] = useState('Asia/Colombo (UTC+05:30)');
  const [wsLang, setWsLang] = useState('English (US)');
  const toast = useToast();

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-sub">Workspace · notifications · webhooks · team · privacy</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', maxWidth: 980 }}>
        {/* Workspace */}
        <SettingsSection title="Workspace Settings" icon="grid">
          <div className="grid-2 mt-4" style={{ gap: 18 }}>
            <div>
              <label className="field-label">Workspace name</label>
              <input className="input" value={wsName} onChange={(e) => setWsName(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Timezone</label>
              <select className="select" value={wsTz} onChange={(e) => setWsTz(e.target.value)}>
                <option>Asia/Colombo (UTC+05:30)</option>
                <option>America/New_York (UTC−05:00)</option>
                <option>Europe/London (UTC+00:00)</option>
                <option>Asia/Tokyo (UTC+09:00)</option>
                <option>Australia/Sydney (UTC+10:00)</option>
              </select>
            </div>
            <div>
              <label className="field-label">Default language</label>
              <select className="select" value={wsLang} onChange={(e) => setWsLang(e.target.value)}>
                <option>English (US)</option>
                <option>English (UK)</option>
                <option>Sinhala</option>
                <option>Tamil</option>
              </select>
            </div>
            <div>
              <label className="field-label">Workspace logo</label>
              <div className="row gap-3" style={{
                padding: 12, borderRadius: 10,
                background: 'rgba(255,255,255,0.02)',
                border: '1px dashed var(--glass-border-strong)',
              }}>
                <div className="brand-mark" style={{ width: 36, height: 36, borderRadius: 9 }} />
                <div className="flex-1">
                  <div style={{ fontSize: 12, fontWeight: 500 }}>Drop a logo or click to upload</div>
                  <div className="text-3" style={{ fontSize: 11 }}>PNG / SVG · max 2 MB</div>
                </div>
                <button className="btn btn-sm"><Icon name="upload" size={12} /> Upload</button>
              </div>
            </div>
          </div>
          <div className="row mt-5" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={() => toast.push({ kind: 'success', title: 'Workspace updated' })}>
              <Icon name="check" size={13} /> Save changes
            </button>
          </div>
        </SettingsSection>

        {/* Notifications */}
        <SettingsSection title="Notification Settings" icon="bell">
          <div className="mt-4">
            <table className="gtable" style={{ background: 'transparent' }}>
              <thead>
                <tr>
                  <th>Event</th>
                  <th style={{ textAlign: 'center', width: 100 }}>Email</th>
                  <th style={{ textAlign: 'center', width: 100 }}>Webhook</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { id: 'Call',  label: 'Call completed',           desc: 'Per-call summary with transcript link' },
                  { id: 'Error', label: 'Agent error',              desc: 'Connection failures, retry exhaustion' },
                  { id: 'Spend', label: 'Spend threshold hit',      desc: 'When monthly spend crosses your alert' },
                ].map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{row.label}</div>
                      <div className="text-3" style={{ fontSize: 11, marginTop: 2 }}>{row.desc}</div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <Toggle on={notifs['email' + row.id]} onChange={(v) => setNotifs((s) => ({ ...s, ['email' + row.id]: v }))} />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <Toggle on={notifs['webhook' + row.id]} onChange={(v) => setNotifs((s) => ({ ...s, ['webhook' + row.id]: v }))} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SettingsSection>

        {/* Webhooks */}
        <SettingsSection title="API Webhooks" icon="link">
          <div className="mt-4 col gap-3">
            {WEBHOOKS.map((w) => (
              <div key={w.id} className="row" style={{
                padding: '14px 16px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--glass-border)',
                borderRadius: 12,
                gap: 14,
              }}>
                <div className="flex-1" style={{ minWidth: 0 }}>
                  <div className="row gap-2 mb-2">
                    <span className="mono" style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.url}</span>
                    <Pill variant="live" dot>{w.status.toUpperCase()}</Pill>
                  </div>
                  <div className="row gap-2">
                    {w.events.map((ev) => <Pill key={ev} variant="cyan outline">{ev}</Pill>)}
                  </div>
                </div>
                <button className="btn btn-sm"><Icon name="zap" size={12} /> Test</button>
                <button className="icon-btn"><Icon name="edit" size={13} /></button>
                <button className="icon-btn"><Icon name="trash" size={13} /></button>
              </div>
            ))}
          </div>
          <div className="mt-4" style={{
            padding: 16, background: 'rgba(0,212,255,0.04)',
            border: '1px solid rgba(0,212,255,0.2)', borderRadius: 12,
          }}>
            <div className="cap text-2 mb-3">Add webhook</div>
            <div className="row gap-2 mb-3">
              <input className="input flex-1" placeholder="https://api.yourapp.com/aether-events" />
              <input className="input" style={{ width: 200 }} placeholder="Signing secret" type="password" />
            </div>
            <div className="row between">
              <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
                {['call.started', 'call.completed', 'call.failed', 'message.sent', 'agent.error', 'spend.alert'].map((ev) => (
                  <label key={ev} className="row gap-2" style={{ fontSize: 12, padding: '4px 10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: 999, cursor: 'pointer' }}>
                    <input type="checkbox" defaultChecked={ev === 'call.completed'} style={{ accentColor: 'var(--cyan)' }} />
                    <span className="mono" style={{ fontSize: 11 }}>{ev}</span>
                  </label>
                ))}
              </div>
              <button className="btn btn-primary"><Icon name="plus" size={13} /> Add webhook</button>
            </div>
          </div>
        </SettingsSection>

        {/* Team */}
        <SettingsSection title="Team Members" icon="users">
          <div className="mt-4">
            <table className="gtable">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {TEAM.map((m) => (
                  <tr key={m.email}>
                    <td>
                      <div className="row gap-3">
                        <div className={`agent-avatar ${m.color} sm`} style={{ background: undefined, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, color: '#04070f' }}>{m.initials}</div>
                        <span style={{ fontWeight: 500 }}>{m.name}</span>
                      </div>
                    </td>
                    <td className="mono" style={{ fontSize: 12, color: 'var(--text-2)' }}>{m.email}</td>
                    <td>
                      <Pill variant={m.role === 'Owner' ? 'cyan' : m.role === 'Admin' ? 'violet' : 'idle'}>{m.role.toUpperCase()}</Pill>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="icon-btn" style={{ width: 28, height: 28 }}><Icon name="more" size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="row mt-4" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn-primary"><Icon name="plus" size={13} /> Invite team member</button>
          </div>
        </SettingsSection>

        {/* Data & Privacy */}
        <SettingsSection title="Data & Privacy" icon="shield" defaultOpen={false}>
          <div className="mt-4 col gap-4">
            <div>
              <label className="field-label">Data retention policy</label>
              <select className="select" value={retention} onChange={(e) => setRetention(e.target.value)} style={{ maxWidth: 320 }}>
                <option value="30">30 days</option>
                <option value="60">60 days</option>
                <option value="90">90 days (recommended)</option>
                <option value="180">180 days</option>
                <option value="365">1 year</option>
                <option value="forever">Forever</option>
              </select>
              <div className="text-3 mt-2" style={{ fontSize: 11 }}>Transcripts and call recordings older than this are permanently deleted.</div>
            </div>

            <div style={{ padding: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: 12 }}>
              <div className="row between">
                <div>
                  <div style={{ fontWeight: 500 }}>Export your data</div>
                  <div className="text-3" style={{ fontSize: 12, marginTop: 2 }}>Bundle of all transcripts, KB entries, and metadata · delivered to your email within 24h.</div>
                </div>
                <button className="btn"><Icon name="download" size={13} /> Request Export</button>
              </div>
            </div>

            <div style={{
              padding: 18,
              background: 'linear-gradient(135deg, rgba(255,77,109,0.08), rgba(255,77,109,0.02))',
              border: '1px solid rgba(255,77,109,0.3)',
              borderRadius: 12,
            }}>
              <div className="row between">
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--rose)' }}>Danger zone</div>
                  <div className="text-2" style={{ fontSize: 12, marginTop: 4 }}>Permanently delete your workspace, agents, transcripts, and KB. This cannot be undone.</div>
                </div>
                <button className="btn btn-danger"><Icon name="trash" size={13} /> Delete Workspace</button>
              </div>
            </div>
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}

window.PageSettings = PageSettings;
