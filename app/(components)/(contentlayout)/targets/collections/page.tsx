'use client'
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { getAuthHeaders } from '@/shared/services/apiConfig';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://hbc-api.semis.app/api';

export default function CollectionsPage() {
  useProtectedRoute();
  const [tab, setTab] = useState<'today'|'overdue'|'scheduled'|'unscheduled'>('today');
  const [targets, setTargets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<string|null>(null);
  const [notes, setNotes] = useState('');

  const load = async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const q = new URLSearchParams({ pageNumber: "1", pageSize: '50' });
    if (tab === 'today') q.set('collectionDate', today);
    else if (tab === 'overdue') { q.set('overdueOnly', 'true'); }
    else if (tab === 'scheduled') q.set('status', 'Completed');
    else q.set('noDate', 'true');
    const r = await fetch(`${API}/targets?${q}`, { headers: getAuthHeaders() });
    const d = await r.json();
    let items = d.data?.items || d.data || [];
    if (tab === 'today') items = items.filter((t:any) => t.collectionDate?.startsWith(today));
    else if (tab === 'overdue') items = items.filter((t:any) => t.collectionDate && new Date(t.collectionDate) < new Date() && t.status !== 'Delivered');
    else if (tab === 'scheduled') items = items.filter((t:any) => t.collectionDate && t.status === 'Completed');
    else items = items.filter((t:any) => !t.collectionDate && (t.status === 'Completed' || t.status === 'Active'));
    setTargets(items);
    setLoading(false);
  };

  useEffect(() => { load(); }, [tab]);

  const confirmDelivery = async (id: string) => {
    setConfirming(id);
  };

  const submitDelivery = async (id: string) => {
    try {
      const r = await fetch(`${API}/targets/${id}/confirm-delivery`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      });
      const d = await r.json();
      if (d.success) { toast.success('Delivery confirmed!'); setConfirming(null); setNotes(''); load(); }
      else toast.error(d.message || 'Failed');
    } catch { toast.error('Failed to confirm delivery'); }
  };

  const TABS = [
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
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              className={`ti-btn ${tab === t.key ? 'ti-btn-primary-full !text-white' : 'ti-btn-outline-primary'}`}>
              {t.label}
            </button>
          ))}
          <button onClick={load} className="ti-btn ti-btn-light ms-auto"><i className="ri-refresh-line"></i></button>
        </div>

        <div className="box shadow-sm">
          <div className="table-responsive">
            <table className="ti-custom-table ti-striped-table">
              <thead>
                <tr><th>Target #</th><th>Customer</th><th>Item</th><th>Grams</th><th>Collection Date</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-10"><div className="animate-spin ri-loader-4-line text-2xl inline-block"></div></td></tr>
                ) : targets.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-gray-500">
                    <i className="ri-checkbox-circle-line text-4xl block mb-2 text-green-500 opacity-60"></i>
                    No items in this category
                  </td></tr>
                ) : targets.map((t: any) => (
                  <tr key={t.id}>
                    <td className="font-mono text-sm font-semibold">{t.targetNumber}</td>
                    <td className="text-sm">{t.customerName || '-'}</td>
                    <td className="text-sm">{t.itemName}</td>
                    <td className="text-sm font-semibold">{t.gramsPaid}g</td>
                    <td className="text-sm">
                      {t.collectionDate
                        ? <span className={new Date(t.collectionDate) < new Date() && t.status !== 'Delivered' ? 'text-red-600 font-semibold' : ''}>
                            {new Date(t.collectionDate).toLocaleDateString()}
                          </span>
                        : <span className="text-gray-400">Not scheduled</span>}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <Link href={`/targets/${t.id}`} className="text-primary hover:underline text-sm font-semibold">View</Link>
                        {t.status !== 'Delivered' && (
                          <button onClick={() => confirmDelivery(t.id)}
                            className="text-success hover:underline text-sm font-semibold">Confirm Delivery</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Confirm Delivery Modal */}
      {confirming && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-lg w-full">
            <h3 className="text-lg font-semibold mb-2">Confirm Delivery</h3>
            <p className="text-gray-600 text-sm mb-4">Mark this target as physically delivered to the customer.</p>
            <textarea className="form-control mb-4" rows={3} placeholder="Delivery notes (optional)"
              value={notes} onChange={e => setNotes(e.target.value)} />
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setConfirming(null); setNotes(''); }} className="btn btn-outline-secondary">Cancel</button>
              <button onClick={() => submitDelivery(confirming)} className="btn btn-success !text-white !bg-success !opacity-100">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
