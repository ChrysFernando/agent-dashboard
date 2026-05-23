// ============================================================
// Aether portal — live data wiring
// All UI data comes from /api/portal/aether-bundle (DB-backed).
// No hardcoded fallbacks; if the API is unavailable the UI shows empty state.
// ============================================================
(function bootstrapLiveData() {
  try {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/portal/aether-bundle', false);
    xhr.withCredentials = true;
    xhr.send(null);
    if (xhr.status === 401) {
      window.location.href = '/portal/login?next=' + encodeURIComponent(window.location.pathname + window.location.search);
      return;
    }
    if (xhr.status >= 200 && xhr.status < 300) {
      window.__LIVE_DATA = JSON.parse(xhr.responseText);
      console.info('[aether] loaded live data for workspace', (window.__LIVE_DATA.workspace || {}).id);
    } else {
      console.warn('[aether] live bundle request returned', xhr.status, '— rendering empty state');
    }
  } catch (e) {
    console.warn('[aether] live bundle fetch failed — rendering empty state:', e.message);
  }
})();

// UI presentation constants (labels/colors/icons per agent type). These are
// presentation metadata, not user data — kept in code so the UI can render
// the right pill colors and icons. Override by sending AGENT_TYPES in the
// live bundle response if you want them in the DB instead.
const AGENT_TYPES = {
  sales:    { id: 'sales',    label: 'Sales Agent',          color: 'cyan',    desc: 'Outbound conversion & qualified pipeline', icon: 'target' },
  support:  { id: 'support',  label: 'Call Center Support',  color: 'emerald', desc: 'Inbound resolution & customer care',       icon: 'shield' },
  booking:  { id: 'booking',  label: 'Booking Agent',        color: 'violet',  desc: 'Calendar reservations & confirmations',    icon: 'calendar' },
  coldcall: { id: 'coldcall', label: 'Cold Call Agent',      color: 'amber',   desc: 'First-touch outreach & lead screening',    icon: 'flag' },
};

// All collections start empty; populated entirely from the live bundle below.
const AGENTS = [];
const FEED = [];
const VOLUME_30D = [];
const KB = [];
const TRANSCRIPTS = [];
const BILLING_MONTHS = [];
const INVOICES = [];
const USAGE_ROWS = [];
const OBJECTION_BAR = [];
const ISSUE_DONUT = [];
const CHANNEL_DONUT = [];
const CSAT_TREND = [];
const PEAK_HOURS = [];
const HEATMAP = [];
const TEAM = [];
const WEBHOOKS = [];

// Project live data onto the globals the UI components read.
(function applyLive() {
  var live = window.__LIVE_DATA || {};
  var base = {
    AGENT_TYPES: AGENT_TYPES, AGENTS: AGENTS, FEED: FEED, VOLUME_30D: VOLUME_30D,
    KB: KB, TRANSCRIPTS: TRANSCRIPTS,
    BILLING_MONTHS: BILLING_MONTHS, INVOICES: INVOICES, USAGE_ROWS: USAGE_ROWS,
    OBJECTION_BAR: OBJECTION_BAR, ISSUE_DONUT: ISSUE_DONUT, CHANNEL_DONUT: CHANNEL_DONUT,
    CSAT_TREND: CSAT_TREND, PEAK_HOURS: PEAK_HOURS, HEATMAP: HEATMAP,
    TEAM: TEAM, WEBHOOKS: WEBHOOKS,
  };
  for (var k in base) {
    var liveVal = live[k];
    window[k] = (liveVal != null) ? liveVal : base[k];
  }
  window.__AETHER_WORKSPACE = live.workspace || null;
})();
