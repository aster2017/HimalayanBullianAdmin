'use client'
import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { getAuthHeaders } from '@/shared/services/apiConfig';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://hbc-api.semis.app/api';

export default function ApprovalsPage() {
  useProtectedRoute();
  const [pending, setPending] = useState<any[]>([]);
  const [unverified, setUnverified] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string|null>(null);
  const [rejectTarget, setRejectTarget] = useState<{id:string, name:string}|null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/customers/pending-approval`, { headers: getAuthHeaders() });
      const d = await r.json();
      setPending(d.pending || []);
      setUnverified(d.unverified || []);
    } catch { toast.error('Failed to load'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const approve = async (id: string) => {
    setActing(id);
    try {
      const r = await fetch(`${API}/customers/${id}/approve`, { method: 'POST', headers: getAuthHeaders() });
      const d = await r.json();
      if (d.success) { toast.success(d.message); load(); }
      else toast.error(d.message || 'Failed');
    } finally { setActing(null); }
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    setActing(rejectTarget.id);
    try {
      const r = await fetch(`${API}/customers/${rejectTarget.id}/reject`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason })
      });
      const d = await r.json();
      if (d.success) { toast.success(d.message); load(); }
      else toast.error(d.message || 'Failed');
    } finally { setActing(null); setRejectTarget(null); setRejectReason(''); }
  };

  return (
    <div className="page-content">
      <div className="container-fluid">
        <div className="md:flex items-center justify-between my-[1.5rem]">
          <div>
            <p className="font-semibold text-[1.125rem] text-defaulttextcolor !mb-0">Customer Approvals</p>
            <p className="font-normal text-[#8c9097] text-[0.813rem]">Review and approve new customer accounts.</p>
          </div>
          <button onClick={load} className="ti-btn ti-btn-primary-full !text-white mt-2 md:mt-0">
            <i className="ri-refresh-line me-2"></i>Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="box bg-yellow-500/10 border-l-4 border-yellow-500 p-5 rounded-lg shadow-sm">
            <p className="text-gray-500 text-sm">Pending Approval</p>
            <h3 className="text-3xl font-bold mt-1">{pending.length}</h3>
            <p className="text-xs text-gray-400 mt-1">Email verified, awaiting admin approval</p>
          </div>
          <div className="box bg-gray-500/10 border-l-4 border-gray-400 p-5 rounded-lg shadow-sm">
            <p className="text-gray-500 text-sm">Unverified Email</p>
            <h3 className="text-3xl font-bold mt-1">{unverified.length}</h3>
            <p className="text-xs text-gray-400 mt-1">Static OTP: <strong>123456</strong></p>
          </div>
          <div className="box bg-green-500/10 border-l-4 border-green-500 p-5 rounded-lg shadow-sm">
            <p className="text-gray-500 text-sm">Action Required</p>
            <h3 className="text-3xl font-bold mt-1">{pending.length}</h3>
            <p className="text-xs text-gray-400 mt-1">Approve or reject below</p>
          </div>
        </div>

        {/* Pending */}
        <div className="box shadow-sm mb-6">
          <div className="box-header border-b p-4 flex items-center justify-between">
            <h5 className="box-title mb-0">Pending Approval <span className="badge bg-warning/20 text-warning ms-2">{pending.length}</span></h5>
          </div>
          <div className="table-responsive">
            <table className="ti-custom-table ti-striped-table">
              <thead><tr><th>Customer</th><th>Phone</th><th>City</th><th>Source</th><th>Signed Up</th><th>Zoho</th><th>Actions</th></tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-10"><div className="animate-spin ri-loader-4-line text-2xl inline-block"></div></td></tr>
                ) : pending.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-gray-500">
                    <i className="ri-checkbox-circle-line text-4xl block mb-2 text-green-500 opacity-60"></i>
                    All caught up — no pending approvals
                  </td></tr>
                ) : pending.map((c: any) => (
                  <tr key={c.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-full bg-yellow-500 text-white flex items-center justify-center text-sm font-bold shrink-0">{c.fullName?.charAt(0)}</div>
                        <div>
                          <Link href={`/customers/${c.id}`} className="font-semibold text-sm text-primary hover:underline">{c.fullName}</Link>
                          <p className="text-xs text-gray-400">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-sm text-gray-500">{c.phoneNumber || '-'}</td>
                    <td className="text-sm text-gray-500">{c.city || '-'}</td>
                    <td><span className="badge bg-blue-500/10 text-blue-700 px-2 py-1 rounded text-xs">{c.signupSource || 'App'}</span></td>
                    <td className="text-sm text-gray-500">{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td>
                      {c.isZohoLinked
                        ? <span className="text-green-600 text-xs">✓ Linked</span>
                        : <span className="text-orange-500 text-xs">⚠ Pending</span>}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button disabled={acting === c.id} onClick={() => approve(c.id)}
                          className="ti-btn ti-btn-success !text-white !bg-success !opacity-100 !py-1 !px-3 text-xs">
                          {acting === c.id ? '…' : 'Approve'}
                        </button>
                        <button disabled={acting === c.id} onClick={() => setRejectTarget({ id: c.id, name: c.fullName })}
                          className="ti-btn ti-btn-danger !text-white !bg-danger !opacity-100 !py-1 !px-3 text-xs">
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Unverified */}
        {unverified.length > 0 && (
          <div className="box shadow-sm">
            <div className="box-header border-b p-4">
              <h5 className="box-title mb-0">Unverified Email <span className="badge bg-secondary/20 text-secondary ms-2">{unverified.length}</span></h5>
              <p className="text-xs text-gray-400 mt-1">These users signed up but haven't verified email. They should enter OTP <strong>123456</strong>.</p>
            </div>
            <div className="table-responsive">
              <table className="ti-custom-table ti-striped-table">
                <thead><tr><th>Name</th><th>Email</th><th>Source</th><th>Signed Up</th><th></th></tr></thead>
                <tbody>
                  {unverified.map((c: any) => (
                    <tr key={c.id}>
                      <td className="font-semibold text-sm">{c.fullName}</td>
                      <td className="text-sm text-gray-500">{c.email}</td>
                      <td><span className="badge bg-gray-500/10 text-gray-600 px-2 py-1 rounded text-xs">{c.signupSource || 'App'}</span></td>
                      <td className="text-sm text-gray-500">{new Date(c.createdAt).toLocaleDateString()}</td>
                      <td><Link href={`/customers/${c.id}`} className="text-primary text-xs hover:underline">View</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Reject with reason modal */}
      {rejectTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-lg">
            <h3 className="text-lg font-semibold mb-1">Reject Account</h3>
            <p className="text-gray-600 text-sm mb-4">Rejecting <strong>{rejectTarget.name}</strong>. They will be notified by email.</p>
            <textarea className="form-control mb-4" rows={3} placeholder="Reason (optional — included in rejection email)"
              value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setRejectTarget(null); setRejectReason(''); }} className="btn btn-outline-secondary">Cancel</button>
              <button onClick={confirmReject} className="btn btn-danger !text-white !bg-danger !opacity-100">Confirm Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
