// ============================================================
// Mock data — agents, transcripts, KB, billing, analytics
// Patched: live-data shim. Fetches /api/portal/aether-bundle synchronously
// and overrides the baked-in constants below. If the fetch fails, the
// original mock values are used so the UI never breaks.
// ============================================================
(function bootstrapLiveData() {
  try {
    var params = new URLSearchParams(window.location.search);
    var ws = params.get('ws') || params.get('workspaceId') || localStorage.getItem('aether.workspaceId') || 'ws_default';
    if (params.get('ws')) localStorage.setItem('aether.workspaceId', params.get('ws'));
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/portal/aether-bundle?workspaceId=' + encodeURIComponent(ws), false);
    xhr.setRequestHeader('x-workspace-id', ws);
    xhr.send(null);
    if (xhr.status >= 200 && xhr.status < 300) {
      window.__LIVE_DATA = JSON.parse(xhr.responseText);
      window.__AETHER_WORKSPACE_ID = ws;
      console.info('[aether] loaded live data for workspace', ws);
    } else {
      console.warn('[aether] live bundle request returned', xhr.status, '— using mock');
    }
  } catch (e) {
    console.warn('[aether] live bundle fetch failed — using mock:', e.message);
  }
})();

const AGENT_TYPES = {
  sales:    { id: 'sales',    label: 'Sales Agent',          color: 'cyan',    desc: 'Outbound conversion & qualified pipeline', icon: 'target' },
  support:  { id: 'support',  label: 'Call Center Support',  color: 'emerald', desc: 'Inbound resolution & customer care',       icon: 'shield' },
  booking:  { id: 'booking',  label: 'Booking Agent',        color: 'violet',  desc: 'Calendar reservations & confirmations',    icon: 'calendar' },
  coldcall: { id: 'coldcall', label: 'Cold Call Agent',      color: 'amber',   desc: 'First-touch outreach & lead screening',    icon: 'flag' },
};

const AGENTS = [
  {
    id: 'agt_aria',  name: 'Aria',  type: 'sales',
    avatarShape: 'target',
    channels: ['voice', 'whatsapp'],
    status: 'live',
    callsToday: 142, conversion: 31.4, avgDuration: '4:38',
    personality: 'Assertive', language: 'English (US)',
    greeting: "Hi, this is Aria from Aether — got a quick second?",
    rating: 4.8,
    kb: ['kb_pricing', 'kb_objections', 'kb_product'],
  },
  {
    id: 'agt_max',   name: 'Max',   type: 'support',
    avatarShape: 'shield',
    channels: ['voice', 'whatsapp'],
    status: 'live',
    callsToday: 287, conversion: 92.1, avgDuration: '6:12',
    personality: 'Empathetic', language: 'English (UK)',
    greeting: "Hello, you've reached Aether support. How can I help today?",
    rating: 4.9,
    kb: ['kb_faq', 'kb_product', 'kb_returns'],
  },
  {
    id: 'agt_luna',  name: 'Luna',  type: 'booking',
    avatarShape: 'calendar',
    channels: ['whatsapp'],
    status: 'paused',
    callsToday: 64, conversion: 78.5, avgDuration: '2:54',
    personality: 'Friendly', language: 'Sinhala / English',
    greeting: "Hi! I can help you book a slot — what date works for you?",
    rating: 4.7,
    kb: ['kb_faq'],
  },
  {
    id: 'agt_rex',   name: 'Rex',   type: 'coldcall',
    avatarShape: 'flag',
    channels: ['voice'],
    status: 'live',
    callsToday: 412, conversion: 12.6, avgDuration: '1:28',
    personality: 'Professional', language: 'English (US)',
    greeting: "Hi there, this is Rex from Aether. Did I catch you at a bad time?",
    rating: 4.3,
    kb: ['kb_script', 'kb_objections'],
  },
];

const FEED = [
  { id: 1, kind: 'booked',     agent: 'Luna', text: 'Booking confirmed — Demo call, Thu 3:00 PM',     when: 'just now', pill: { label: 'BOOKED', cls: 'emerald' }, icon: 'check' },
  { id: 2, kind: 'callStart',  agent: 'Aria', text: 'Outbound call started → +94 7** ***12',         when: '14s ago',  pill: { label: 'LIVE', cls: 'live' },    icon: 'phone' },
  { id: 3, kind: 'msg',        agent: 'Max',  text: 'WhatsApp reply sent → order #A-23119',          when: '32s ago',  pill: { label: 'SENT', cls: 'cyan' },    icon: 'send' },
  { id: 4, kind: 'callEnd',    agent: 'Rex',  text: 'Call ended — no answer (3 attempts)',           when: '1m ago',   pill: { label: 'NO ANSWER', cls: 'idle' }, icon: 'phone' },
  { id: 5, kind: 'converted',  agent: 'Aria', text: 'Deal won — Pro plan, $249 MRR',                 when: '3m ago',   pill: { label: 'CONVERTED', cls: 'emerald' }, icon: 'trend' },
  { id: 6, kind: 'escalated',  agent: 'Max',  text: 'Escalated to human — complex billing query',    when: '5m ago',   pill: { label: 'ESCALATED', cls: 'amber' }, icon: 'alert' },
  { id: 7, kind: 'msg',        agent: 'Luna', text: 'WhatsApp follow-up sent → reminder',            when: '8m ago',   pill: { label: 'SENT', cls: 'cyan' },    icon: 'send' },
  { id: 8, kind: 'callEnd',    agent: 'Aria', text: 'Call completed — 6:14 duration',                when: '11m ago',  pill: { label: 'COMPLETED', cls: 'idle' }, icon: 'phone' },
  { id: 9, kind: 'booked',     agent: 'Luna', text: 'Booking confirmed — Consult, Fri 11:30 AM',     when: '14m ago',  pill: { label: 'BOOKED', cls: 'emerald' }, icon: 'check' },
  { id:10, kind: 'callStart',  agent: 'Rex',  text: 'Outbound dialing → +94 7** ***41',              when: '18m ago',  pill: { label: 'DIALING', cls: 'cyan' },  icon: 'phone' },
  { id:11, kind: 'msg',        agent: 'Max',  text: 'WhatsApp reply sent → shipping status',         when: '22m ago',  pill: { label: 'SENT', cls: 'cyan' },    icon: 'send' },
  { id:12, kind: 'error',      agent: 'Rex',  text: 'Connection failed — retrying in 30s',           when: '27m ago',  pill: { label: 'RETRY', cls: 'rose' },   icon: 'alert' },
];

// 30 days of volume
const VOLUME_30D = Array.from({ length: 30 }, (_, i) => {
  const t = i / 29;
  const voice    = Math.round(180 + 80 * Math.sin(i / 4) + 40 * Math.cos(i / 7) + 60 * t + (i === 22 ? 80 : 0));
  const whatsapp = Math.round(120 + 50 * Math.cos(i / 5) + 70 * t + (i === 17 ? 60 : 0));
  return { day: i + 1, label: `D${i + 1}`, voice, whatsapp };
});

const KB = [
  { id: 'kb_pricing',    title: 'Pricing & Plans 2026',           type: 'Pricing',          updated: '2d ago',  agents: 2,
    tags: ['pricing', 'plans', 'enterprise'],
    content: `# Pricing — 2026
Starter ………… $49 / mo — up to 1,000 minutes
Pro …………… $249 / mo — up to 8,000 minutes
Scale ………… $899 / mo — up to 40,000 minutes
Enterprise … custom — contact sales

# Common Objections
Q: "It's too expensive."
A: "I hear you — let's look at cost per resolved call. Most teams break even within 3 weeks because each agent handles ~4x the volume of a human rep, 24/7."

Q: "We already use a competitor."
A: "Great — what's working and what isn't? Most switches happen when teams hit ceilings on after-hours coverage or multilingual support."` },
  { id: 'kb_objections', title: 'Sales Objection Handling',        type: 'Objection Handling', updated: '5d ago',  agents: 2,
    tags: ['sales', 'objections'],
    content: `# Common Objections & Responses

OBJECTION: "I need to think about it."
RESPONSE: Acknowledge → narrow the concern → offer a small next step.
"Totally fair. Out of curiosity — is it the pricing, the timing, or something about the product itself? I want to make sure I'm answering the right question."

OBJECTION: "Send me some info."
RESPONSE: Agree, but trade for time.
"Happy to. I'll send a 1-page summary right after this. Could we put 15 minutes on the calendar for Thursday or Friday so we don't lose momentum?"

OBJECTION: "We don't have budget."
RESPONSE: Reframe as cost-of-inaction.
"Understood. Many of our customers found budget by reallocating from after-hours staffing — would it help if I shared the ROI calculator?"` },
  { id: 'kb_product',    title: 'Product Capabilities (Master)',  type: 'Product Info',     updated: '1w ago',  agents: 2,
    tags: ['product', 'features', 'capabilities'],
    content: `# Core Capabilities
- Voice agents (inbound + outbound)
- WhatsApp agents (24/7)
- Multi-language: EN, SI, TA, AR, HI
- Real-time transcript + sentiment scoring
- CRM integrations: HubSpot, Salesforce, Pipedrive
- Knowledge bases scoped per agent
- SOC 2 Type II, GDPR-aligned data residency` },
  { id: 'kb_faq',        title: 'General FAQ',                     type: 'FAQ',              updated: '3d ago',  agents: 3,
    tags: ['faq', 'support'],
    content: `Q: What are your support hours?
A: 24/7 via voice and WhatsApp. Human escalation 7am–11pm local time.

Q: How do refunds work?
A: 30-day money-back on monthly plans, pro-rated on annual.

Q: Can I export my data?
A: Yes — settings → Data & Privacy → Request Export. Bundle delivered within 24h.` },
  { id: 'kb_returns',    title: 'Returns & Refunds Process',       type: 'FAQ',              updated: '4d ago',  agents: 1,
    tags: ['returns', 'support'],
    content: `1. Customer requests return within 30 days.
2. Agent verifies order ID and reason.
3. If eligible → issue prepaid label and create refund ticket.
4. Refund processed within 5–7 business days after item received.

Edge cases:
- Items damaged in transit → automatic refund, no return required.
- Final sale items → not eligible, offer 20% credit on next order.` },
  { id: 'kb_script',     title: 'Cold Call Opening Script',        type: 'Script',           updated: '6d ago',  agents: 1,
    tags: ['cold', 'script', 'outbound'],
    content: `OPENER (use as written, then adapt):
"Hi {first_name}, this is Rex from Aether. I know I'm calling out of the blue — got 30 seconds and I'll tell you why I called, then you can tell me to get lost?"

PATTERN INTERRUPT (if hesitation):
"Most people I call hate getting cold calls. Mind if I be quick about why this one's worth 30 seconds?"

VALUE PROP (one sentence, no jargon):
"We help support teams handle 4x more calls after-hours without hiring — that's it. Worth a 15-minute look?"

CLOSE:
"How about Thursday 2pm or Friday 10am — which is easier?"` },
];

// Transcripts
const TRANSCRIPTS = [
  {
    id: 'tx_001', agent: 'Aria', agentType: 'sales', channel: 'voice',
    caller: '+94 7** ***12', timestamp: '2026-05-23 14:38', duration: '6:14',
    outcome: 'Converted', outcomePill: 'emerald', sentiment: 'pos',
    metrics: { responseTime: '1.2s', sentimentScore: 0.81, resolution: 'Yes', followUp: 'No' },
    chapters: ['Intro', 'Discovery', 'Pitch', 'Objection', 'Close'],
    thread: [
      { who: 'agent', t: '0:02', text: "Hi, this is Aria from Aether — got a quick second? I'm reaching out because your team signed up for our trial last week." },
      { who: 'user',  t: '0:08', text: "Yeah, hi. Quick question first — what's the catch with the free trial?" },
      { who: 'agent', t: '0:12', text: "No catch — full Pro access for 14 days, no card required. After that you choose a plan or it pauses automatically." },
      { who: 'user',  t: '0:24', text: "Okay, that's fair. What's your pricing look like?" },
      { who: 'agent', t: '0:27', text: "Pro is $249 a month covering up to 8,000 minutes. For your call volume — roughly 5k a month — that's about $0.031 per call. Most teams save ~60% versus human coverage." },
      { who: 'user',  t: '0:48', text: "Hmm. We already use a competitor. Why switch?" },
      { who: 'agent', t: '0:51', text: "Totally fair question. What's working for you there, and where do you wish it did more? I want to make sure I'm answering the right thing." },
      { who: 'user',  t: '1:04', text: "Honestly, it doesn't handle Sinhala well. Half our customers prefer it." },
      { who: 'agent', t: '1:09', text: "That's exactly where we shine — native Sinhala, Tamil, and English with live language detection mid-call. Want me to send a 60-second demo clip after this?" },
      { who: 'user',  t: '1:32', text: "Yeah, send it. And let's schedule a proper demo." },
      { who: 'agent', t: '1:35', text: "Done. Thursday 2pm or Friday 10am — which works?" },
      { who: 'user',  t: '1:42', text: "Friday 10." },
      { who: 'agent', t: '1:44', text: "Locked in. You'll get a calendar invite and the demo clip in your inbox within 5 minutes. Anything else before I let you go?" },
    ],
  },
  {
    id: 'tx_002', agent: 'Max', agentType: 'support', channel: 'whatsapp',
    caller: '+94 7** ***54', timestamp: '2026-05-23 14:12', duration: '3:48',
    outcome: 'Completed', outcomePill: 'cyan', sentiment: 'pos',
    metrics: { responseTime: '0.8s', sentimentScore: 0.74, resolution: 'Yes', followUp: 'No' },
    thread: [
      { who: 'user',  t: '0:00', text: "Hi, my order #A-23119 hasn't arrived. It's been 5 days." },
      { who: 'agent', t: '0:01', text: "Hi there — I'm sorry about the delay. Let me check that for you right now." },
      { who: 'agent', t: '0:04', text: "I can see your order shipped May 19 and the carrier marked it 'out for delivery' twice without a successful attempt. That's unusual — let me file a trace." },
      { who: 'user',  t: '0:18', text: "Yeah I never got a knock." },
      { who: 'agent', t: '0:20', text: "I've raised a priority trace with the carrier and you'll get an update within 24 hours. As a goodwill gesture, I'm also queueing a replacement to ship today on overnight — no charge." },
      { who: 'user',  t: '0:36', text: "Oh wow, thank you. That's really helpful." },
      { who: 'agent', t: '0:38', text: "My pleasure. You'll get a tracking link in about 30 minutes. Anything else I can help with?" },
      { who: 'user',  t: '0:42', text: "No that's it, thanks!" },
    ],
  },
  {
    id: 'tx_003', agent: 'Luna', agentType: 'booking', channel: 'whatsapp',
    caller: '+94 7** ***89', timestamp: '2026-05-23 13:55', duration: '2:31',
    outcome: 'Booked', outcomePill: 'emerald', sentiment: 'pos',
    metrics: { responseTime: '0.6s', sentimentScore: 0.78, resolution: 'Yes', followUp: 'Yes' },
    thread: [
      { who: 'user',  t: '0:00', text: "Hi, I'd like to book a consult." },
      { who: 'agent', t: '0:01', text: "Hi! Happy to help. Are you a new or existing customer?" },
      { who: 'user',  t: '0:08', text: "New." },
      { who: 'agent', t: '0:09', text: "Welcome aboard. Our consult slots are 45 minutes — earliest available is Thu May 28 at 11:30 AM or Fri May 29 at 3:00 PM. Either work?" },
      { who: 'user',  t: '0:22', text: "Thursday morning." },
      { who: 'agent', t: '0:23', text: "Perfect — Thu May 28, 11:30 AM. Can I grab your email to send the calendar invite?" },
      { who: 'user',  t: '0:31', text: "[redacted]" },
      { who: 'agent', t: '0:32', text: "Got it. You'll receive the invite in under a minute and a reminder 24h before. Anything else?" },
      { who: 'user',  t: '0:40', text: "Nope, thanks!" },
    ],
  },
  {
    id: 'tx_004', agent: 'Rex', agentType: 'coldcall', channel: 'voice',
    caller: '+94 7** ***27', timestamp: '2026-05-23 13:22', duration: '0:48',
    outcome: 'No Answer', outcomePill: 'idle', sentiment: 'neu',
    metrics: { responseTime: '—', sentimentScore: 0.50, resolution: 'No', followUp: 'Yes' },
    chapters: ['Dial', 'Ringing', 'Voicemail'],
    thread: [
      { who: 'agent', t: '0:00', text: "[Dialing...]" },
      { who: 'agent', t: '0:32', text: "Hi, this is Rex from Aether. I missed you — I'll try again Thursday afternoon. Have a great day." },
    ],
  },
  {
    id: 'tx_005', agent: 'Aria', agentType: 'sales', channel: 'voice',
    caller: '+94 7** ***08', timestamp: '2026-05-23 12:54', duration: '4:02',
    outcome: 'Escalated', outcomePill: 'amber', sentiment: 'neu',
    metrics: { responseTime: '1.4s', sentimentScore: 0.55, resolution: 'No', followUp: 'Yes' },
    chapters: ['Intro', 'Discovery', 'Pitch', 'Escalation'],
    thread: [
      { who: 'agent', t: '0:02', text: "Hi, this is Aria from Aether — got a quick second?" },
      { who: 'user',  t: '0:06', text: "Sure but I'm looking for enterprise pricing — over 50k minutes a month." },
      { who: 'agent', t: '0:11', text: "That's well beyond our standard plans — enterprise is custom-quoted. Let me connect you with our enterprise team right now, is that okay?" },
      { who: 'user',  t: '0:24', text: "Yes please." },
      { who: 'agent', t: '0:26', text: "Transferring you to Dilshan from our enterprise team. He'll have your context. One moment." },
    ],
  },
  {
    id: 'tx_006', agent: 'Max', agentType: 'support', channel: 'voice',
    caller: '+94 7** ***33', timestamp: '2026-05-23 12:40', duration: '8:11',
    outcome: 'Completed', outcomePill: 'cyan', sentiment: 'pos',
    metrics: { responseTime: '1.1s', sentimentScore: 0.69, resolution: 'Yes', followUp: 'No' },
    chapters: ['Intro', 'Discovery', 'Resolution', 'Close'],
    thread: [
      { who: 'user',  t: '0:00', text: "Hi, I can't log into my account." },
      { who: 'agent', t: '0:02', text: "Hello — sorry about that. Can I grab your email or account ID?" },
      { who: 'user',  t: '0:08', text: "It's [redacted]" },
      { who: 'agent', t: '0:11', text: "Thanks. I can see two failed login attempts at 11:42. Have you reset your password recently or changed devices?" },
      { who: 'user',  t: '0:24', text: "New laptop yesterday." },
      { who: 'agent', t: '0:26', text: "That's the cause — we lock new-device logins until you verify by email. I'll send the verification right now. Check your inbox in about 10 seconds." },
    ],
  },
  {
    id: 'tx_007', agent: 'Rex', agentType: 'coldcall', channel: 'voice',
    caller: '+94 7** ***41', timestamp: '2026-05-23 11:58', duration: '2:17',
    outcome: 'Interest', outcomePill: 'cyan', sentiment: 'pos',
    metrics: { responseTime: '1.0s', sentimentScore: 0.66, resolution: 'Pending', followUp: 'Yes' },
    chapters: ['Intro', 'Pattern Interrupt', 'Value Prop', 'Callback'],
    thread: [
      { who: 'agent', t: '0:02', text: "Hi, this is Rex from Aether. I know I'm calling out of the blue — got 30 seconds and I'll tell you why I called?" },
      { who: 'user',  t: '0:11', text: "Uh, sure, you've got 30." },
      { who: 'agent', t: '0:13', text: "Appreciate it. We help support teams handle 4x more calls after-hours without hiring — that's the whole pitch. Worth a 15-minute look?" },
      { who: 'user',  t: '0:32', text: "Maybe. Send me info first." },
      { who: 'agent', t: '0:34', text: "Will do. I'll send a 1-pager today and ping you Friday. Best email?" },
    ],
  },
  {
    id: 'tx_008', agent: 'Luna', agentType: 'booking', channel: 'whatsapp',
    caller: '+94 7** ***72', timestamp: '2026-05-23 11:30', duration: '1:42',
    outcome: 'Booked', outcomePill: 'emerald', sentiment: 'pos',
    metrics: { responseTime: '0.7s', sentimentScore: 0.82, resolution: 'Yes', followUp: 'No' },
    thread: [
      { who: 'user',  t: '0:00', text: "Need to reschedule my Friday appointment" },
      { who: 'agent', t: '0:01', text: "Sure — I can see your Fri May 29 at 3pm. What works better?" },
      { who: 'user',  t: '0:08', text: "Monday morning if possible" },
      { who: 'agent', t: '0:09', text: "Mon Jun 2 at 9:00, 10:30, or 11:30 are open. Pick one?" },
      { who: 'user',  t: '0:18', text: "10:30" },
      { who: 'agent', t: '0:19', text: "Done — moved to Mon Jun 2, 10:30 AM. Updated invite sent. Anything else?" },
    ],
  },
  {
    id: 'tx_009', agent: 'Aria', agentType: 'sales', channel: 'whatsapp',
    caller: '+94 7** ***16', timestamp: '2026-05-23 10:48', duration: '5:22',
    outcome: 'Converted', outcomePill: 'emerald', sentiment: 'pos',
    metrics: { responseTime: '0.9s', sentimentScore: 0.79, resolution: 'Yes', followUp: 'No' },
    thread: [
      { who: 'user',  t: '0:00', text: "Following up on your demo — interested in Pro" },
      { who: 'agent', t: '0:01', text: "Great to hear! Want me to set you up now? Pro is $249/mo, 8k minutes included." },
      { who: 'user',  t: '0:14', text: "Yes — but we need API access. Included?" },
      { who: 'agent', t: '0:16', text: "Yes — full REST API and webhooks on every plan, no extra cost. I'll send a payment link now." },
    ],
  },
  {
    id: 'tx_010', agent: 'Rex', agentType: 'coldcall', channel: 'voice',
    caller: '+94 7** ***44', timestamp: '2026-05-23 10:22', duration: '0:18',
    outcome: 'DNC', outcomePill: 'rose', sentiment: 'neg',
    metrics: { responseTime: '—', sentimentScore: 0.20, resolution: 'No', followUp: 'No' },
    chapters: ['Intro', 'DNC Logged'],
    thread: [
      { who: 'agent', t: '0:00', text: "Hi, this is Rex from Aether—" },
      { who: 'user',  t: '0:04', text: "Don't call me again." },
      { who: 'agent', t: '0:05', text: "Understood — adding you to our do-not-call list now. Apologies for the disruption. Goodbye." },
    ],
  },
  {
    id: 'tx_011', agent: 'Max', agentType: 'support', channel: 'whatsapp',
    caller: '+94 7** ***99', timestamp: '2026-05-23 09:51', duration: '2:08',
    outcome: 'Completed', outcomePill: 'cyan', sentiment: 'neu',
    metrics: { responseTime: '1.0s', sentimentScore: 0.58, resolution: 'Yes', followUp: 'No' },
    thread: [
      { who: 'user', t: '0:00', text: "How do I cancel?" },
      { who: 'agent', t: '0:01', text: "Sorry to hear that. Cancellation is one-click in Settings → Billing. Want me to walk you through, or is there anything I can help fix first?" },
      { who: 'user', t: '0:12', text: "Just need to pause for a month, actually" },
      { who: 'agent', t: '0:13', text: "Even easier — I can pause your subscription right now. 30-day pause, resumes automatically. Confirm?" },
      { who: 'user', t: '0:22', text: "Yes please" },
      { who: 'agent', t: '0:23', text: "Paused. You'll resume on Jun 23. Have a good one." },
    ],
  },
  {
    id: 'tx_012', agent: 'Aria', agentType: 'sales', channel: 'voice',
    caller: '+94 7** ***05', timestamp: '2026-05-22 17:14', duration: '3:31',
    outcome: 'Follow-up', outcomePill: 'amber', sentiment: 'neu',
    metrics: { responseTime: '1.3s', sentimentScore: 0.52, resolution: 'Pending', followUp: 'Yes' },
    chapters: ['Intro', 'Discovery', 'Soft Close'],
    thread: [
      { who: 'agent', t: '0:02', text: "Hi, Aria from Aether. Following up on your trial — got 3 minutes?" },
      { who: 'user',  t: '0:08', text: "Honestly haven't tried it yet. Slammed this week." },
      { who: 'agent', t: '0:11', text: "Totally get it. Want me to send you a 90-second demo video and ping you next Tuesday?" },
      { who: 'user',  t: '0:24', text: "Sure, that works." },
    ],
  },
  {
    id: 'tx_013', agent: 'Luna', agentType: 'booking', channel: 'whatsapp',
    caller: '+94 7** ***18', timestamp: '2026-05-22 16:48', duration: '0:42',
    outcome: 'Failed', outcomePill: 'rose', sentiment: 'neg',
    metrics: { responseTime: '0.8s', sentimentScore: 0.32, resolution: 'No', followUp: 'Yes' },
    thread: [
      { who: 'user', t: '0:00', text: "Need to book this evening" },
      { who: 'agent', t: '0:01', text: "Earliest open slot is tomorrow 9am — would that work?" },
      { who: 'user', t: '0:09', text: "No, never mind." },
    ],
  },
  {
    id: 'tx_014', agent: 'Max', agentType: 'support', channel: 'voice',
    caller: '+94 7** ***62', timestamp: '2026-05-22 15:33', duration: '5:48',
    outcome: 'Completed', outcomePill: 'cyan', sentiment: 'pos',
    metrics: { responseTime: '1.0s', sentimentScore: 0.71, resolution: 'Yes', followUp: 'No' },
    chapters: ['Intro', 'Discovery', 'Resolution', 'Close'],
    thread: [
      { who: 'user', t: '0:00', text: "My webhook isn't firing on call completion." },
      { who: 'agent', t: '0:02', text: "Let me check your webhook config. Can you confirm the endpoint URL?" },
      { who: 'user', t: '0:10', text: "[redacted]" },
      { who: 'agent', t: '0:12', text: "Got it. I see 3 retries today all returning 401. Looks like your secret rotation last Tuesday didn't update on our side — want me to push the new secret now?" },
      { who: 'user', t: '0:32', text: "Yes please" },
      { who: 'agent', t: '0:34', text: "Done. I just triggered a test event — you should see it land in about 5 seconds." },
    ],
  },
  {
    id: 'tx_015', agent: 'Rex', agentType: 'coldcall', channel: 'voice',
    caller: '+94 7** ***81', timestamp: '2026-05-22 14:02', duration: '0:31',
    outcome: 'No Answer', outcomePill: 'idle', sentiment: 'neu',
    metrics: { responseTime: '—', sentimentScore: 0.50, resolution: 'No', followUp: 'Yes' },
    chapters: ['Dial', 'Voicemail'],
    thread: [
      { who: 'agent', t: '0:00', text: "[Voicemail reached]" },
      { who: 'agent', t: '0:14', text: "Hi, Rex from Aether. I'll try again Thursday — have a great day." },
    ],
  },
];

// 6 months billing
const BILLING_MONTHS = [
  { m: 'Dec',  voice: 1840, ai: 2120, call: 380 },
  { m: 'Jan',  voice: 2010, ai: 2380, call: 410 },
  { m: 'Feb',  voice: 1920, ai: 2260, call: 396 },
  { m: 'Mar',  voice: 2280, ai: 2710, call: 460 },
  { m: 'Apr',  voice: 2540, ai: 3120, call: 512 },
  { m: 'May',  voice: 2890, ai: 3480, call: 588 },
];

const INVOICES = [
  { id: 'INV-2026-005', date: 'May 1, 2026',  amount: 6034.21, status: 'Paid',    cls: 'emerald' },
  { id: 'INV-2026-004', date: 'Apr 1, 2026',  amount: 6172.10, status: 'Paid',    cls: 'emerald' },
  { id: 'INV-2026-003', date: 'Mar 1, 2026',  amount: 5450.88, status: 'Paid',    cls: 'emerald' },
  { id: 'INV-2026-002', date: 'Feb 1, 2026',  amount: 4576.04, status: 'Paid',    cls: 'emerald' },
  { id: 'INV-2026-001', date: 'Jan 1, 2026',  amount: 4800.55, status: 'Paid',    cls: 'emerald' },
  { id: 'INV-2025-012', date: 'Dec 1, 2025',  amount: 4340.62, status: 'Paid',    cls: 'emerald' },
];

const USAGE_ROWS = [
  { agent: 'Aria', type: 'Sales',       count: 3142, dur: '244h 12m', unit: '$0.412', total: 1294.50 },
  { agent: 'Max',  type: 'Support',     count: 5210, dur: '538h 04m', unit: '$0.378', total: 1969.38 },
  { agent: 'Luna', type: 'Booking',     count: 1480, dur: '70h 48m',  unit: '$0.198', total:  293.04 },
  { agent: 'Rex',  type: 'Cold Call',   count: 8842, dur: '212h 32m', unit: '$0.187', total: 1653.45 },
  { agent: 'Sera', type: 'Sales (beta)',count:  412, dur: '28h 14m',  unit: '$0.401', total:  165.21 },
  { agent: 'Bo',   type: 'Booking',     count:  680, dur: '34h 50m',  unit: '$0.211', total:  143.48 },
];

// Analytics
const OBJECTION_BAR = [
  { label: 'Too expensive',           value: 38 },
  { label: 'Need to think about it',  value: 27 },
  { label: 'Already have a vendor',   value: 18 },
  { label: 'Not the right time',      value: 11 },
  { label: 'Send info first',         value:  6 },
];
const ISSUE_DONUT = [
  { name: 'Order Status',  value: 38, fill: '#00d4ff' },
  { name: 'Returns',       value: 22, fill: '#7b61ff' },
  { name: 'Billing',       value: 18, fill: '#00e5a0' },
  { name: 'Tech Support',  value: 14, fill: '#ffb347' },
  { name: 'Other',         value:  8, fill: '#ff4d6d' },
];
const CHANNEL_DONUT = [
  { name: 'Voice',    value: 64, fill: '#00d4ff' },
  { name: 'WhatsApp', value: 36, fill: '#7b61ff' },
];
const CSAT_TREND = Array.from({ length: 12 }, (_, i) => ({
  week: `W${i + 1}`,
  csat: Math.round((4.2 + Math.sin(i / 2.4) * 0.25 + i * 0.04) * 100) / 100,
}));
const PEAK_HOURS = Array.from({ length: 24 }, (_, h) => ({
  hour: String(h).padStart(2, '0'),
  calls: Math.round(80 + 220 * Math.exp(-Math.pow((h - 14) / 4, 2)) + 60 * Math.exp(-Math.pow((h - 10) / 3, 2))),
}));

// Heatmap data — 7 days × 24 hours
const HEATMAP = Array.from({ length: 7 }, (_, d) =>
  Array.from({ length: 24 }, (_, h) => {
    const weekday = d > 0 && d < 6;
    const peak = Math.exp(-Math.pow((h - 14) / 4.5, 2));
    const morn = Math.exp(-Math.pow((h - 10) / 3, 2));
    return Math.round((weekday ? 1 : 0.4) * (peak + morn * 0.7) * 100);
  })
);

const TEAM = [
  { name: 'Dilshan Perera',   email: 'dilshan@aether.ai',  role: 'Owner',  initials: 'DP', color: 'cyan' },
  { name: 'Amaya Fernando',   email: 'amaya@aether.ai',    role: 'Admin',  initials: 'AF', color: 'violet' },
  { name: 'Kavindu Silva',    email: 'kavindu@aether.ai',  role: 'Admin',  initials: 'KS', color: 'emerald' },
  { name: 'Nethmi Jayaweera', email: 'nethmi@aether.ai',   role: 'Viewer', initials: 'NJ', color: 'amber' },
];

const WEBHOOKS = [
  { id: 'wh_001', url: 'https://api.acmecorp.com/aether-events',  events: ['call.completed', 'agent.error'], status: 'Active' },
  { id: 'wh_002', url: 'https://hooks.zapier.com/hooks/xv29kdq2', events: ['call.completed'], status: 'Active' },
];

Object.assign(window, {
  AGENT_TYPES, AGENTS, FEED, VOLUME_30D, KB, TRANSCRIPTS,
  BILLING_MONTHS, INVOICES, USAGE_ROWS,
  OBJECTION_BAR, ISSUE_DONUT, CHANNEL_DONUT, CSAT_TREND, PEAK_HOURS, HEATMAP,
  TEAM, WEBHOOKS,
});
