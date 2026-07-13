'use client';

import { Fragment, useEffect, useState } from 'react';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { getAuthHeaders } from '@/shared/services/apiConfig';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL;

type Row = {
  date: string;
  kind: string;
  customerId: string;
  customerName: string;
  customerNumber: string | null;
  amount: number;
  status: string;
  nchlTxnId: string | null;
  gatewayReference: string | null;
  localId: string;
  notes: string | null;
};

type Summary = {
  from: string;
  to: string;
  totalRows: number;
  topUpCount: number;
  topUpTotal: number;
  targetPaymentCount: number;
  targetPaymentTotal: number;
  pendingCount: number;
  failedCount: number;
};

const todayIso = () => new Date().toISOString().slice(0, 10);
const monthStartIso = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

const statusColor = (s: string): string => {
  const v = s.toLowerCase();
  if (v === 'verified' || v === 'completed') return 'success';
  if (v === 'pending' || v === 'processing') return 'warning';
  if (v === 'failed' || v === 'rejected' || v === 'cancelled') return 'danger';
  return 'secondary';
};

export default function ConnectIpsReconciliationPage() {
  useProtectedRoute();

  const [from, setFrom] = useState(monthStartIso());
  const [to, setTo] = useState(todayIso());
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [kindFilter, setKindFilter] = useState<'all' | 'topup' | 'target'>('all');

  const load = async () => {
    setLoading(true);
    try {
      const u = `${API}/admin/reports/connectips-reconciliation?from=${from}&to=${to}&format=json`;
      const r = await fetch(u, { headers: getAuthHeaders() });
      const d = await r.json();
      if (!d?.success) {
        toast.error(d?.message || 'Failed to load reconciliation');
        setRows([]); setSummary(null);
      } else {
        setRows(d.rows || []);
        setSummary(d.summary || null);
      }
    } catch {
      toast.error('Failed to load reconciliation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [from, to]);

  const downloadCsv = async () => {
    setDownloading(true);
    try {
      const u = `${API}/admin/reports/connectips-reconciliation?from=${from}&to=${to}&format=csv`;
      const r = await fetch(u, { headers: getAuthHeaders() });
      if (!r.ok) {
        toast.error('Download failed');
        return;
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `connectips-recon-${from}-${to}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Download failed');
    } finally {
      setDownloading(false);
    }
  };

  const filtered = rows.filter(r => {
    if (kindFilter === 'topup') return r.kind === 'Wallet Top-up';
    if (kindFilter === 'target') return r.kind === 'Target Payment';
    return true;
  });

  return (
    <Fragment>
      <div className="md:flex items-center justify-between my-[1.5rem] gap-3">
        <div>
          <p className="font-semibold text-[1.125rem] !mb-0">ConnectIPS Reconciliation</p>
          <p className="text-[0.813rem] text-[#8c9097]">
            All ConnectIPS wallet top-ups and target installments in the window —
            with NCHL transaction refs for the daily MIS file.
          </p>
        </div>
        <button
          onClick={downloadCsv}
          disabled={downloading || loading || rows.length === 0}
          className="ti-btn ti-btn-primary-full !text-white !opacity-100 disabled:!opacity-50"
          title="Download CSV of the rows currently in the date window"
        >
          {downloading ? <><i className="ri-loader-4-line animate-spin me-1"></i>Preparing…</> : <><i className="ri-download-2-line me-1"></i>Download CSV</>}
        </button>
      </div>

      {/* Date filter + summary */}
      <div className="box mb-4">
        <div className="box-body grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="form-label text-[0.7rem] text-gray-500 uppercase tracking-wide">From</label>
            <input type="date" className="form-control" value={from} max={to} onChange={e => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="form-label text-[0.7rem] text-gray-500 uppercase tracking-wide">To</label>
            <input type="date" className="form-control" value={to} min={from} max={todayIso()} onChange={e => setTo(e.target.value)} />
          </div>
          <div className="md:col-span-2 flex flex-wrap gap-2">
            {[
              { key: 'all',    label: 'All',           count: rows.length },
              { key: 'topup',  label: 'Wallet Top-ups', count: rows.filter(r => r.kind === 'Wallet Top-up').length },
              { key: 'target', label: 'Target Payments', count: rows.filter(r => r.kind === 'Target Payment').length },
            ].map(chip => {
              const active = kindFilter === chip.key;
              return (
                <button key={chip.key} onClick={() => setKindFilter(chip.key as any)}
                  className={`px-3 py-2 rounded text-xs font-semibold transition-colors ${
                    active ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {chip.label} <span className={active ? 'opacity-80' : 'opacity-60'}>({chip.count})</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="box p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Verified Top-ups</p>
            <p className="text-2xl font-bold text-success">Rs. {summary.topUpTotal.toLocaleString()}</p>
            <p className="text-xs text-gray-500">{summary.topUpCount} row{summary.topUpCount === 1 ? '' : 's'}</p>
          </div>
          <div className="box p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Completed Target Payments</p>
            <p className="text-2xl font-bold text-primary">Rs. {summary.targetPaymentTotal.toLocaleString()}</p>
            <p className="text-xs text-gray-500">{summary.targetPaymentCount} row{summary.targetPaymentCount === 1 ? '' : 's'}</p>
          </div>
          <div className="box p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Pending</p>
            <p className="text-2xl font-bold text-warning">{summary.pendingCount}</p>
            <p className="text-xs text-gray-500">awaiting verification</p>
          </div>
          <div className="box p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Failed / Rejected</p>
            <p className="text-2xl font-bold text-danger">{summary.failedCount}</p>
            <p className="text-xs text-gray-500">excluded from totals</p>
          </div>
        </div>
      )}

      {/* Rows table */}
      <div className="box">
        <div className="box-body">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary inline-block"></div>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No ConnectIPS rows in this window.</p>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="ti-custom-table ti-striped-table ti-custom-table-hover min-w-[1000px] sm:min-w-0">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase">
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Kind</th>
                    <th className="text-left p-2">Customer</th>
                    <th className="text-right p-2">Amount</th>
                    <th className="text-center p-2">Status</th>
                    <th className="text-left p-2">NCHL Txn</th>
                    <th className="text-left p-2 hidden lg:table-cell">Gateway Ref</th>
                    <th className="text-left p-2 hidden lg:table-cell">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const sc = statusColor(r.status);
                    return (
                      <tr key={`${r.kind}-${r.localId}`} className="border-t">
                        <td className="p-2 text-[0.813rem] whitespace-nowrap">
                          {new Date(r.date).toLocaleDateString('en-NP')}
                          <div className="text-[0.7rem] text-gray-400">
                            {new Date(r.date).toLocaleTimeString('en-NP', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="p-2 text-[0.813rem]">
                          <span className={`badge px-2 py-0.5 rounded text-[10px] ${
                            r.kind === 'Wallet Top-up' ? 'bg-success/20 text-success' : 'bg-primary/20 text-primary'
                          }`}>{r.kind}</span>
                        </td>
                        <td className="p-2 text-[0.813rem]">
                          <a href={`/customers/${r.customerId}`} className="text-primary hover:underline">{r.customerName || '(no name)'}</a>
                          {r.customerNumber && <div className="text-[0.7rem] text-gray-400 font-mono">{r.customerNumber}</div>}
                        </td>
                        <td className="p-2 text-right font-mono font-semibold">Rs. {r.amount.toLocaleString()}</td>
                        <td className="p-2 text-center">
                          <span className={`badge bg-${sc}/20 text-${sc} text-[10px] px-2 py-0.5 rounded`}>{r.status}</span>
                        </td>
                        <td className="p-2 font-mono text-[0.7rem] text-gray-600">{r.nchlTxnId || <span className="text-gray-300">—</span>}</td>
                        <td className="p-2 font-mono text-[0.7rem] text-gray-600 hidden lg:table-cell">{r.gatewayReference || <span className="text-gray-300">—</span>}</td>
                        <td className="p-2 text-[0.7rem] text-gray-500 hidden lg:table-cell max-w-[200px] truncate" title={r.notes || ''}>{r.notes || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Fragment>
  );
}
