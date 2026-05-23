// ============================================================
// AGENTS PAGE — grid + New Agent drawer
// ============================================================

function AgentCard({ agent, onConfigure, onTranscripts, onToggle }) {
  const type = AGENT_TYPES[agent.type];
  return (
    <div className="glass agent-card hover">
      <div className="ac-top">
        <AgentAvatar agent={agent} />
        <div className="flex-1">
          <div className="ac-name">{agent.name}</div>
          <div className="ac-subtitle">{type.label}</div>
          <div className="ac-badges">
            <ChannelBadges channels={agent.channels} />
          </div>
        </div>
        <div className="col" style={{ alignItems: 'flex-end', gap: 10 }}>
          <Pill variant={agent.status === 'live' ? 'live' : agent.status === 'paused' ? 'paused' : 'idle'} dot>
            {agent.status === 'live' ? 'LIVE' : agent.status === 'paused' ? 'PAUSED' : 'IDLE'}
          </Pill>
          <Toggle on={agent.status === 'live'} onChange={() => onToggle(agent.id)} />
        </div>
      </div>

      <div className="ac-stats">
        <div className="ac-stat">
          <div className="v">{agent.callsToday}</div>
          <div className="l">Calls today</div>
        </div>
        <div className="ac-stat">
          <div className="v">{agent.conversion}%</div>
          <div className="l">Conv. rate</div>
        </div>
        <div className="ac-stat">
          <div className="v">{agent.avgDuration}</div>
          <div className="l">Avg dur.</div>
        </div>
      </div>

      <div className="ac-actions">
        <button className="btn btn-sm flex-1" onClick={() => onConfigure(agent)}>
          <Icon name="cog" size={13} /> Configure
        </button>
        <button className="btn btn-sm flex-1" onClick={() => onTranscripts(agent)}>
          <Icon name="document" size={13} /> Transcripts
        </button>
      </div>
    </div>
  );
}

function NewAgentDrawer({ open, onClose, onCreate, editing }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('sales');
  const [channels, setChannels] = useState(['voice']);
  const [personality, setPersonality] = useState('Professional');
  const [language, setLanguage] = useState('English (US)');
  const [greeting, setGreeting] = useState('');
  const [attachedKb, setAttachedKb] = useState([]);

  useEffect(() => {
    if (editing) {
      setName(editing.name); setType(editing.type); setChannels(editing.channels);
      setPersonality(editing.personality); setLanguage(editing.language);
      setGreeting(editing.greeting); setAttachedKb(editing.kb || []);
    } else if (open) {
      setName(''); setType('sales'); setChannels(['voice']);
      setPersonality('Professional'); setLanguage('English (US)');
      setGreeting(''); setAttachedKb([]);
    }
  }, [editing, open]);

  const toggleChannel = (c) => setChannels((s) => s.includes(c) ? s.filter((x) => x !== c) : [...s, c]);
  const toggleKb = (id) => setAttachedKb((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={editing ? `Configure · ${editing.name}` : 'Create New Agent'}
      subtitle={editing ? 'Update your agent\u2019s personality, knowledge, and channels.' : 'Configure your agent in under a minute.'}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onCreate({ name, type, channels, personality, language, greeting, kb: attachedKb })}>
            <Icon name="check" size={13} /> {editing ? 'Save changes' : 'Create agent'}
          </button>
        </>
      }
    >
      <div className="col gap-5">
        <div>
          <label className="field-label">Agent Name</label>
          <input className="input" placeholder="e.g. Aria" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div>
          <label className="field-label">Agent Type</label>
          <div className="col gap-2">
            {Object.values(AGENT_TYPES).map((t) => (
              <button
                key={t.id}
                onClick={() => setType(t.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: type === t.id ? 'linear-gradient(135deg, rgba(0,212,255,0.12), rgba(123,97,255,0.08))' : 'rgba(255,255,255,0.025)',
                  border: '1px solid ' + (type === t.id ? 'rgba(0,212,255,0.35)' : 'var(--glass-border)'),
                  color: 'inherit', textAlign: 'left', cursor: 'pointer',
                  transition: 'all 150ms',
                  boxShadow: type === t.id ? '0 0 18px rgba(0,212,255,0.18)' : 'none',
                }}
              >
                <div className={`agent-avatar ${t.color} sm`}>
                  <Icon name={t.icon} size={16} color="#04070f" strokeWidth={1.8} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{t.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>{t.desc}</div>
                </div>
                {type === t.id && <Icon name="check" size={14} color="var(--cyan)" />}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="field-label">Channels</label>
          <div className="row gap-2">
            <button
              onClick={() => toggleChannel('voice')}
              className="btn btn-sm"
              style={channels.includes('voice') ? {
                background: 'linear-gradient(135deg, rgba(0,212,255,0.16), rgba(0,212,255,0.06))',
                borderColor: 'rgba(0,212,255,0.4)', color: '#fff',
                boxShadow: '0 0 16px rgba(0,212,255,0.2)',
              } : {}}
            >
              <Icon name="phone" size={12} /> Voice
            </button>
            <button
              onClick={() => toggleChannel('whatsapp')}
              className="btn btn-sm"
              style={channels.includes('whatsapp') ? {
                background: 'linear-gradient(135deg, rgba(123,97,255,0.18), rgba(123,97,255,0.06))',
                borderColor: 'rgba(123,97,255,0.4)', color: '#fff',
                boxShadow: '0 0 16px rgba(123,97,255,0.2)',
              } : {}}
            >
              <Icon name="whatsapp" size={12} /> WhatsApp
            </button>
          </div>
        </div>

        <div className="grid-2" style={{ gap: 16 }}>
          <div>
            <label className="field-label">Personality / Tone</label>
            <select className="select" value={personality} onChange={(e) => setPersonality(e.target.value)}>
              <option>Professional</option>
              <option>Friendly</option>
              <option>Assertive</option>
              <option>Empathetic</option>
            </select>
          </div>
          <div>
            <label className="field-label">Language</label>
            <select className="select" value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option>English (US)</option>
              <option>English (UK)</option>
              <option>Sinhala / English</option>
              <option>Tamil / English</option>
              <option>Arabic</option>
              <option>Hindi</option>
            </select>
          </div>
        </div>

        <div>
          <label className="field-label">Greeting message</label>
          <textarea className="textarea" rows={3} placeholder="Hi, this is {agent_name} from {workspace}..." value={greeting} onChange={(e) => setGreeting(e.target.value)} />
        </div>

        <div>
          <label className="field-label">Knowledge base</label>
          <div className="col gap-2" style={{
            maxHeight: 200, overflowY: 'auto',
            padding: 6, background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid var(--glass-border)'
          }}>
            {KB.map((k) => (
              <div
                key={k.id}
                onClick={() => toggleKb(k.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                  background: attachedKb.includes(k.id) ? 'rgba(0,212,255,0.08)' : 'transparent',
                  border: '1px solid ' + (attachedKb.includes(k.id) ? 'rgba(0,212,255,0.3)' : 'transparent'),
                  transition: 'all 150ms',
                }}
              >
                <div style={{
                  width: 16, height: 16, borderRadius: 4,
                  border: '1.5px solid ' + (attachedKb.includes(k.id) ? 'var(--cyan)' : 'var(--text-3)'),
                  background: attachedKb.includes(k.id) ? 'var(--cyan)' : 'transparent',
                  display: 'grid', placeItems: 'center', flexShrink: 0,
                  boxShadow: attachedKb.includes(k.id) ? '0 0 8px rgba(0,212,255,0.5)' : 'none',
                }}>
                  {attachedKb.includes(k.id) && <Icon name="check" size={10} color="#04070f" strokeWidth={3} />}
                </div>
                <div style={{ flex: 1, fontSize: 12 }}>
                  <div style={{ fontWeight: 500 }}>{k.title}</div>
                  <div style={{ color: 'var(--text-3)', fontSize: 11 }}>{k.type}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Drawer>
  );
}

function PageAgents() {
  const [agents, setAgents] = useState(AGENTS);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const toast = useToast();

  const onCreate = (data) => {
    if (editing) {
      setAgents((s) => s.map((a) => a.id === editing.id ? { ...a, ...data } : a));
      toast.push({ kind: 'success', title: `${data.name} updated`, body: 'Configuration saved successfully.' });
    } else {
      const id = 'agt_' + Math.random().toString(36).slice(2, 7);
      setAgents((s) => [...s, {
        ...data, id, status: 'paused', callsToday: 0, conversion: 0, avgDuration: '—', rating: 0,
        avatarShape: AGENT_TYPES[data.type].icon,
      }]);
      toast.push({ kind: 'success', title: `${data.name} created`, body: 'Your new agent is paused. Activate it to start.' });
    }
    setDrawerOpen(false); setEditing(null);
  };

  const toggleAgent = (id) => {
    setAgents((s) => s.map((a) => a.id === id ? { ...a, status: a.status === 'live' ? 'paused' : 'live' } : a));
    const a = agents.find((x) => x.id === id);
    toast.push({ kind: 'info', title: `${a.name} ${a.status === 'live' ? 'paused' : 'activated'}` });
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Agents</h1>
          <p className="page-sub">{agents.length} agents · {agents.filter((a) => a.status === 'live').length} live · {agents.filter((a) => a.status === 'paused').length} paused</p>
        </div>
        <div className="row gap-2">
          <div className="searchbar" style={{ minWidth: 240 }}>
            <Icon name="search" size={14} color="var(--text-3)" />
            <input placeholder="Search agents…" />
          </div>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setDrawerOpen(true); }}>
            <Icon name="plus" size={13} /> New Agent
          </button>
        </div>
      </div>

      <div className="agents-grid">
        {agents.map((a) => (
          <AgentCard
            key={a.id}
            agent={a}
            onConfigure={(ag) => { setEditing(ag); setDrawerOpen(true); }}
            onTranscripts={() => toast.push({ kind: 'info', title: 'Opening transcripts…' })}
            onToggle={toggleAgent}
          />
        ))}
        <button
          className="glass hover"
          onClick={() => { setEditing(null); setDrawerOpen(true); }}
          style={{
            border: '1px dashed var(--glass-border-strong)',
            background: 'rgba(255,255,255,0.018)',
            minHeight: 248,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
            cursor: 'pointer', color: 'var(--text-2)',
          }}
        >
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(135deg, rgba(0,212,255,0.12), rgba(123,97,255,0.08))',
            border: '1px solid rgba(0,212,255,0.25)',
            display: 'grid', placeItems: 'center',
            boxShadow: '0 0 24px rgba(0,212,255,0.18)',
          }}>
            <Icon name="plus" size={22} color="var(--cyan)" />
          </div>
          <div style={{ fontWeight: 500, color: 'var(--text-1)' }}>Add another agent</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Sales · Support · Booking · Cold Call</div>
        </button>
      </div>

      <NewAgentDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditing(null); }}
        onCreate={onCreate}
        editing={editing}
      />
    </div>
  );
}

window.PageAgents = PageAgents;
