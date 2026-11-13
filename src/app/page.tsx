'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface List { id: number; name: string; contact_count: number; }
interface Strategy {
  id: number; name: string; from_email: string; step_count: number;
  enrollment_count: number; active_count: number; paused_count: number; completed_count: number;
}
interface Step { id?: number; delay_days: number; subject: string; body_html: string; }
interface StrategyDetail { id: number; name: string; from_email: string; steps: Step[]; enrollments: Enrollment[]; }
interface Enrollment { id: number; email: string; contact_name: string; company: string; current_step: number; status: string; }
interface Message {
  id: number; contact_id: number | null; contact_name: string | null; company: string | null;
  from_email: string; to_email: string; subject: string; body_text: string; body_html: string;
  direction: 'inbound' | 'outbound'; is_read: boolean; created_at: string;
}

// Color palette
const COLORS = ['#9B6DFF', '#E8943A', '#3A7F5A', '#5B4FCF', '#F5C864', '#46bdc6', '#C4A8FF', '#E85A5A'];

function hashStr(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h); return Math.abs(h); }

// ── App ────────────────────────────────────────────────────────────────────────

export default function OutreachApp() {
  const [lists, setLists] = useState<List[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMsg, setSelectedMsg] = useState<Message | null>(null);
  const [mailView, setMailView] = useState<'inbox' | 'sent'>('inbox');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const fetchAll = useCallback(async () => {
    const [l, s, m] = await Promise.all([
      fetch('/api/lists').then(r => r.json()),
      fetch('/api/strategies').then(r => r.json()),
      fetch('/api/inbox').then(r => r.json()),
    ]);
    setLists(l); setStrategies(s); setMessages(m);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const inbound = messages.filter(m => m.direction === 'inbound');
  const outbound = messages.filter(m => m.direction === 'outbound');
  const unread = inbound.filter(m => !m.is_read).length;
  const visibleMail = mailView === 'inbox' ? inbound : outbound;

  return (
    <div className="h-screen flex flex-col antialiased" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-5 border-b flex-shrink-0 z-20" style={{ borderColor: 'var(--rule)' }}>
        <div className="flex items-center gap-4">
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-full transition-colors" style={{ color: 'var(--text-soft)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--purple-soft)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
            </svg>
          </button>
          <span className="text-[18px] select-none font-display font-bold tracking-tight" style={{ color: 'var(--text)', letterSpacing: '-.03em' }}>Outreach</span>
        </div>

        <div className="flex items-center gap-6 text-[13px]" style={{ color: 'var(--text-soft)' }}>
          <span>{lists.reduce((s, l) => s + l.contact_count, 0)} contacts</span>
          <span>{outbound.length} sent</span>
          {unread > 0 && (
            <span className="text-white text-[11px] font-medium rounded-full px-2.5 py-0.5" style={{ background: '#E85A5A' }}>
              {unread} new
            </span>
          )}
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <aside className={`flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out ${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}`}
          style={{ background: 'rgba(34, 29, 48, 0.5)' }}>
          <div className="h-12 flex items-center justify-between px-4 flex-shrink-0">
            <span className="text-[13px] font-medium select-none" style={{ color: 'var(--text-soft)' }}>Strategies</span>
            <div className="flex items-center gap-0.5">
              <ListPopover lists={lists} strategies={strategies} onRefresh={fetchAll} />
              <NewStrategyPopover onDone={fetchAll} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-2">
            {strategies.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full px-6">
                <p className="text-[13px]" style={{ color: 'var(--text-dim)' }}>No strategies yet</p>
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-dim)', opacity: 0.6 }}>Click + to get started</p>
              </div>
            )}
            {strategies.map((s, i) => (
              <StrategyRow key={s.id} strategy={s} lists={lists} color={COLORS[i % COLORS.length]} onRefresh={fetchAll} />
            ))}
          </div>
        </aside>

        {/* ── Inbox / Sent ───────────────────────────────────────────────── */}
        <div className="w-80 flex flex-col flex-shrink-0" style={{ background: 'var(--bg)', borderLeft: '1px solid var(--rule)', borderRight: '1px solid var(--rule)' }}>
          <div className="h-12 flex items-center px-4 gap-2 flex-shrink-0">
            <button onClick={() => setMailView('inbox')}
              className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all`}
              style={mailView === 'inbox' ? { background: 'var(--purple)', color: '#fff' } : { color: 'var(--text-soft)' }}
              onMouseEnter={e => { if (mailView !== 'inbox') e.currentTarget.style.background = 'var(--purple-soft)'; }}
              onMouseLeave={e => { if (mailView !== 'inbox') e.currentTarget.style.background = 'transparent'; }}>
              Inbox
              {unread > 0 && <span className={`ml-1.5 text-[10px] font-bold ${mailView === 'inbox' ? 'opacity-70' : ''}`} style={mailView !== 'inbox' ? { color: '#E85A5A' } : {}}>{unread}</span>}
            </button>
            <button onClick={() => setMailView('sent')}
              className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all`}
              style={mailView === 'sent' ? { background: 'var(--purple)', color: '#fff' } : { color: 'var(--text-soft)' }}
              onMouseEnter={e => { if (mailView !== 'sent') e.currentTarget.style.background = 'var(--purple-soft)'; }}
              onMouseLeave={e => { if (mailView !== 'sent') e.currentTarget.style.background = 'transparent'; }}>
              Sent
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {visibleMail.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full px-6">
                <svg className="w-16 h-16 mb-3" style={{ color: 'var(--text-dim)', opacity: 0.3 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                <p className="text-[13px]" style={{ color: 'var(--text-dim)' }}>{mailView === 'inbox' ? 'No replies yet' : 'Nothing sent yet'}</p>
              </div>
            )}
            {visibleMail.map(msg => {
              const isIn = msg.direction === 'inbound';
              const who = isIn ? (msg.contact_name || msg.from_email) : msg.to_email;
              const c = COLORS[hashStr(who) % COLORS.length];
              return (
                <button key={msg.id} onClick={async () => {
                  setSelectedMsg(msg);
                  if (!msg.is_read && isIn) {
                    await fetch('/api/inbox', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: msg.id }) });
                    fetchAll();
                  }
                }} className="w-full text-left px-4 py-3 transition-colors"
                  style={{
                    borderBottom: '1px solid var(--rule)',
                    background: selectedMsg?.id === msg.id ? 'var(--purple-soft)' : 'transparent',
                  }}
                  onMouseEnter={e => { if (selectedMsg?.id !== msg.id) e.currentTarget.style.background = 'rgba(155, 109, 255, 0.05)'; }}
                  onMouseLeave={e => { if (selectedMsg?.id !== msg.id) e.currentTarget.style.background = 'transparent'; }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-medium text-white flex-shrink-0" style={{ background: c }}>
                      {who[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] truncate" style={{ color: isIn && !msg.is_read ? 'var(--text)' : 'var(--text-soft)', fontWeight: isIn && !msg.is_read ? 600 : 400 }}>{who}</span>
                        <span className="text-[11px] flex-shrink-0 ml-2" style={{ color: 'var(--text-dim)' }}>
                          {new Date(msg.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-[12px] truncate" style={{ color: isIn && !msg.is_read ? 'var(--text-soft)' : 'var(--text-dim)' }}>{msg.subject}</p>
                    </div>
                    {isIn && !msg.is_read && <span className="w-[8px] h-[8px] rounded-full flex-shrink-0" style={{ background: 'var(--purple)' }} />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Message detail ──────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0" style={{ background: 'var(--bg)' }}>
          {!selectedMsg ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <svg className="w-20 h-20 mb-4" style={{ color: 'var(--text-dim)', opacity: 0.2 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.4}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              <p className="text-[14px]" style={{ color: 'var(--text-dim)' }}>Select a message to read</p>
            </div>
          ) : (
            <MessageDetail
              message={selectedMsg}
              thread={messages.filter(m => {
                const k = selectedMsg.direction === 'inbound' ? selectedMsg.from_email : selectedMsg.to_email;
                return (m.from_email === k || m.to_email === k) && m.id !== selectedMsg.id;
              })}
              onSent={() => { setSelectedMsg(null); fetchAll(); }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── List Popover ───────────────────────────────────────────────────────────────

function ListPopover({ lists, strategies, onRefresh }: { lists: List[]; strategies: Strategy[]; onRefresh: () => void }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'upload' | 'link'>('upload');
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [linkList, setLinkList] = useState('');
  const [linkStrategy, setLinkStrategy] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !name) return;
    setUploading(true);
    const fd = new FormData(); fd.append('name', name); fd.append('file', file);
    await fetch('/api/lists', { method: 'POST', body: fd });
    setName(''); setFile(null); setUploading(false); onRefresh();
  };

  const enroll = async () => {
    if (!linkList || !linkStrategy) return;
    setEnrolling(true);
    await fetch('/api/contacts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ list_id: parseInt(linkList), strategy_id: parseInt(linkStrategy) }) });
    setEnrolling(false); setLinkList(''); setLinkStrategy(''); onRefresh();
  };

  const deleteList = async (id: number) => {
    if (!confirm('Delete this list?')) return;
    await fetch(`/api/lists?id=${id}`, { method: 'DELETE' }); onRefresh();
  };

  const inputClass = "w-full rounded-lg px-3 py-2.5 text-[13px] outline-none transition-colors";
  const inputStyle = { background: 'var(--bg)', border: '1px solid var(--rule)', color: 'var(--text)' };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} title="Lists"
        className="p-1.5 rounded-full transition-colors" style={{ color: 'var(--text-soft)' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--purple-soft)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-9 w-80 rounded-2xl z-30 overflow-hidden"
          style={{ background: 'var(--card)', border: '1px solid var(--rule)', boxShadow: '0 0 60px var(--purple-glow), 0 24px 48px rgba(0,0,0,.5)' }}>
          <div className="flex" style={{ borderBottom: '1px solid var(--rule)' }}>
            <button onClick={() => setTab('upload')}
              className="flex-1 py-3 text-[13px] font-medium transition-colors"
              style={{ color: tab === 'upload' ? 'var(--text)' : 'var(--text-dim)', borderBottom: tab === 'upload' ? '2px solid var(--purple)' : '2px solid transparent' }}>
              Upload
            </button>
            <button onClick={() => setTab('link')}
              className="flex-1 py-3 text-[13px] font-medium transition-colors"
              style={{ color: tab === 'link' ? 'var(--text)' : 'var(--text-dim)', borderBottom: tab === 'link' ? '2px solid var(--purple)' : '2px solid transparent' }}>
              Link
            </button>
          </div>
          <div className="p-4">
            {tab === 'upload' && (
              <form onSubmit={upload}>
                <input type="text" placeholder="List name" value={name} onChange={e => setName(e.target.value)}
                  className={`${inputClass} mb-2`} style={{ ...inputStyle }} required autoFocus
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--purple)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--rule)')} />
                <label className="block w-full rounded-lg px-3 py-3 text-[12px] mb-3 cursor-pointer transition-colors text-center"
                  style={{ border: '1px dashed var(--rule)', color: 'var(--text-dim)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--purple)'; e.currentTarget.style.color = 'var(--text-soft)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--rule)'; e.currentTarget.style.color = 'var(--text-dim)'; }}>
                  {file ? file.name : 'Choose CSV (email, name, company)'}
                  <input type="file" accept=".csv" onChange={e => setFile(e.target.files?.[0] || null)} className="hidden" required />
                </label>
                <button type="submit" disabled={uploading || !file}
                  className="w-full text-white text-[13px] py-2.5 rounded-full disabled:opacity-40 font-medium transition-all"
                  style={{ background: 'var(--purple)' }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px var(--purple-glow)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </form>
            )}
            {tab === 'link' && (
              <div>
                <select value={linkList} onChange={e => setLinkList(e.target.value)}
                  className={`${inputClass} mb-2`} style={{ ...inputStyle }}>
                  <option value="">Select list...</option>
                  {lists.map(l => <option key={l.id} value={l.id}>{l.name} ({l.contact_count})</option>)}
                </select>
                <select value={linkStrategy} onChange={e => setLinkStrategy(e.target.value)}
                  className={`${inputClass} mb-3`} style={{ ...inputStyle }}>
                  <option value="">Select strategy...</option>
                  {strategies.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <button onClick={enroll} disabled={!linkList || !linkStrategy || enrolling}
                  className="w-full text-white text-[13px] py-2.5 rounded-full disabled:opacity-40 font-medium transition-all"
                  style={{ background: 'var(--purple)' }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px var(--purple-glow)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
                  {enrolling ? 'Enrolling...' : 'Enroll List'}
                </button>
              </div>
            )}
            {lists.length > 0 && (
              <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--rule)' }}>
                <p className="text-[11px] uppercase tracking-wider font-medium mb-2" style={{ color: 'var(--text-dim)' }}>Your Lists</p>
                {lists.map((l, i) => (
                  <div key={l.id} className="group flex items-center justify-between py-2">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-[13px]" style={{ color: 'var(--text)' }}>{l.name}</span>
                      <span className="text-[11px]" style={{ color: 'var(--text-dim)' }}>{l.contact_count}</span>
                    </div>
                    <button onClick={() => deleteList(l.id)} className="opacity-0 group-hover:opacity-100 transition-all"
                      style={{ color: 'var(--text-dim)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#E85A5A')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── New Strategy Popover ───────────────────────────────────────────────────────

function NewStrategyPopover({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [from, setFrom] = useState('ryan@loveablecreechurs.com');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/strategies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, from_email: from }) });
    setName(''); setFrom(''); setOpen(false); onDone();
  };

  const inputClass = "w-full rounded-lg px-3 py-2.5 text-[13px] outline-none transition-colors";
  const inputStyle = { background: 'var(--bg)', border: '1px solid var(--rule)', color: 'var(--text)' };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} title="New strategy"
        className="p-1.5 rounded-full transition-colors" style={{ color: 'var(--text-soft)' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--purple-soft)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
      </button>
      {open && (
        <form onSubmit={submit} className="absolute left-0 top-9 w-72 rounded-2xl p-4 z-30"
          style={{ background: 'var(--card)', border: '1px solid var(--rule)', boxShadow: '0 0 60px var(--purple-glow), 0 24px 48px rgba(0,0,0,.5)' }}>
          <p className="text-[13px] font-medium mb-3 font-display" style={{ color: 'var(--text)' }}>New Strategy</p>
          <input type="text" placeholder="Strategy name" value={name} onChange={e => setName(e.target.value)}
            className={`${inputClass} mb-2`} style={{ ...inputStyle }} required autoFocus
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--purple)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--rule)')} />
          <input type="email" placeholder="From email" value={from} onChange={e => setFrom(e.target.value)}
            className={`${inputClass} mb-3`} style={{ ...inputStyle }} required
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--purple)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--rule)')} />
          <button type="submit"
            className="w-full text-white text-[13px] py-2.5 rounded-full font-medium transition-all"
            style={{ background: 'var(--purple)' }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px var(--purple-glow)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
            Create
          </button>
        </form>
      )}
    </div>
  );
}

// ── Strategy Row ───────────────────────────────────────────────────────────────

function StrategyRow({ strategy, lists, color, onRefresh }: { strategy: Strategy; lists: List[]; color: string; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<StrategyDetail | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const res = await fetch(`/api/strategies?id=${strategy.id}`);
    const d = await res.json();
    setDetail(d); setSteps(d.steps || []);
  };

  const toggle = () => { if (!expanded) load(); setExpanded(!expanded); };

  const control = async (action: 'play' | 'pause' | 'stop') => {
    await fetch('/api/strategies', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: strategy.id, action }) });
    onRefresh();
  };

  const addStep = () => setSteps([...steps, { delay_days: steps.length === 0 ? 0 : 3, subject: '', body_html: '' }]);
  const updateStep = (i: number, field: keyof Step, v: string | number) => { const u = [...steps]; (u[i] as any)[field] = v; setSteps(u); };
  const removeStep = (i: number) => setSteps(steps.filter((_, idx) => idx !== i));

  const saveSteps = async () => {
    setSaving(true);
    await fetch('/api/strategies', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: strategy.id, steps }) });
    setSaving(false); load(); onRefresh();
  };

  const deleteStrategy = async () => {
    if (!confirm('Delete this strategy?')) return;
    await fetch(`/api/strategies?id=${strategy.id}`, { method: 'DELETE' }); onRefresh();
  };

  const hasActive = strategy.active_count > 0;
  const hasPaused = strategy.paused_count > 0;
  const total = strategy.enrollment_count;

  return (
    <div className="mb-0.5">
      <div className="rounded-2xl transition-all" style={expanded ? { background: 'var(--card)', border: '1px solid var(--rule)' } : {}}>
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl cursor-pointer transition-colors"
          onClick={toggle}
          onMouseEnter={e => { if (!expanded) e.currentTarget.style.background = 'var(--purple-soft)'; }}
          onMouseLeave={e => { if (!expanded) e.currentTarget.style.background = 'transparent'; }}>
          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text)' }}>{strategy.name}</p>
            <p className="text-[11px]" style={{ color: 'var(--text-dim)' }}>{strategy.step_count} steps &middot; {total} enrolled</p>
          </div>

          <div className="flex items-center gap-0.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
            {total > 0 && (
              <>
                <button onClick={() => control('play')} disabled={!hasPaused} title="Resume"
                  className="p-1.5 rounded-full disabled:opacity-20 transition-all"
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(58, 127, 90, 0.15)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <svg className="w-3.5 h-3.5" style={{ color: 'var(--green)' }} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                </button>
                <button onClick={() => control('pause')} disabled={!hasActive} title="Pause"
                  className="p-1.5 rounded-full disabled:opacity-20 transition-all"
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(245, 200, 100, 0.15)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <svg className="w-3.5 h-3.5" style={{ color: 'var(--gold)' }} viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                </button>
                <button onClick={() => control('stop')} disabled={!hasActive && !hasPaused} title="Stop"
                  className="p-1.5 rounded-full disabled:opacity-20 transition-all"
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(232, 90, 90, 0.15)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <svg className="w-3.5 h-3.5" style={{ color: 'var(--red)' }} viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h12v12H6z" /></svg>
                </button>
              </>
            )}
          </div>
        </div>

        {expanded && (
          <div className="px-3 pb-3">
            <p className="text-[11px] mb-3 pl-[22px]" style={{ color: 'var(--text-dim)' }}>{detail?.from_email}</p>

            {steps.map((step, i) => (
              <div key={i} className="relative pl-[22px] pb-2 last:pb-0">
                {i < steps.length - 1 && <div className="absolute left-[5px] top-4 bottom-0 w-[2px] rounded-full" style={{ background: color, opacity: 0.2 }} />}
                <div className="absolute left-0 top-1 w-3 h-3 rounded-full border-2" style={{ borderColor: color, background: 'var(--card)' }} />
                <div className="rounded-xl p-3" style={{ background: 'var(--bg)' }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 text-[12px]">
                      <span className="font-medium" style={{ color }}>Day {step.delay_days}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <input type="number" min="0" value={step.delay_days} onChange={e => updateStep(i, 'delay_days', parseInt(e.target.value) || 0)}
                        className="w-10 rounded-md px-1.5 py-0.5 text-[11px] text-center outline-none"
                        style={{ background: 'var(--card)', border: '1px solid var(--rule)', color: 'var(--text)' }}
                        onFocus={e => (e.currentTarget.style.borderColor = 'var(--purple)')}
                        onBlur={e => (e.currentTarget.style.borderColor = 'var(--rule)')} />
                      <button onClick={() => removeStep(i)} className="transition-colors p-0.5"
                        style={{ color: 'var(--text-dim)' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#E85A5A')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  </div>
                  <input type="text" value={step.subject} onChange={e => updateStep(i, 'subject', e.target.value)}
                    className="w-full rounded-lg px-2.5 py-1.5 text-[12px] mb-1.5 outline-none transition-colors"
                    style={{ background: 'var(--card)', border: '1px solid var(--rule)', color: 'var(--text)' }}
                    placeholder="Subject"
                    onFocus={e => (e.currentTarget.style.borderColor = 'var(--purple)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'var(--rule)')} />
                  <textarea value={step.body_html} onChange={e => updateStep(i, 'body_html', e.target.value)}
                    className="w-full rounded-lg px-2.5 py-1.5 text-[12px] h-14 font-mono outline-none resize-none transition-colors"
                    style={{ background: 'var(--card)', border: '1px solid var(--rule)', color: 'var(--text)' }}
                    placeholder="Body -- {{name}} {{company}} {{email}}"
                    onFocus={e => (e.currentTarget.style.borderColor = 'var(--purple)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'var(--rule)')} />
                </div>
              </div>
            ))}

            <div className="flex items-center gap-2 mt-2 pl-[22px]">
              <button onClick={addStep} className="text-[12px] font-medium hover:opacity-80" style={{ color }}>+ Add step</button>
              {steps.length > 0 && (
                <button onClick={saveSteps} disabled={saving}
                  className="ml-auto text-white text-[12px] px-4 py-1.5 rounded-full disabled:opacity-40 font-medium transition-all"
                  style={{ background: color }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
              )}
            </div>
            <button onClick={deleteStrategy} className="text-[11px] mt-3 block pl-[22px] transition-colors"
              style={{ color: 'var(--text-dim)' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#E85A5A')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}>
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Message Detail ─────────────────────────────────────────────────────────────

function MessageDetail({ message, thread, onSent }: { message: Message; thread: Message[]; onSent: () => void }) {
  const [replyBody, setReplyBody] = useState('');
  const [sending, setSending] = useState(false);
  const who = message.contact_name || message.from_email;
  const c = COLORS[hashStr(who) % COLORS.length];

  const sendReply = async () => {
    if (!replyBody) return;
    setSending(true);
    await fetch('/api/inbox', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: message.from_email, subject: `Re: ${message.subject}`, body_html: replyBody, from_email: message.to_email || 'ryan@loveablecreechurs.com' }) });
    setSending(false); setReplyBody(''); onSent();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-6 flex-shrink-0" style={{ borderBottom: '1px solid var(--rule)' }}>
        <h2 className="text-[20px] font-display" style={{ fontWeight: 400, color: 'var(--text)' }}>{message.subject}</h2>
        <div className="flex items-center gap-3 mt-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-medium text-white flex-shrink-0" style={{ background: c }}>
            {who[0]?.toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="text-[14px]" style={{ color: 'var(--text)' }}>
              <span className="font-medium">{who}</span>
              {message.company && <span style={{ color: 'var(--text-dim)' }}> &middot; {message.company}</span>}
            </p>
            <p className="text-[12px]" style={{ color: 'var(--text-dim)' }}>to me &middot; {new Date(message.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {message.body_html ? (
          <div className="prose prose-sm prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: message.body_html }} />
        ) : (
          <p className="text-[14px] whitespace-pre-wrap leading-relaxed" style={{ fontWeight: 400, color: 'var(--text-soft)' }}>{message.body_text}</p>
        )}

        {thread.length > 0 && (
          <div className="mt-8 pt-5" style={{ borderTop: '1px solid var(--rule)' }}>
            {thread.map(m => {
              const tw = m.direction === 'outbound' ? 'me' : (m.contact_name || m.from_email);
              const tc = COLORS[hashStr(tw) % COLORS.length];
              return (
                <div key={m.id} className="mb-4 flex gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium text-white flex-shrink-0 mt-0.5" style={{ background: tc }}>
                    {tw[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[12px] font-medium" style={{ color: 'var(--text)' }}>{tw}</span>
                      <span className="text-[11px]" style={{ color: 'var(--text-dim)' }}>{new Date(m.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    </div>
                    <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-soft)' }}>{m.body_text || m.subject}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {message.direction === 'inbound' && (
        <div className="px-8 py-5 flex-shrink-0" style={{ borderTop: '1px solid var(--rule)' }}>
          <div className="rounded-2xl overflow-hidden transition-all" style={{ border: '1px solid var(--rule)' }}>
            <textarea value={replyBody} onChange={e => setReplyBody(e.target.value)} placeholder="Reply..."
              className="w-full px-4 py-3 text-[14px] h-24 outline-none resize-none"
              style={{ background: 'var(--card)', color: 'var(--text)' }}
              onFocus={e => { const p = e.currentTarget.parentElement; if (p) p.style.borderColor = 'var(--purple)'; }}
              onBlur={e => { const p = e.currentTarget.parentElement; if (p) p.style.borderColor = 'var(--rule)'; }} />
            <div className="flex justify-between items-center px-4 py-2" style={{ background: 'rgba(34, 29, 48, 0.7)' }}>
              <span className="text-[11px]" style={{ color: 'var(--text-dim)' }}>to {message.from_email}</span>
              <button onClick={sendReply} disabled={!replyBody || sending}
                className="text-white text-[13px] px-5 py-1.5 rounded-full disabled:opacity-40 font-medium transition-all"
                style={{ background: 'var(--purple)' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 4px 16px var(--purple-glow)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}>
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
