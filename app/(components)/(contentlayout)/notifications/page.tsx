'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { getAuthHeaders } from '@/shared/services/apiConfig';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://hbc-api.semis.app/api';

type Customer = { id: string; fullName: string; email?: string; phoneNumber?: string };

export default function PushNotificationsPage() {
  useProtectedRoute();

  // Mode: 'single' (to one customer) or 'broadcast' (audience-based)
  const [mode, setMode] = useState<'single' | 'broadcast'>('broadcast');

  // Common
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  // Single mode
  const [customerSearch, setCustomerSearch] = useState('');
  const [matches, setMatches] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchTimer = useRef<any>(null);

  // Broadcast mode
  const [audience, setAudience] = useState<'approved' | 'all'>('approved');

  // Recent sends — kept in component memory only (no backend history yet)
  const [history, setHistory] = useState<Array<{ at: Date; mode: string; title: string; recipients: number | string }>>([]);

  // Customer typeahead
  useEffect(() => {
    if (mode !== 'single' || selected || customerSearch.length < 2) { setMatches([]); return; }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      try {
        const r = await fetch(`${API}/customers?search=${encodeURIComponent(customerSearch)}&pageSize=10`, { headers: getAuthHeaders() });
        const d = await r.json();
        const items = d?.data?.items || [];
        setMatches(items.map((c: any) => ({
          id: c.id,
          fullName: c.fullName || `${c.firstName || ''} ${c.lastName || ''}`.trim(),
          email: c.email,
          phoneNumber: c.phoneNumber,
        })));
        setSearchOpen(true);
      } catch {/* swallow */}
    }, 250);
  }, [customerSearch, selected, mode]);

  const canSend =
    title.trim() && body.trim() && !sending &&
    (mode === 'broadcast' || (mode === 'single' && selected));

  const send = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      const isBroadcast = mode === 'broadcast';
      const url = isBroadcast ? `${API}/push/admin/broadcast` : `${API}/push/admin/send`;
      const payload = isBroadcast
        ? { audience, title: title.trim(), body: body.trim() }
        : { customerId: selected!.id, title: title.trim(), body: body.trim() };

      const r = await fetch(url, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok || d?.success === false) {
        toast.error(d?.message || 'Send failed');
      } else {
        const recipients = d?.recipients ?? d?.devices ?? '?';
        toast.success(d?.message || `Sent (${recipients} recipient${recipients === 1 ? '' : 's'})`);
        setHistory(h => [
          { at: new Date(), mode: isBroadcast ? `broadcast (${audience})` : `single (${selected?.fullName})`, title: title.trim(), recipients },
          ...h,
        ].slice(0, 20));
        setTitle(''); setBody('');
        if (mode === 'single') { setSelected(null); setCustomerSearch(''); }
      }
    } catch {
      toast.error('Send failed');
    } finally { setSending(false); }
  };

  return (
    <Fragment>
      <div className="md:flex items-center justify-between my-[1.5rem] gap-3">
        <div>
          <p className="font-semibold text-[1.125rem] !mb-0">Push Notifications</p>
          <p className="text-[0.813rem] text-[#8c9097]">Send APNs push to a customer or broadcast to an audience</p>
        </div>
        <div className="flex gap-2 mt-2 md:mt-0">
          <a href="/notifications/devices" className="ti-btn ti-btn-light !opacity-100">
            <i className="ri-smartphone-line me-1"></i>Devices
          </a>
          <a href="/notifications/history" className="ti-btn ti-btn-light !opacity-100">
            <i className="ri-history-line me-1"></i>History
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Composer */}
        <div className="lg:col-span-2 box">
          <div className="box-body space-y-4">
            {/* Mode toggle */}
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => setMode('broadcast')}
                className={`flex-1 py-2 rounded text-sm font-semibold transition-colors ${
                  mode === 'broadcast' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <i className="ri-megaphone-line me-1"></i>Broadcast
              </button>
              <button
                onClick={() => setMode('single')}
                className={`flex-1 py-2 rounded text-sm font-semibold transition-colors ${
                  mode === 'single' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <i className="ri-user-voice-line me-1"></i>Single customer
              </button>
            </div>

            {/* Audience / Customer picker */}
            {mode === 'broadcast' ? (
              <div>
                <label className="form-label">Audience</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 p-3 border rounded cursor-pointer hover:bg-gray-50">
                    <input type="radio" name="audience" value="approved" checked={audience === 'approved'} onChange={() => setAudience('approved')} />
                    <div>
                      <p className="font-semibold text-sm">Approved customers</p>
                      <p className="text-xs text-gray-500">Only customers with IsApproved=true and active accounts. Recommended for most messaging.</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-2 p-3 border rounded cursor-pointer hover:bg-gray-50">
                    <input type="radio" name="audience" value="all" checked={audience === 'all'} onChange={() => setAudience('all')} />
                    <div>
                      <p className="font-semibold text-sm">All customers (with active device)</p>
                      <p className="text-xs text-gray-500">Includes unapproved + pending. Use with care.</p>
                    </div>
                  </label>
                </div>
              </div>
            ) : (
              <div className="relative">
                <label className="form-label">Customer *</label>
                {selected ? (
                  <div className="flex items-center justify-between p-3 border rounded bg-primary/5">
                    <div>
                      <p className="font-semibold text-sm">{selected.fullName}</p>
                      <p className="text-xs text-gray-500">{selected.email || selected.phoneNumber}</p>
                    </div>
                    <button onClick={() => { setSelected(null); setCustomerSearch(''); }} className="text-xs text-primary hover:underline">Change</button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={e => setCustomerSearch(e.target.value)}
                      onFocus={() => setSearchOpen(true)}
                      placeholder="Type name, email or phone…"
                      className="form-control"
                    />
                    {searchOpen && matches.length > 0 && (
                      <div className="absolute z-10 mt-1 left-0 right-0 bg-white border rounded shadow-lg max-h-60 overflow-auto">
                        {matches.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => { setSelected(c); setSearchOpen(false); }}
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-b-0"
                          >
                            <p className="text-sm font-semibold">{c.fullName || '(no name)'}</p>
                            <p className="text-xs text-gray-500">{c.email || c.phoneNumber || ''}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Title */}
            <div>
              <label className="form-label">
                Title * <span className="text-xs text-gray-400">(shown bold in the notification)</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. New silver rate available"
                maxLength={80}
                className="form-control"
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{title.length}/80</p>
            </div>

            {/* Body */}
            <div>
              <label className="form-label">
                Body * <span className="text-xs text-gray-400">(notification text — keep it short)</span>
              </label>
              <textarea
                rows={3}
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="e.g. Silver is now trading at NPR 220/g — lock in a target now."
                maxLength={200}
                className="form-control"
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{body.length}/200</p>
            </div>

            {/* Preview */}
            <div className="border rounded-xl p-3 bg-gray-50">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Notification preview</p>
              <div className="bg-white rounded-lg p-3 shadow-sm border-l-4 border-primary">
                <p className="font-semibold text-sm">{title || 'Title appears here'}</p>
                <p className="text-sm text-gray-700">{body || 'Body text appears here…'}</p>
                <p className="text-[10px] text-gray-400 mt-1">HBC Silver · now</p>
              </div>
            </div>

            <button
              onClick={send}
              disabled={!canSend}
              className="ti-btn ti-btn-primary-full !text-white !opacity-100 w-full disabled:!opacity-50"
            >
              {sending ? <><i className="ri-loader-4-line animate-spin me-1"></i>Sending…</> :
                mode === 'broadcast' ? `📣 Broadcast to ${audience} customers` : `📨 Send to ${selected?.fullName || 'customer'}`}
            </button>

            <p className="text-xs text-gray-500 text-center">
              Pushes are delivered via APNs to iOS devices that have registered a device token after login.
            </p>
          </div>
        </div>

        {/* Recent sends */}
        <div className="box">
          <div className="box-header">
            <h6 className="box-title mb-0">Recent (this session)</h6>
          </div>
          <div className="box-body">
            {history.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">No sends yet.</p>
            ) : (
              <div className="space-y-3">
                {history.map((h, i) => (
                  <div key={i} className="border-b last:border-b-0 pb-2">
                    <p className="font-semibold text-sm">{h.title}</p>
                    <p className="text-xs text-gray-500">{h.mode} · {h.recipients} recipient{h.recipients === 1 ? '' : 's'}</p>
                    <p className="text-[10px] text-gray-400">{h.at.toLocaleTimeString('en-NP')}</p>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[11px] text-gray-400 mt-4">
              <i className="ri-information-line me-1"></i>
              History is in-memory only and clears on page refresh. Use server logs for permanent record.
            </p>
          </div>
        </div>
      </div>

      <div className="box mt-6">
        <div className="box-header"><h6 className="box-title mb-0">Automatic event pushes</h6></div>
        <div className="box-body">
          <p className="text-sm text-gray-600 mb-2">The backend automatically fires these pushes — no admin action needed:</p>
          <ul className="text-sm space-y-1">
            <li>🎉 <strong>Target fully paid</strong> — when last installment clears (100% reached)</li>
            <li>💰 <strong>Wallet topped up</strong> — when a ConnectIPS top-up is verified by NCHL</li>
            <li>✅ <strong>Target payment received</strong> — when a target installment is verified</li>
            <li>🎉 <strong>Account approved</strong> — when admin approves a pending customer</li>
            <li>📦 <strong>Collection tomorrow</strong> — daily reminder at 9 AM NPT for next-day Sunday collections</li>
            <li>🪙 <strong>Buyback recorded</strong> — when staff logs a silver buyback</li>
          </ul>
        </div>
      </div>
    </Fragment>
  );
}
