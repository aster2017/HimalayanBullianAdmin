'use client'
import React, { useEffect, useState } from 'react';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import apiClient from '@/shared/services/apiClient';
import toast from 'react-hot-toast';

export default function RatesPage() {
  useProtectedRoute();
  const [rate, setRate] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [form, setForm] = useState({ buyRatePerGram: '', buybackRatePerGram: '' });
  const [storeForm, setStoreForm] = useState({ openHour: 6, openMinute: 0, closeHour: 23, closeMinute: 59 });
  const [saving, setSaving] = useState(false);
  const [savingHours, setSavingHours] = useState(false);

  const load = async () => {
    const r = await fetch('https://hbc-api.semis.app/api/rates/silver');
    const d = await r.json();
    setRate(d);
    setForm({ buyRatePerGram: String(d.buyRatePerGram), buybackRatePerGram: String(d.buybackRatePerGram) });
    if (d.storeHours) setStoreForm({ openHour: d.storeHours.openHour ?? 6, openMinute: d.storeHours.openMinute ?? 0, closeHour: d.storeHours.closeHour ?? 23, closeMinute: d.storeHours.closeMinute ?? 59 });
    try {
      const h = await apiClient.get('/rates/silver/history?limit=10');
      setHistory(h.data?.data || h.data || []);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const saveRate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await apiClient.put('/rates/silver', {
        buyRatePerGram: parseFloat(form.buyRatePerGram),
        buybackRatePerGram: form.buybackRatePerGram ? parseFloat(form.buybackRatePerGram) : undefined
      });
      if (r.data?.success !== false) { toast.success('Rate updated!'); load(); }
      else toast.error(r.data?.message || r.data?.error || 'Failed');
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to update rate'); }
    setSaving(false);
  };

  const saveStoreHours = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingHours(true);
    try {
      await apiClient.put('/rates/store-hours', storeForm);
      toast.success('Store hours updated!');
      load();
    } catch { toast.error('Failed to update store hours'); }
    setSavingHours(false);
  };

  const buyRate = parseFloat(form.buyRatePerGram) || 0;

  return (
    <div className="page-content">
      <div className="container-fluid">
        <div className="md:flex items-center justify-between my-[1.5rem]">
          <div>
            <p className="font-semibold text-[1.125rem] text-defaulttextcolor !mb-0">Silver Rate Management</p>
            <p className="font-normal text-[#8c9097] text-[0.813rem]">Update daily silver buy/sell rates and store hours.</p>
          </div>
          <button onClick={load} className="ti-btn ti-btn-light mt-2 md:mt-0"><i className="bx bx-refresh me-1"></i>Refresh</button>
        </div>

        {rate && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
            <div className="box bg-warning/10 border-l-4 border-warning p-5 rounded-lg">
              <p className="text-[#8c9097] text-sm">Buy Rate / gram</p>
              <h3 className="text-2xl font-bold mt-1">NPR {rate.buyRatePerGram}</h3>
              <p className="text-xs text-[#8c9097] mt-1">NPR {(rate.buyRatePerGram * 10).toFixed(2)} per 10g</p>
            </div>
            <div className="box bg-primary/10 border-l-4 border-primary p-5 rounded-lg">
              <p className="text-[#8c9097] text-sm">Buyback Rate / gram</p>
              <h3 className="text-2xl font-bold mt-1">NPR {rate.buybackRatePerGram}</h3>
              <p className="text-xs text-[#8c9097] mt-1">{((rate.buybackRatePerGram / rate.buyRatePerGram) * 100).toFixed(1)}% of buy rate</p>
            </div>
            <div className={`box border-l-4 p-5 rounded-lg ${rate.storeHours?.isOpen ? 'bg-success/10 border-success' : 'bg-danger/10 border-danger'}`}>
              <p className="text-[#8c9097] text-sm">Store Status</p>
              <h3 className={`text-2xl font-bold mt-1 ${rate.storeHours?.isOpen ? 'text-success' : 'text-danger'}`}>
                {rate.storeHours?.isOpen ? 'Open' : 'Closed'}
              </h3>
              <p className="text-xs text-[#8c9097] mt-1">{rate.storeHours?.message}</p>
            </div>
            <div className="box bg-secondary/10 border-l-4 border-secondary p-5 rounded-lg">
              <p className="text-[#8c9097] text-sm">Last Updated</p>
              <h3 className="text-lg font-bold mt-1">{new Date(rate.updatedAt).toLocaleTimeString()}</h3>
              <p className="text-xs text-[#8c9097] mt-1">{new Date(rate.updatedAt).toLocaleDateString()}</p>
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
                  <input type="number" step="0.01" min="1" required className="form-control"
                    placeholder="350.00" value={form.buyRatePerGram}
                    onChange={e => setForm(f => ({ ...f, buyRatePerGram: e.target.value }))} />
                  {buyRate > 0 && (
                    <p className="text-xs text-[#8c9097] mt-1">
                      = NPR {(buyRate * 10).toFixed(2)}/10g · NPR {(buyRate * 11.6638).toFixed(2)}/tola
                    </p>
                  )}
                </div>
                <div>
                  <label className="ti-form-label">Buyback Rate per gram (NPR)</label>
                  <input type="number" step="0.01" min="1" className="form-control"
                    placeholder={`Auto: ${(buyRate * 0.96).toFixed(2)}`} value={form.buybackRatePerGram}
                    onChange={e => setForm(f => ({ ...f, buybackRatePerGram: e.target.value }))} />
                  <p className="text-xs text-[#8c9097] mt-1">Leave blank to auto-set at 96% of buy rate</p>
                </div>
                <button type="submit" disabled={saving} className="ti-btn ti-btn-primary-full !text-white w-full">
                  {saving ? <><i className="bx bx-loader-alt animate-spin me-2"></i>Saving…</> : <><i className="bx bx-save me-2"></i>Update Rate</>}
                </button>
              </form>
            </div>
          </div>

          {/* Store Hours */}
          <div className="box shadow-sm">
            <div className="box-header border-b p-4"><h5 className="box-title mb-0">Store Hours (Nepal Time)</h5></div>
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
                <p className="text-xs text-[#8c9097]">
                  Hours: {String(storeForm.openHour).padStart(2, '0')}:{String(storeForm.openMinute).padStart(2, '0')} – {String(storeForm.closeHour).padStart(2, '0')}:{String(storeForm.closeMinute).padStart(2, '0')}
                </p>
                <button type="submit" disabled={savingHours} className="ti-btn ti-btn-primary-full !text-white w-full">
                  {savingHours ? 'Saving…' : 'Update Store Hours'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {history.length > 0 && (
          <div className="box shadow-sm mt-6">
            <div className="box-header border-b p-4"><h5 className="box-title mb-0">Rate History (Last 10)</h5></div>
            <div className="table-responsive">
              <table className="ti-custom-table ti-striped-table">
                <thead><tr><th>Date / Time</th><th>Buy Rate/g</th><th>Buyback Rate/g</th><th>Per 10g</th><th>Updated By</th></tr></thead>
                <tbody>
                  {history.map((h: any, i) => (
                    <tr key={i}>
                      <td className="text-sm text-[#8c9097]">{new Date(h.recordedAt || h.createdAt).toLocaleString()}</td>
                      <td className="text-sm font-semibold font-mono">NPR {h.buyRatePerGram}</td>
                      <td className="text-sm font-mono">NPR {h.buybackRatePerGram}</td>
                      <td className="text-sm font-mono">NPR {(h.buyRatePerGram * 10).toFixed(2)}</td>
                      <td className="text-sm text-[#8c9097]">{h.updatedBy || 'Admin'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
