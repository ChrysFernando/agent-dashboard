// ============================================================
// KNOWLEDGE BASE PAGE
// ============================================================

const KB_TYPES = ['FAQ', 'Script', 'Product Info', 'Objection Handling', 'Pricing'];
const KB_TYPE_PILL = {
  'FAQ':                'cyan',
  'Script':             'violet',
  'Product Info':       'emerald',
  'Objection Handling': 'amber',
  'Pricing':            'rose',
};

function PageKnowledge() {
  const [kbList, setKbList] = useState(KB);
  const [selectedId, setSelectedId] = useState(KB[0].id);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [dirty, setDirty] = useState(null); // local draft
  const toast = useToast();

  const selected = kbList.find((k) => k.id === selectedId);

  // Sync draft to selected
  useEffect(() => {
    if (selected) setDirty({ ...selected });
  }, [selectedId]);

  const filtered = kbList.filter((k) => {
    if (filterType !== 'All' && k.type !== filterType) return false;
    if (search && !k.title.toLowerCase().includes(search.toLowerCase()) && !k.content.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const addEntry = () => {
    const id = 'kb_' + Math.random().toString(36).slice(2, 7);
    const entry = {
      id, title: 'Untitled Entry', type: 'FAQ', updated: 'just now', agents: 0,
      tags: [], content: '# New entry\nStart typing your knowledge here…',
    };
    setKbList((s) => [entry, ...s]);
    setSelectedId(id);
  };

  const save = () => {
    if (!dirty) return;
    setKbList((s) => s.map((k) => k.id === dirty.id ? { ...dirty, updated: 'just now' } : k));
    toast.push({ kind: 'success', title: 'Entry saved', body: `"${dirty.title}" updated.` });
  };

  const remove = (id) => {
    setKbList((s) => s.filter((k) => k.id !== id));
    if (id === selectedId) {
      const next = kbList.find((k) => k.id !== id);
      setSelectedId(next ? next.id : null);
    }
    toast.push({ kind: 'info', title: 'Entry deleted' });
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Knowledge Base</h1>
          <p className="page-sub">{kbList.length} entries · attach to agents for context-aware responses</p>
        </div>
        <div className="row gap-2">
          <div className="searchbar" style={{ minWidth: 260 }}>
            <Icon name="search" size={14} color="var(--text-3)" />
            <input placeholder="Search entries…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="select" style={{ width: 180 }} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option>All</option>
            {KB_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <button className="btn btn-primary" onClick={addEntry}>
            <Icon name="plus" size={13} /> Add Entry
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 18, minHeight: 600 }}>
        {/* LEFT — list */}
        <div className="glass" style={{ padding: 12, alignSelf: 'start' }}>
          {filtered.length === 0 && (
            <EmptyState icon="book" title="No entries match" body="Try a different search term or clear the filter." />
          )}
          {filtered.map((k) => (
            <div
              key={k.id}
              className={`kb-row ${k.id === selectedId ? 'active' : ''}`}
              onClick={() => setSelectedId(k.id)}
            >
              <div className="flex-1" style={{ minWidth: 0 }}>
                <div className="kb-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k.title}</div>
                <div className="row gap-2 kb-meta">
                  <Pill variant={KB_TYPE_PILL[k.type] + ' outline'} className="">{k.type}</Pill>
                  <span>· {k.updated}</span>
                  <span>· {k.agents} agent{k.agents !== 1 ? 's' : ''}</span>
                </div>
              </div>
              <button
                className="icon-btn"
                style={{ width: 28, height: 28 }}
                onClick={(e) => { e.stopPropagation(); remove(k.id); }}
                aria-label="delete"
              >
                <Icon name="trash" size={12} />
              </button>
            </div>
          ))}
        </div>

        {/* RIGHT — editor */}
        {selected && dirty && (
          <div className="glass kb-editor" style={{ padding: 22 }}>
            <div className="row between mb-5">
              <div className="cap text-2">Editing</div>
              <div className="row gap-2">
                <button className="btn btn-sm" onClick={() => setDirty({ ...selected })}>
                  <Icon name="x" size={12} /> Discard
                </button>
                <button className="btn btn-sm btn-primary" onClick={save}>
                  <Icon name="check" size={12} /> Save Changes
                </button>
              </div>
            </div>

            <div className="grid-2 mb-4" style={{ gap: 16 }}>
              <div>
                <label className="field-label">Title</label>
                <input className="input" value={dirty.title} onChange={(e) => setDirty({ ...dirty, title: e.target.value })} />
              </div>
              <div>
                <label className="field-label">Type</label>
                <select className="select" value={dirty.type} onChange={(e) => setDirty({ ...dirty, type: e.target.value })}>
                  {KB_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="field-label">Content</label>
              <textarea
                className="textarea"
                rows={16}
                value={dirty.content}
                onChange={(e) => setDirty({ ...dirty, content: e.target.value })}
              />
              <div className="row between mt-2" style={{ fontSize: 11, color: 'var(--text-3)' }}>
                <span>Plain text, Q&A pairs, bullet lists — all supported</span>
                <span>{dirty.content.length} chars · {dirty.content.split('\n').length} lines</span>
              </div>
            </div>

            <div className="grid-2 mb-4" style={{ gap: 16 }}>
              <div>
                <label className="field-label">Attached Agents</label>
                <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
                  {AGENTS.map((a) => {
                    const attached = a.kb && a.kb.includes(dirty.id);
                    return (
                      <button
                        key={a.id}
                        className="btn btn-sm"
                        style={attached ? {
                          background: 'linear-gradient(135deg, rgba(0,212,255,0.16), rgba(0,212,255,0.06))',
                          borderColor: 'rgba(0,212,255,0.4)',
                          boxShadow: '0 0 12px rgba(0,212,255,0.18)',
                        } : {}}
                      >
                        <AgentAvatar agent={a} size="sm" />
                        <span style={{ marginLeft: 4 }}>{a.name}</span>
                        {attached && <Icon name="check" size={12} color="var(--cyan)" />}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="field-label">Tags</label>
                <div className="row gap-2" style={{ flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  {dirty.tags.map((t, i) => (
                    <span key={i} className="pill outline cyan">
                      {t}
                      <button
                        onClick={() => setDirty({ ...dirty, tags: dirty.tags.filter((_, j) => j !== i) })}
                        style={{ background: 'transparent', border: 0, color: 'inherit', cursor: 'pointer', padding: 0, marginLeft: 4, display: 'inline-flex' }}
                      >
                        <Icon name="x" size={10} />
                      </button>
                    </span>
                  ))}
                  <input
                    className="input"
                    style={{ width: 120, padding: '4px 10px', fontSize: 11 }}
                    placeholder="+ add tag"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        setDirty({ ...dirty, tags: [...dirty.tags, e.target.value.trim()] });
                        e.target.value = '';
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        {!selected && (
          <div className="glass" style={{ display: 'grid', placeItems: 'center', minHeight: 600 }}>
            <EmptyState
              icon="book"
              title="No entry selected"
              body="Pick an entry from the list or create a new one."
              action={<button className="btn btn-primary" onClick={addEntry}><Icon name="plus" size={13} /> Add Entry</button>}
            />
          </div>
        )}
      </div>
    </div>
  );
}

window.PageKnowledge = PageKnowledge;
