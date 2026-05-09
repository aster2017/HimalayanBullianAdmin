'use client'
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { getAuthHeaders } from '@/shared/services/apiConfig';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://hbc-api.semis.app/api';

const STATUS_COLORS: Record<string, string> = {
  Active: 'bg-blue-500/10 text-blue-700',
  Completed: 'bg-green-500/10 text-green-700',
  Delivered: 'bg-purple-500/10 text-purple-700',
  Cancelled: 'bg-red-500/10 text-red-700',
};

const TABS = ['All', 'Active', 'Completed', 'Vault', 'Cancelled'] as const;
type Tab = typeof TABS[number];

export default function TargetsPage() {
  useProtectedRoute();

  const [activeTab, setActiveTab] = useState<Tab>('All');
  const [targets, setTargets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  // Deliver modal state
  const [delivering, setDelivering] = useState<any | null>(null);
  const [deliverNotes, setDeliverNotes] = useState('');
  const [deliverSaving, setDeliverSaving] = useState(false);

  // Buyback modal state
  const [buybackTarget, setBuybackTarget] = useState<any | null>(null);
  const [bbGrams, setBbGrams] = useState('');
  const [bbRate, setBbRate] = useState('');
  const [bbMethod, setBbMethod] = useState('Cash');
  const [bbNotes, setBbNotes] = useState('');
  const [bbSaving, setBbSaving] = useState(false);
  const [currentBuybackRate, setCurrentBuybackRate] = useState(0);

  const tabToStatus = (tab: Tab): string =>
    tab === 'All' ? '' : tab === 'Vault' ? 'Delivered' : tab;

  const load = async (p = 1, tab: Tab = activeTab) => {
    setLoading(true);
    const q = new URLSearchParams({ pageNumber: String(p), pageSize: String(pageSize) });
    if (search) q.set('search', search);
    const st = tabToStatus(tab);
    if (st) q.set('status', st);
    const r = await fetch(`${API}/targets?${q}`, { headers: getAuthHeaders() });
    const d = await r.json();
    setTargets(d.data?.items || d.data || []);
    setTotal(d.data?.totalCount || 0);
    setPage(p);
    setLoading(false);
  };

  useEffect(() => {
    load(1, activeTab);
    // Fetch current buyback rate for the modal
    fetch(`${API}/rates/silver`)
      .then(r => r.json())
      .then(d => setCurrentBuybackRate(d.buybackRatePerGram || 0))
      .catch(() => {});
  }, []);

  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    setSearch('');
    load(1, tab);
  };

  const totalPages = Math.ceil(total / pageSize);

  // ── Confirm Delivery ──────────────────────────────────────────────────────
  const openDeliver = (t: any) => { setDelivering(t); setDeliverNotes(''); };
  const confirmDeliver = async () => {
    if (!delivering) return;
    setDeliverSaving(true);
    try {
      const r = await fetch(`${API}/targets/${delivering.id}/confirm-delivery`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId: delivering.id, notes: deliverNotes }),
      });
      const d = await r.json();
      if (r.ok && d.success) {
        toast.success(`${delivering.targetNumber} marked as Delivered → moved to Vault`);
        setDelivering(null);
        load(page);
      } else {
        toast.error(d.message || 'Failed to confirm delivery');
      }
    } catch { toast.error('Failed to confirm delivery'); }
    setDeliverSaving(false);
  };

  // ── Log Buyback ───────────────────────────────────────────────────────────
  const openBuyback = (t: any) => {
    setBuybackTarget(t);
    setBbGrams('');
    setBbRate(String(currentBuybackRate));
    setBbMethod('Cash');
    setBbNotes('');
  };

  const bbPayout = () => {
    const g = parseFloat(bbGrams) || 0;
    const r = parseFloat(bbRate) || 0;
    return (g * r).toFixed(2);
  };

  const submitBuyback = async () => {
    if (!buybackTarget) return;
    if (!bbGrams || parseFloat(bbGrams) <= 0) { toast.error('Enter grams returned'); return; }
    if (!bbRate || parseFloat(bbRate) <= 0) { toast.error('Enter buyback rate'); return; }
    setBbSaving(true);
    try {
      const r = await fetch(`${API}/targets/buybacks`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: buybackTarget.customerId,
          targetId: buybackTarget.id,
          gramsReturned: parseFloat(bbGrams),
          buybackRatePerGram: parseFloat(bbRate),
          paymentMethod: bbMethod,
          notes: bbNotes,
        }),
      });
      const d = await r.json();
      if (r.ok && d.success) {
        toast.success(`Buyback logged — NPR ${parseFloat(bbPayout()).toLocaleString()} payout recorded`);
        setBuybackTarget(null);
      } else {
        toast.error(d.message || 'Failed to log buyback');
      }
    } catch { toast.error('Failed to log buyback'); }
    setBbSaving(false);
  };

  return (
    <div className="page-content">
      <div className="container-fluid">
        {/* Header */}
        <div className="md:flex items-center justify-between my-[1.5rem]">
          <div>
            <p className="font-semibold text-[1.125rem] text-defaulttextcolor !mb-0">Targets (Layaway Plans)</p>
            <p className="font-normal text-[#8c9097] text-[0.813rem]">Manage all customer silver saving plans.</p>
          </div>
          <Link href="/targets/collections">
            <button className="ti-btn ti-btn-warning !text-white mt-2 md:mt-0">
              <i className="ri-calendar-check-line me-2"></i>Collections Due
            </button>
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 border-b">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => switchTab(tab)}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-[#8c9097] hover:text-defaulttextcolor'
              }`}
            >
              {tab === 'Vault' ? '🏦 Your Vault' : tab}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="box shadow-sm mb-4 p-3 flex gap-3">
          <input
            className="form-control flex-1"
            placeholder="Search by name or target #..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load(1)}
          />
          <button className="ti-btn ti-btn-primary-full !text-white" onClick={() => load(1)}>Search</button>
        </div>

        {/* Table */}
        <div className="box shadow-sm">
          <div className="table-responsive">
            <table className="ti-custom-table ti-striped-table">
              <thead>
                <tr>
                  <th>Target #</th>
                  <th>Customer</th>
                  <th>Item</th>
                  <th>Progress</th>
                  <th>Status</th>
                  <th>{activeTab === 'Vault' ? 'Delivered' : 'Collection Date'}</th>
                  {activeTab === 'Vault' && <th className="text-right">Buyback Value</th>}
                  <th>Zoho</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="text-center py-10"><i className="ri-loader-4-line animate-spin text-2xl"></i></td></tr>
                ) : targets.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-10 text-gray-500">
                      {activeTab === 'Vault' ? 'No delivered targets yet' : 'No targets found'}
                    </td>
                  </tr>
                ) : targets.map((t: any) => {
                  const pct = t.totalGrams > 0 ? Math.round((t.gramsPaid / t.totalGrams) * 100) : 0;
                  const buybackVal = t.totalGrams > 0
                    ? (t.gramsPaid * currentBuybackRate).toLocaleString('en-NP', { maximumFractionDigits: 0 })
                    : '—';
                  return (
                    <tr key={t.id}>
                      <td className="font-mono text-sm font-semibold">{t.targetNumber}</td>
                      <td className="text-sm">{t.customerName || '—'}</td>
                      <td className="text-sm">{t.itemName}</td>
                      <td className="min-w-[140px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${t.status === 'Delivered' ? 'bg-purple-500' : 'bg-primary'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold">{pct}%</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{t.gramsPaid}g / {t.totalGrams}g</p>
                      </td>
                      <td>
                        <span className={`badge px-2 py-1 rounded text-xs font-semibold ${STATUS_COLORS[t.status] || 'bg-gray-100 text-gray-600'}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="text-sm">
                        {activeTab === 'Vault'
                          ? t.deliveredAt
                            ? new Date(t.deliveredAt).toLocaleDateString()
                            : '—'
                          : t.collectionDate
                            ? new Date(t.collectionDate).toLocaleDateString()
                            : <span className="text-gray-400">Not scheduled</span>
                        }
                      </td>
                      {activeTab === 'Vault' && (
                        <td className="text-right font-mono text-sm text-purple-700 font-semibold">
                          NPR {buybackVal}
                        </td>
                      )}
                      <td className="text-sm">
                        {t.zohoOrderNumber
                          ? <span className="text-green-600 font-mono text-xs">{t.zohoOrderNumber}</span>
                          : <span className="text-gray-400 text-xs">Pending</span>
                        }
                      </td>
                      <td>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/targets/${t.id}`} className="text-primary hover:underline text-sm font-semibold">
                            View
                          </Link>
                          {t.status === 'Completed' && (
                            <button
                              onClick={() => openDeliver(t)}
                              className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700 hover:bg-purple-200 font-semibold transition-colors"
                            >
                              Mark Delivered
                            </button>
                          )}
                          {t.status === 'Delivered' && (
                            <button
                              onClick={() => openBuyback(t)}
                              className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-700 hover:bg-orange-200 font-semibold transition-colors"
                            >
                              Log Buyback
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="box-footer p-4 flex items-center justify-between">
              <span className="text-sm text-gray-600">Page {page} of {totalPages} ({total} total)</span>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => load(page - 1)} className="btn btn-sm btn-outline-primary disabled:opacity-50">← Prev</button>
                <button disabled={page === totalPages} onClick={() => load(page + 1)} className="btn btn-sm btn-outline-primary disabled:opacity-50">Next →</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Mark Delivered Modal ── */}
      {delivering && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-1">Confirm Delivery</h3>
            <p className="text-sm text-gray-500 mb-4">
              Mark <span className="font-semibold text-defaulttextcolor">{delivering.targetNumber}</span> for{' '}
              <span className="font-semibold">{delivering.customerName}</span> as delivered.
              This moves it to the customer's <strong>Your Vault</strong>.
            </p>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4 text-sm">
              <p className="font-semibold text-purple-800">{delivering.itemName}</p>
              <p className="text-purple-600">{delivering.gramsPaid}g · NPR {(delivering.totalPaid || 0).toLocaleString()}</p>
            </div>
            <div className="mb-4">
              <label className="ti-form-label">Notes (optional)</label>
              <textarea
                className="form-control"
                rows={2}
                placeholder="e.g. Customer collected in person, ID verified"
                value={deliverNotes}
                onChange={e => setDeliverNotes(e.target.value)}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDelivering(null)} className="ti-btn ti-btn-light">Cancel</button>
              <button onClick={confirmDeliver} disabled={deliverSaving} className="ti-btn ti-btn-primary-full !text-white">
                {deliverSaving ? <><i className="ri-loader-4-line animate-spin me-1"></i>Saving…</> : '✓ Confirm Delivery'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Log Buyback Modal ── */}
      {buybackTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-1">Log Silver Buyback</h3>
            <p className="text-sm text-gray-500 mb-4">
              Record HBC buying back silver from{' '}
              <span className="font-semibold text-defaulttextcolor">{buybackTarget.customerName}</span>
              {' '}({buybackTarget.targetNumber})
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="ti-form-label">Grams Returned *</label>
                  <input
                    type="number" step="0.001" min="0.001"
                    className="form-control"
                    placeholder={`Max: ${buybackTarget.gramsPaid}g`}
                    value={bbGrams}
                    onChange={e => setBbGrams(e.target.value)}
                  />
                </div>
                <div>
                  <label className="ti-form-label">Buyback Rate (NPR/g) *</label>
                  <input
                    type="number" step="0.01" min="1"
                    className="form-control"
                    value={bbRate}
                    onChange={e => setBbRate(e.target.value)}
                  />
                  <p className="text-xs text-gray-400 mt-0.5">Current: NPR {currentBuybackRate}/g</p>
                </div>
              </div>

              {bbGrams && bbRate && parseFloat(bbGrams) > 0 && parseFloat(bbRate) > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
                  <p className="text-xs text-orange-600 mb-1">Total Payout to Customer</p>
                  <p className="text-2xl font-bold text-orange-700">NPR {parseFloat(bbPayout()).toLocaleString()}</p>
                  <p className="text-xs text-orange-500">{bbGrams}g × NPR {bbRate}/g</p>
                </div>
              )}

              <div>
                <label className="ti-form-label">Payment Method</label>
                <select className="form-control" value={bbMethod} onChange={e => setBbMethod(e.target.value)}>
                  <option value="Cash">Cash</option>
                  <option value="BankTransfer">Bank Transfer</option>
                  <option value="Credit">Store Credit</option>
                </select>
              </div>

              <div>
                <label className="ti-form-label">Notes (optional)</label>
                <textarea
                  className="form-control" rows={2}
                  placeholder="e.g. Customer returned 10g coin, ID verified"
                  value={bbNotes}
                  onChange={e => setBbNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-5">
              <button onClick={() => setBuybackTarget(null)} className="ti-btn ti-btn-light">Cancel</button>
              <button onClick={submitBuyback} disabled={bbSaving} className="ti-btn !text-white !bg-orange-500 hover:!bg-orange-600">
                {bbSaving ? <><i className="ri-loader-4-line animate-spin me-1"></i>Saving…</> : '↩ Log Buyback'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
