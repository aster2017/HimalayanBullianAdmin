'use client'
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import apiClient from '@/shared/services/apiClient';
import toast from 'react-hot-toast';

type Tab = 'today' | 'overdue' | 'scheduled' | 'unscheduled';

export default function CollectionsPage() {
  useProtectedRoute();
  const [tab, setTab] = useState<Tab>('today');
  const [allTargets, setAllTargets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [acting, setActing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await apiClient.get('/targets', { params: { pageNumber: 1, pageSize: 100 } });
      setAllTargets(r.data?.data?.items || []);
    } catch { toast.error('Failed to load'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const todayStr = new Date().toISOString().split('T')[0];

  const filtered = allTargets.filter((t: any) => {
    if (tab === 'today') return t.collectionDate?.startsWith(todayStr) && t.status !== 'Delivered';
    if (tab === 'overdue') return t.collectionDate && new Date(t.collectionDate) < new Date() && !t.collectionDate?.startsWith(todayStr) && t.status !== 'Delivered';
    if (tab === 'scheduled') return t.collectionDate && (t.status === 'Completed' || t.status === 'Active') && new Date(t.collectionDate) >= new Date();
    if (tab === 'unscheduled') return !t.collectionDate && (t.status === 'Completed' || t.status === 'Active');
    return false;
  });

  const confirmDelivery = async () => {
    if (!confirming) return;
    setActing(true);
    try {
      const r = await apiClient.post(`/targets/${confirming}/confirm-delivery`, { notes });
      if (r.data?.success !== false) { toast.success('Delivery confirmed!'); setConfirming(null); setNotes(''); load(); }
      else toast.error(r.data?.message || 'Failed');
    } catch { toast.error('Failed'); }
    setActing(false);
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: 'today', label: 'Due Today' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'scheduled', label: 'Scheduled' },
    { key: 'unscheduled', label: 'No Date Set' },
  ];

  return (
    <div className="page-content">
      <div className="container-fluid">
        <div className="md:flex items-center justify-between my-[1.5rem]">
          <div>
            <p className="font-semibold text-[1.125rem] text-defaulttextcolor !mb-0">Collections</p>
            <p className="font-normal text-[#8c9097] text-[0.813rem]">Manage silver collection and delivery scheduling.</p>
          </div>
          <button onClick={load} className="ti-btn ti-btn-light mt-2 md:mt-0"><i className="bx bx-refresh me-1"></i>Refresh</button>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`ti-btn ${tab === t.key ? 'ti-btn-primary-full !text-white' : 'ti-btn-light'}`}>
              {t.label}
              {tab === t.key && !loading && <span className="ms-2 badge bg-white/20 text-white">{filtered.length}</span>}
            </button>
          ))}
        </div>

        <div className="box shadow-sm">
          <div className="table-responsive">
            <table className="ti-custom-table ti-striped-table">
              <thead><tr><th>Target #</th><th>Customer</th><th>Item</th><th>Grams</th><th>Collection Date</th><th>Actions</th></tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-10"><i className="bx bx-loader-alt animate-spin text-2xl"></i></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-[#8c9097]">
                    <i className="bx bx-check-circle text-4xl block mb-2 text-success opacity-60"></i>
                    No items in this category
                  </td></tr>
                ) : filtered.map((t: any) => {
                  const isOverdue = t.collectionDate && new Date(t.collectionDate) < new Date() && t.status !== 'Delivered';
                  return (
                    <tr key={t.id}>
                      <td className="font-mono text-sm font-semibold">{t.targetNumber}</td>
                      <td className="text-sm">{t.customerName || '-'}</td>
                      <td className="text-sm">{t.itemName}</td>
                      <td className="text-sm font-semibold">{t.gramsPaid}g</td>
                      <td className="text-sm">
                        {t.collectionDate
                          ? <span className={isOverdue ? 'text-danger font-semibold' : ''}>{new Date(t.collectionDate).toLocaleDateString()}</span>
                          : <span className="text-[#8c9097]">Not scheduled</span>}
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <Link href={`/targets/${t.id}`} className="text-primary hover:underline text-sm font-semibold">View</Link>
                          {t.status !== 'Delivered' && (
                            <button onClick={() => setConfirming(t.id)} className="text-success hover:underline text-sm font-semibold">Confirm Delivery</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {confirming && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Confirm Delivery</h3>
            <p className="text-[#8c9097] text-sm mb-4">Mark silver as physically handed to customer.</p>
            <textarea className="form-control mb-4" rows={3} placeholder="Delivery notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} />
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setConfirming(null); setNotes(''); }} className="ti-btn ti-btn-light">Cancel</button>
              <button onClick={confirmDelivery} disabled={acting} className="ti-btn ti-btn-success !text-white !bg-success !opacity-100">{acting ? '...' : 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
