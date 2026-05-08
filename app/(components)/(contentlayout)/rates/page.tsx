'use client'
import React, { useEffect, useState } from 'react';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { getAuthHeaders } from '@/shared/services/apiConfig';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://hbc-api.semis.app/api';

export default function RatesPage() {
  useProtectedRoute();
  const [rate, setRate] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [form, setForm] = useState({ buyRatePerGram: '', buybackRatePerGram: '' });
  const [storeForm, setStoreForm] = useState({ openHour: 6, openMinute: 0, closeHour: 23, closeMinute: 59 });
  const [saving, setSaving] = useState(false);
  const [savingHours, setSavingHours] = useState(false);

  const load = async () => {
    const r = await fetch(`${API}/rates/silver`);
    const d = await r.json();
    setRate(d);
    setForm({ buyRatePerGram: String(d.buyRatePerGram), buybackRatePerGram: String(d.buybackRatePerGram) });
    if (d.storeHours) {
      setStoreForm({ openHour: d.storeHours.openHour ?? 6, openMinute: d.storeHours.openMinute ?? 0, closeHour: d.storeHours.closeHour ?? 23, closeMinute: d.storeHours.closeMinute ?? 59 });
    }
    // Load rate history
    const h = await fetch(`${API}/rates/silver/history?limit=20`, { headers: getAuthHeaders() });
    const hd = await h.json();
    setHistory(Array.isArray(hd) ? hd : hd.data || []);
  };

  useEffect(() => { load(); }, []);

  const saveRate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await fetch(`${API}/rates/silver`, {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyRatePerGram: parseFloat(form.buyRatePerGram), buybackRatePerGram: parseFloat(form.buybackRatePerGram) || undefined })
      });
      const d = await r.json();
      if (r.ok) { toast.success('Rate updated!'); load(); }
      else toast.error(d.message || d.error || 'Failed to update rate');
    } catch { toast.error('Failed to update rate'); }
    setSaving(false);
  };

  const saveStoreHours = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingHours(true);
    try {
      const r = await fetch(`${API}/rates/store-hours`, {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(storeForm)
      });
      if (r.ok) { toast.success('Store hours updated!'); load(); }
      else toast.error('Failed to update store hours');
    } catch { toast.error('Failed to update store hours'); }
    setSavingHours(false);
  };

  const buyRate = parseFloat(form.buyRatePerGram) || 0;
  const autoSellback = (buyRate * 0.96).toFixed(2);

  return (
    <div className="page-content">
      <div className="container-fluid">
        <div className="md:flex items-center justify-between my-[1.5rem]">
          <div>
            <p className="font-semibold text-[1.125rem] text-defaulttextcolor !mb-0">Silver Rate Management</p>
            <p className="font-normal text-[#8c9097] text-[0.813rem]">Update daily silver buy/sell rates and store hours.</p>
          </div>
          <button onClick={load} className="ti-btn ti-btn-light mt-2 md:mt-0"><i className="ri-refresh-line me-1"></i>Refresh</button>
        </div>

        {/* Current Rate Banner */}
        {rate && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="box bg-yellow-500/10 border-l-4 border-yellow-500 p-5 rounded-lg shadow-sm">
              <p className="text-gray-500 text-sm">Buy Rate / gram</p>
              <h3 className="text-2xl font-bold mt-1">NPR {rate.buyRatePerGram}</h3>
              <p className="text-xs text-gray-400 mt-1">NPR {(rate.buyRatePerGram * 10).toFixed(2)} per 10g</p>
            </div>
            <div className="box bg-blue-500/10 border-l-4 border-blue-500 p-5 rounded-lg shadow-sm">
              <p className="text-gray-500 text-sm">Buyback Rate / gram</p>
              <h3 className="text-2xl font-bold mt-1">NPR {rate.buybackRatePerGram}</h3>
              <p className="text-xs text-gray-400 mt-1">{((rate.buybackRatePerGram / rate.buyRatePerGram) * 100).toFixed(1)}% of buy rate</p>
            </div>
            <div className="box bg-green-500/10 border-l-4 border-green-500 p-5 rounded-lg shadow-sm">
              <p className="text-gray-500 text-sm">Store Status</p>
              <h3 className="text-2xl font-bold mt-1">
                <span className={rate.storeHours?.isOpen ? 'text-green-600' : 'text-red-500'}>
                  {rate.storeHours?.isOpen ? 'Open' : 'Closed'}
                </span>
              </h3>
              <p className="text-xs text-gray-400 mt-1">{rate.storeHours?.message}</p>
            </div>
            <div className="box bg-purple-500/10 border-l-4 border-purple-500 p-5 rounded-lg shadow-sm">
              <p className="text-gray-500 text-sm">Last Updated</p>
              <h3 className="text-lg font-bold mt-1">{new Date(rate.updatedAt).toLocaleTimeString()}</h3>
              <p className="text-xs text-gray-400 mt-1">{new Date(rate.updatedAt).toLocaleDateString()}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Update Rate */}
          <div className="box shadow-sm">
            <div className="box-header border-b p-4"><h5 className="box-title mb-0">Update Silver Rate</h5></div>
            <div className="box-body p-5">
              <form onSubmit={saveRate} className="space-y-4">
                <div>
                  <label className="ti-form-label">Buy Rate per gram (NPR) *</label>
                  <input type="number" step="0.01" min="1" required
                    className="form-control" placeholder="350.00"
                    value={form.buyRatePerGram} onChange={e => setForm(f => ({ ...f, buyRatePerGram: e.target.value }))} />
                  {buyRate > 0 && <p className="text-xs text-gray-500 mt-1">= NPR {(buyRate*10).toFixed(2)}/10g · NPR {(buyRate*11.6638).toFixed(2)}/tola</p>}
                </div>
                <div>
                  <label className="ti-form-label">Buyback Rate per gram (NPR)</label>
                  <input type="number" step="0.01" min="1"
                    className="form-control" placeholder={`Auto: ${autoSellback}`}
                    value={form.buybackRatePerGram} onChange={e => setForm(f => ({ ...f, buybackRatePerGram: e.target.value }))} />
                  <p className="text-xs text-gray-500 mt-1">Leave blank to auto-set at 96% of buy rate</p>
                </div>
                <button type="submit" disabled={saving} className="ti-btn ti-btn-primary-full !text-white w-full">
                  {saving ? <><i className="ri-loader-4-line animate-spin me-2"></i>Saving…</> : <><i className="ri-save-line me-2"></i>Update Rate</>}
                </button>
              </form>
            </div>
          </div>

          {/* Store Hours */}
          <div className="box shadow-sm">
            <div className="box-header border-b p-4"><h5 className="box-title mb-0">Store Hours</h5></div>
            <div className="box-body p-5">
              <form onSubmit={saveStoreHours} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="ti-form-label">Open Hour (24h)</label>
                    <input type="number" min="0" max="23" className="form-control"
                      value={storeForm.openHour} onChange={e => setStoreForm(f => ({ ...f, openHour: +e.target.value }))} />
                  </div>
                  <div>
                    <label className="ti-form-label">Open Minute</label>
                    <input type="number" min="0" max="59" className="form-control"
                      value={storeForm.openMinute} onChange={e => setStoreForm(f => ({ ...f, openMinute: +e.target.value }))} />
                  </div>
                  <div>
                    <label className="ti-form-label">Close Hour (24h)</label>
                    <input type="number" min="0" max="23" className="form-control"
                      value={storeForm.closeHour} onChange={e => setStoreForm(f => ({ ...f, closeHour: +e.target.value }))} />
                  </div>
                  <div>
                    <label className="ti-form-label">Close Minute</label>
                    <input type="number" min="0" max="59" className="form-control"
                      value={storeForm.closeMinute} onChange={e => setStoreForm(f => ({ ...f, closeMinute: +e.target.value }))} />
                  </div>
                </div>
                <p className="text-xs text-gray-500">Current: {String(storeForm.openHour).padStart(2,'0')}:{String(storeForm.openMinute).padStart(2,'0')} – {String(storeForm.closeHour).padStart(2,'0')}:{String(storeForm.closeMinute).padStart(2,'0')} (Nepal time)</p>
                <button type="submit" disabled={savingHours} className="ti-btn ti-btn-primary-full !text-white w-full">
                  {savingHours ? 'Saving…' : 'Update Store Hours'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Rate History */}
        <div className="box shadow-sm mt-6">
          <div className="box-header border-b p-4 flex items-center justify-between">
            <h5 className="box-title mb-0">Rate Change History</h5>
            <span className="text-xs text-gray-400">Last 20 changes</span>
          </div>
          {history.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">No rate changes recorded yet.</div>
          ) : (
            <div className="table-responsive">
              <table className="ti-custom-table ti-striped-table">
                <thead>
                  <tr>
                    <th>Date &amp; Time</th>
                    <th>Buy Rate / g</th>
                    <th>Buyback Rate / g</th>
                    <th>Per 10g</th>
                    <th>Change</th>
                    <th>Source</th>
                    <th>Changed By</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h: any, i: number) => {
                    const delta = Number(h.change ?? 0);
                    return (
                      <tr key={h.id ?? i}>
                        <td className="text-sm whitespace-nowrap">{new Date(h.recordedAt).toLocaleString()}</td>
                        <td className="text-sm font-semibold font-mono">NPR {Number(h.buyRatePerGram).toFixed(2)}</td>
                        <td className="text-sm font-mono text-gray-500">NPR {Number(h.buybackRatePerGram).toFixed(2)}</td>
                        <td className="text-sm font-mono">NPR {(Number(h.buyRatePerGram) * 10).toFixed(2)}</td>
                        <td className="text-sm font-mono">
                          {delta === 0 ? (
                            <span className="text-gray-400">—</span>
                          ) : delta > 0 ? (
                            <span className="text-green-600 font-semibold">▲ +{delta.toFixed(2)}</span>
                          ) : (
                            <span className="text-red-500 font-semibold">▼ {delta.toFixed(2)}</span>
                          )}
                        </td>
                        <td className="text-sm">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${h.source === 'Admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-600'}`}>
                            {h.source ?? 'Zoho'}
                          </span>
                        </td>
                        <td className="text-sm text-gray-500">{h.changedBy ?? '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
