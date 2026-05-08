'use client';

import React, { useEffect, useState } from 'react';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { getAuthHeaders } from '@/shared/services/apiConfig';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://hbc-api.semis.app/api';

interface Item {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  unit: string | null;
  rate: number;
  stockOnHand: number;
  reorderLevel: number;
  isActive: boolean;
  isFeatured: boolean;
  showInMobile: boolean;
  isTargetProduct: boolean;
  zohoItemId: string | null;
  syncStatus: number; // 1=Pending, 2=InProgress, 3=Success, 4=Failed
  lastSyncedAt: string | null;
  images: { id: string; imageUrl: string; isPrimary: boolean }[];
}

const SYNC_LABELS: Record<number, { label: string; cls: string }> = {
  1: { label: 'Pending',    cls: 'bg-warning/20 text-warning' },
  2: { label: 'Syncing…',  cls: 'bg-info/20 text-info' },
  3: { label: 'Synced',    cls: 'bg-success/20 text-success' },
  4: { label: 'Failed',    cls: 'bg-danger/20 text-danger' },
};

export default function ItemsPage() {
  useProtectedRoute();

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [syncingAll, setSyncingAll] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [editForm, setEditForm] = useState<Partial<Item>>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/items?pageSize=100`, { headers: getAuthHeaders() });
      const d = await r.json();
      setItems(d.data?.items || d.data || d.items || []);
    } catch { toast.error('Failed to load items'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter(i =>
    !search || i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.sku.toLowerCase().includes(search.toLowerCase())
  );

  // ── Zoho Sync ───────────────────────────────────────────────────────────────
  const syncItem = async (id: string) => {
    setSyncingIds(prev => new Set([...prev, id]));
    try {
      const r = await fetch(`${API}/items/${id}/sync`, { method: 'POST', headers: getAuthHeaders() });
      const d = await r.json();
      if (d.success || d.data?.success) {
        toast.success('Synced to Zoho!');
        await load();
      } else {
        toast.error(d.message || 'Sync failed');
      }
    } catch { toast.error('Sync failed'); }
    setSyncingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  const syncAll = async () => {
    const pending = items.filter(i => !i.zohoItemId || i.syncStatus === 4);
    if (pending.length === 0) { toast('All items already synced'); return; }
    setSyncingAll(true);
    for (const item of pending) {
      await syncItem(item.id);
    }
    setSyncingAll(false);
    toast.success(`Synced ${pending.length} item(s) to Zoho`);
  };

  // ── Inline toggle (showInMobile / isActive) ─────────────────────────────────
  const toggleField = async (item: Item, field: 'showInMobile' | 'isActive') => {
    const updated = { ...item, [field]: !item[field] };
    setItems(prev => prev.map(i => i.id === item.id ? updated : i));
    try {
      const r = await fetch(`${API}/items/${item.id}`, {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, [field]: !item[field] }),
      });
      if (!r.ok) { setItems(prev => prev.map(i => i.id === item.id ? item : i)); toast.error('Update failed'); }
      else toast.success(`${field === 'showInMobile' ? 'Mobile visibility' : 'Status'} updated`);
    } catch { setItems(prev => prev.map(i => i.id === item.id ? item : i)); toast.error('Update failed'); }
  };

  // ── Edit modal ───────────────────────────────────────────────────────────────
  const openEdit = (item: Item) => { setEditItem(item); setEditForm({ ...item }); };
  const closeEdit = () => { setEditItem(null); setEditForm({}); };

  const saveEdit = async () => {
    if (!editItem) return;
    setSavingEdit(true);
    try {
      const r = await fetch(`${API}/items/${editItem.id}`, {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const d = await r.json();
      if (r.ok && (d.success !== false)) {
        toast.success('Item saved');
        closeEdit();
        await load();
      } else {
        toast.error(d.message || 'Save failed');
      }
    } catch { toast.error('Save failed'); }
    setSavingEdit(false);
  };

  const pendingCount = items.filter(i => !i.zohoItemId || i.syncStatus === 4).length;

  return (
    <div className="page-content">
      <div className="container-fluid">

        {/* Header */}
        <div className="md:flex items-center justify-between my-[1.5rem] gap-4">
          <div>
            <p className="font-semibold text-[1.125rem] text-defaulttextcolor !mb-0">Inventory Items</p>
            <p className="text-[#8c9097] text-[0.813rem]">
              {items.length} items · {items.filter(i => i.showInMobile).length} visible in mobile
            </p>
          </div>
          <div className="flex items-center gap-2 mt-2 md:mt-0 flex-wrap">
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name or SKU…"
              className="form-control form-control-sm w-52"
            />
            {pendingCount > 0 && (
              <button onClick={syncAll} disabled={syncingAll}
                className="ti-btn ti-btn-sm bg-violet-600 text-white !font-medium disabled:opacity-50">
                {syncingAll ? '⏳ Syncing…' : `⬆ Sync ${pendingCount} to Zoho`}
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="box shadow-sm">
          <div className="table-responsive">
            <table className="ti-custom-table ti-striped-table">
              <thead>
                <tr className="bg-light">
                  <th>ITEM</th>
                  <th>SKU</th>
                  <th>CATEGORY</th>
                  <th className="text-center">IMAGES</th>
                  <th className="text-center">SHOW IN MOBILE</th>
                  <th className="text-center">ZOHO SYNCED</th>
                  <th className="text-center">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-10 text-[#8c9097]">Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-[#8c9097]">No items found</td></tr>
                ) : filtered.map(item => {
                  const sync = SYNC_LABELS[item.syncStatus] || SYNC_LABELS[1];
                  const isSyncing = syncingIds.has(item.id);
                  return (
                    <tr key={item.id} className="hover:bg-light/50">
                      <td>
                        <div className="font-medium text-sm">{item.name}</div>
                        {item.isTargetProduct && (
                          <span className="badge bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded">Target Product</span>
                        )}
                      </td>
                      <td><code className="text-xs text-violet-600">{item.sku}</code></td>
                      <td><span className="text-sm text-[#8c9097]">{item.category || '—'}</span></td>
                      <td className="text-end">
                        <span className="text-sm font-mono">{item.rate > 0 ? `NPR ${item.rate.toLocaleString()}` : '—'}</span>
                      </td>

                      {/* ShowInMobile toggle */}
                      {/* Images count */}
                      <td className="text-center">
                        <span className={`inline-flex items-center gap-1 text-sm font-semibold ${(item.images?.length ?? 0) === 0 ? 'text-[#8c9097]' : 'text-primary'}`}>
                          🖼 {item.images?.length ?? 0}
                        </span>
                      </td>

                      {/* ShowInMobile toggle */}
                      <td className="text-center">
                        <button
                          onClick={() => toggleField(item, 'showInMobile')}
                          title={item.showInMobile ? 'Visible in app — click to hide' : 'Hidden in app — click to show'}
                          className="flex items-center gap-1.5 mx-auto"
                        >
                          <div className={`relative w-9 h-5 rounded-full transition-colors ${item.showInMobile ? 'bg-success' : 'bg-[#d1d5db]'}`}>
                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${item.showInMobile ? 'translate-x-4' : 'translate-x-0.5'}`} />
                          </div>
                          <span className={`text-xs font-medium ${item.showInMobile ? 'text-success' : 'text-[#8c9097]'}`}>
                            {item.showInMobile ? 'Yes' : 'No'}
                          </span>
                        </button>
                      </td>

                      {/* Zoho synced */}
                      <td className="text-center">
                        {item.zohoItemId ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                              Synced
                            </span>
                            <code className="text-[9px] text-[#8c9097] mt-0.5">…{item.zohoItemId.slice(-6)}</code>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1.5">
                            <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${sync.cls}`}>
                              {isSyncing ? 'Syncing…' : sync.label}
                            </span>
                            {!isSyncing && (
                              <button
                                onClick={() => syncItem(item.id)}
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-violet-600 bg-violet-50 hover:bg-violet-100 px-2 py-0.5 rounded transition-colors"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                                Sync
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Full edit page with image upload */}
                          <a
                            href={`/items/${item.id}`}
                            className="inline-flex items-center gap-1 text-xs font-medium text-white bg-primary hover:bg-primary/90 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                            Edit
                          </a>
                          {/* Quick edit for flags only */}
                          <button
                            onClick={() => openEdit(item)}
                            title="Quick edit flags"
                            className="inline-flex items-center justify-center w-7 h-7 text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
                          </button>
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

      {/* Edit Modal */}
      {editItem && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && closeEdit()}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col" style={{ maxHeight: '90vh' }}>

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wide">Quick Edit</span>
                  <h3 className="text-base font-semibold text-gray-900">{editItem.name}</h3>
                </div>
                <p className="text-xs text-gray-400 mt-0.5 font-mono">{editItem.sku}</p>
              </div>
              <button
                onClick={closeEdit}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition-colors text-base font-medium"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

              {/* Name & Category */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Name</label>
                <input type="text" className="form-control"
                  value={editForm.name ?? ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Category</label>
                  <input type="text" className="form-control"
                    value={editForm.category ?? ''} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Unit</label>
                  <input type="text" className="form-control"
                    value={editForm.unit ?? ''} onChange={e => setEditForm(f => ({ ...f, unit: e.target.value }))} />
                </div>
              </div>

              {/* Flags */}
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                {[
                  { key: 'isActive',       label: 'Active',             desc: 'Item is available for purchase',             icon: '✅' },
                  { key: 'showInMobile',   label: 'Show in Mobile App', desc: 'Visible in the iOS customer catalog',        icon: '📱' },
                  { key: 'isFeatured',     label: 'Featured',           desc: 'Highlighted on the home screen',             icon: '⭐' },
                  { key: 'isTargetProduct',label: 'Target Product',     desc: 'Appears in the layaway / saving plan picker', icon: '🎯' },
                ].map(({ key, label, desc, icon }, idx, arr) => (
                  <label key={key} className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${idx < arr.length - 1 ? 'border-b border-gray-100' : ''}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-lg leading-none">{icon}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{label}</p>
                        <p className="text-xs text-gray-400">{desc}</p>
                      </div>
                    </div>
                    <div className="relative flex-shrink-0">
                      <input type="checkbox" className="sr-only peer"
                        checked={(editForm as any)[key] ?? false}
                        onChange={e => setEditForm(f => ({ ...f, [key]: e.target.checked }))} />
                      <div className="w-10 h-5 bg-gray-200 peer-checked:bg-primary rounded-full transition-colors" />
                      <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              {/* Top row: full edit link */}
              <a href={`/items/${editItem.id}`}
                className="flex items-center justify-center gap-2 w-full text-sm font-medium text-primary border border-primary/30 bg-primary/5 hover:bg-primary/10 px-4 py-2 rounded-lg transition-colors mb-3"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                Open full editor (images, pricing, details)
              </a>
              {/* Bottom row: action buttons */}
              <div className="flex items-center gap-2">
                {!editItem.zohoItemId && (
                  <button
                    onClick={() => { closeEdit(); syncItem(editItem.id); }}
                    className="flex items-center gap-1.5 text-xs font-medium text-violet-700 bg-violet-100 hover:bg-violet-200 px-3 py-2 rounded-lg transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                    Sync to Zoho
                  </button>
                )}
                <div className="flex-1" />
                <button onClick={closeEdit} className="text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 px-4 py-2 rounded-lg transition-colors">
                  Cancel
                </button>
                <button onClick={saveEdit} disabled={savingEdit}
                  className="flex items-center gap-1.5 text-sm font-semibold text-white bg-primary hover:bg-primary/90 disabled:opacity-50 px-5 py-2 rounded-lg transition-colors"
                >
                  {savingEdit ? 'Saving…' : '✓ Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
