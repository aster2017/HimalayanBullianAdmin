'use client';

import { Fragment, useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { getAuthHeaders } from '@/shared/services/apiConfig';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://hbc-api.semis.app/api';

type Buyback = {
  id: string;
  buybackNumber: string;
  customerId: string;
  customerName: string;
  targetId?: string;
  targetNumber?: string;
  itemName?: string;
  gramsReturned: number;
  buybackRatePerGram: number;
  totalPaidOut: number;
  paymentMethod: string;
  notes?: string;
  recordedAt: string;
  gramsEligibleRemaining: number;
};

type Customer = { id: string; fullName: string; email?: string; phoneNumber?: string };
type Target = { id: string; targetNumber: string; itemName: string; gramsEligibleForBuyback: number; totalGrams: number };

const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Card', 'Credits', 'Cheque', 'Other'];

export default function BuybacksPage() {
  useProtectedRoute();

  const [items, setItems] = useState<Buyback[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [debouncedFilter, setDebouncedFilter] = useState('');
  const [showLogModal, setShowLogModal] = useState(false);

  // Current system buyback rate (for default in modal)
  const [currentRate, setCurrentRate] = useState(0);

  useEffect(() => { const t = setTimeout(() => setDebouncedFilter(customerFilter), 300); return () => clearTimeout(t); }, [customerFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (date) params.set('date', date);
      const r = await fetch(`${API}/targets/buybacks?${params}`, { headers: getAuthHeaders() });
      const d = await r.json();
      setItems(d?.data || d || []);
    } catch { toast.error('Failed to load buybacks'); }
    finally { setLoading(false); }
  };

  const loadRate = async () => {
    try {
      const r = await fetch(`${API}/rates/silver`, { headers: getAuthHeaders() });
      const d = await r.json();
      setCurrentRate(d?.data?.buybackRatePerGram || d?.buybackRatePerGram || 0);
    } catch {/* swallow */}
  };

  useEffect(() => { load(); }, [date]);
  useEffect(() => { loadRate(); }, []);

  // Client-side filter for customer search since backend filters by customerId only
  const filteredItems = debouncedFilter
    ? items.filter(b => b.customerName?.toLowerCase().includes(debouncedFilter.toLowerCase())
                     || b.buybackNumber?.toLowerCase().includes(debouncedFilter.toLowerCase()))
    : items;

  // Aggregate over the filtered list
  const totals = filteredItems.reduce(
    (acc, b) => ({
      grams: acc.grams + (b.gramsReturned || 0),
      payout: acc.payout + (b.totalPaidOut || 0),
      count: acc.count + 1,
    }),
    { grams: 0, payout: 0, count: 0 }
  );

  return (
    <Fragment>
      <div className="md:flex block items-center justify-between my-[1.5rem] page-header-breadcrumb">
        <div>
          <p className="font-semibold text-[1.125rem] text-defaulttextcolor !mb-0">Buyback Ledger</p>
          <p className="font-normal text-[#8c9097] text-[0.813rem]">All silver buybacks recorded by staff</p>
        </div>
        <button
          onClick={() => setShowLogModal(true)}
          className="ti-btn ti-btn-primary-full !text-white !opacity-100 mt-2 md:mt-0"
        >
          <i className="ri-add-line me-1"></i>Log Buyback
        </button>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5">
        <div className="box p-4">
          <p className="text-xs text-gray-500 mb-1 uppercase">Buybacks {debouncedFilter || date ? '(filtered)' : ''}</p>
          <p className="text-xl font-bold text-primary">{totals.count}</p>
        </div>
        <div className="box p-4">
          <p className="text-xs text-gray-500 mb-1 uppercase">Total Grams Returned</p>
          <p className="text-xl font-bold font-mono">{totals.grams.toFixed(3)}g</p>
        </div>
        <div className="box p-4">
          <p className="text-xs text-gray-500 mb-1 uppercase">Total Paid Out</p>
          <p className="text-xl font-bold text-warning">Rs. {totals.payout.toLocaleString()}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="box mb-4">
        <div className="box-body grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            value={customerFilter}
            onChange={e => setCustomerFilter(e.target.value)}
            placeholder="Filter by customer name / buyback #"
            className="form-control"
          />
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="form-control"
          />
          <button onClick={() => { setCustomerFilter(''); setDate(''); }} className="ti-btn ti-btn-light">
            Reset filters
          </button>
        </div>
      </div>

      <div className="box">
        {loading ? (
          <div className="box-body text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary inline-block"></div>
            <p className="mt-4 text-[#8c9097]">Loading buybacks...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="box-body text-center py-12">
            <i className="ri-arrow-go-back-line text-5xl text-gray-400 block mb-2"></i>
            <p className="text-[#8c9097]">No buybacks {debouncedFilter || date ? 'match the filter' : 'recorded yet'}</p>
            <button onClick={() => setShowLogModal(true)} className="ti-btn ti-btn-primary-full !text-white !opacity-100 mt-3">
              Log the first one
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ti-custom-table ti-striped-table ti-custom-table-hover">
              <thead>
                <tr>
                  <th>Buyback #</th>
                  <th>Customer</th>
                  <th>Target / Item</th>
                  <th>Grams</th>
                  <th>Rate</th>
                  <th>Paid Out</th>
                  <th>Method</th>
                  <th>Recorded</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(b => (
                  <tr key={b.id}>
                    <td><span className="font-mono font-semibold text-sm">{b.buybackNumber}</span></td>
                    <td>
                      <Link href={`/customers/${b.customerId}`} className="text-primary text-sm hover:underline">
                        {b.customerName}
                      </Link>
                    </td>
                    <td className="text-sm">
                      {b.targetNumber ? (
                        <>
                          <span className="font-mono text-xs">{b.targetNumber}</span>
                          {b.itemName && <div className="text-[0.7rem] text-gray-400">{b.itemName}</div>}
                        </>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td><span className="font-mono text-sm font-semibold">{b.gramsReturned?.toFixed(3)}g</span></td>
                    <td className="text-sm">Rs. {b.buybackRatePerGram?.toFixed(2)}/g</td>
                    <td><span className="text-sm font-bold text-warning">Rs. {b.totalPaidOut?.toLocaleString()}</span></td>
                    <td><span className="badge bg-blue-500/10 text-blue-700 px-2 py-1 rounded text-xs">{b.paymentMethod}</span></td>
                    <td className="text-[0.813rem] whitespace-nowrap">
                      {new Date(b.recordedAt).toLocaleDateString('en-NP')}
                      <div className="text-[0.7rem] text-gray-400">{new Date(b.recordedAt).toLocaleTimeString('en-NP', { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showLogModal && (
        <LogBuybackModal
          currentRate={currentRate}
          onClose={() => setShowLogModal(false)}
          onSuccess={() => { setShowLogModal(false); load(); }}
        />
      )}
    </Fragment>
  );
}

// ============================================================================
// Log Buyback modal
// ============================================================================

function LogBuybackModal({
  currentRate, onClose, onSuccess,
}: {
  currentRate: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerMatches, setCustomerMatches] = useState<Customer[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [targets, setTargets] = useState<Target[]>([]);
  const [targetsLoading, setTargetsLoading] = useState(false);

  const [targetId, setTargetId] = useState('');
  const [grams, setGrams] = useState('');
  const [rate, setRate] = useState(currentRate.toString());
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Debounced customer search
  const searchTimer = useRef<any>(null);
  useEffect(() => {
    if (selected || customerSearch.length < 2) { setCustomerMatches([]); return; }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      try {
        const r = await fetch(`${API}/customers?search=${encodeURIComponent(customerSearch)}&pageSize=10`, { headers: getAuthHeaders() });
        const d = await r.json();
        const items = d?.data?.items || d?.items || [];
        setCustomerMatches(items.map((c: any) => ({
          id: c.id,
          fullName: c.fullName || `${c.firstName || ''} ${c.lastName || ''}`.trim(),
          email: c.email,
          phoneNumber: c.phoneNumber,
        })));
        setSearchOpen(true);
      } catch {/* swallow */}
    }, 250);
  }, [customerSearch, selected]);

  // When customer selected, load their delivered targets
  useEffect(() => {
    if (!selected) { setTargets([]); return; }
    setTargetsLoading(true);
    fetch(`${API}/targets/customer/${selected.id}`, { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(d => {
        const all: any[] = d?.data || d || [];
        // Only delivered/completed targets with eligible grams
        setTargets(all.filter(t => (t.status === 'Delivered' || t.status === 'Completed') && (t.gramsEligibleForBuyback ?? 0) > 0));
      })
      .catch(() => setTargets([]))
      .finally(() => setTargetsLoading(false));
  }, [selected]);

  const pickedTarget = targets.find(t => t.id === targetId);
  const maxGrams = pickedTarget?.gramsEligibleForBuyback;
  const gramsNum = parseFloat(grams) || 0;
  const rateNum = parseFloat(rate) || 0;
  const totalPayout = gramsNum * rateNum;
  const gramsValid = gramsNum > 0 && (!maxGrams || gramsNum <= maxGrams);

  const canSubmit = !!selected && gramsValid && rateNum > 0 && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const r = await fetch(`${API}/targets/buybacks`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selected!.id,
          targetId: targetId || null,
          gramsReturned: gramsNum,
          buybackRatePerGram: rateNum,
          paymentMethod,
          notes: notes || null,
        }),
      });
      const d = await r.json();
      if (!r.ok || d?.success === false) {
        toast.error(d?.message || 'Failed to log buyback');
      } else {
        toast.success(`Buyback ${d?.data?.buybackNumber || ''} logged — Rs. ${totalPayout.toLocaleString()}`);
        onSuccess();
      }
    } catch {
      toast.error('Failed to log buyback');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col" style={{ maxHeight: '90vh' }}>
        <div className="p-5 border-b flex items-center justify-between">
          <h3 className="text-lg font-bold">Log Silver Buyback</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><i className="ri-close-line text-xl"></i></button>
        </div>

        <div className="p-5 space-y-4 overflow-auto">
          {/* Customer search */}
          <div className="relative">
            <label className="form-label">Customer *</label>
            {selected ? (
              <div className="flex items-center justify-between p-3 border rounded bg-primary/5">
                <div>
                  <p className="font-semibold text-sm">{selected.fullName}</p>
                  <p className="text-xs text-gray-500">{selected.email || selected.phoneNumber || ''}</p>
                </div>
                <button onClick={() => { setSelected(null); setCustomerSearch(''); setTargetId(''); }} className="text-xs text-primary hover:underline">Change</button>
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
                  autoFocus
                />
                {searchOpen && customerMatches.length > 0 && (
                  <div className="absolute z-10 mt-1 left-0 right-0 bg-white border rounded shadow-lg max-h-60 overflow-auto">
                    {customerMatches.map(c => (
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
                {searchOpen && customerSearch.length >= 2 && customerMatches.length === 0 && (
                  <div className="absolute z-10 mt-1 left-0 right-0 bg-white border rounded shadow-lg p-3 text-sm text-gray-500">
                    No matches. Try a different name/email.
                  </div>
                )}
              </>
            )}
          </div>

          {/* Target picker (optional, but recommended) */}
          {selected && (
            <div>
              <label className="form-label">Target (optional but recommended)</label>
              {targetsLoading ? (
                <p className="text-xs text-gray-500">Loading customer's targets...</p>
              ) : targets.length === 0 ? (
                <p className="text-xs text-gray-500">No delivered targets with eligible buyback grams. You can still log a freeform buyback below.</p>
              ) : (
                <select value={targetId} onChange={e => setTargetId(e.target.value)} className="form-select">
                  <option value="">— No specific target —</option>
                  {targets.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.targetNumber} · {t.itemName} · eligible: {t.gramsEligibleForBuyback?.toFixed(3)}g
                    </option>
                  ))}
                </select>
              )}
              {pickedTarget && (
                <p className="text-xs text-gray-500 mt-1">
                  Max eligible: <span className="font-mono font-semibold">{maxGrams?.toFixed(3)}g</span>
                </p>
              )}
            </div>
          )}

          {/* Grams */}
          <div>
            <label className="form-label">Grams Returned *</label>
            <input
              type="number"
              step="0.001"
              min="0"
              max={maxGrams}
              value={grams}
              onChange={e => setGrams(e.target.value)}
              placeholder="e.g. 5.250"
              className={`form-control ${!gramsValid && grams ? 'border-red-500' : ''}`}
            />
            {!gramsValid && grams && (
              <p className="text-xs text-red-500 mt-1">
                {gramsNum <= 0 ? 'Must be greater than 0' : `Cannot exceed eligible ${maxGrams?.toFixed(3)}g`}
              </p>
            )}
          </div>

          {/* Rate */}
          <div>
            <label className="form-label">Buyback Rate (NPR/g) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={rate}
              onChange={e => setRate(e.target.value)}
              className="form-control"
            />
            <p className="text-xs text-gray-500 mt-1">
              Current system rate: <span className="font-mono">Rs. {currentRate.toFixed(2)}/g</span>
              {rateNum !== currentRate && rateNum > 0 && <span className="text-warning ms-2">(manual override)</span>}
            </p>
          </div>

          {/* Payment method */}
          <div>
            <label className="form-label">Payment Method *</label>
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="form-select">
              {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="form-label">Notes (optional)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Bank transfer ref ABC-123"
              className="form-control"
            />
          </div>

          {/* Total preview */}
          {gramsValid && rateNum > 0 && (
            <div className="p-3 bg-primary/10 border border-primary/30 rounded text-center">
              <p className="text-xs text-gray-600 uppercase tracking-wide">Total Payout</p>
              <p className="text-2xl font-bold text-primary">Rs. {totalPayout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p className="text-xs text-gray-500">{gramsNum.toFixed(3)}g × Rs. {rateNum.toFixed(2)}/g</p>
            </div>
          )}
        </div>

        <div className="p-5 border-t flex gap-3 justify-end">
          <button onClick={onClose} className="btn btn-outline-secondary">Cancel</button>
          <button
            onClick={submit}
            disabled={!canSubmit}
            className="ti-btn ti-btn-primary-full !text-white !opacity-100 disabled:!opacity-50"
          >
            {submitting ? <><i className="ri-loader-4-line animate-spin me-1"></i>Logging...</> : 'Log Buyback'}
          </button>
        </div>
      </div>
    </div>
  );
}
