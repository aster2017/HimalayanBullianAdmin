'use client';

import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { getAuthHeaders } from '@/shared/services/apiConfig';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://hbc-api.semis.app/api';

type StaffUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phoneNumber?: string | null;
  isActive: boolean;
  createdAt: string;
  roles: string[];
};

type Role = { id: string; name: string; isActive: boolean; isSystemRole: boolean };

export default function StaffUsersPage() {
  useProtectedRoute();
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(50);
  const [editing, setEditing] = useState<StaffUser | null>(null);
  const [newRoleVal, setNewRoleVal] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (roleFilter) params.set('role', roleFilter);
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      const r = await fetch(`${API}/admin/users?${params}`, { headers: getAuthHeaders() });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.message || 'failed');
      setUsers(d?.data || []);
      setTotal(d?.total || 0);
    } catch (e: any) { toast.error(e?.message || 'Failed to load users'); }
    finally { setLoading(false); }
  };

  const loadRoles = async () => {
    try {
      const r = await fetch(`${API}/admin/roles`, { headers: getAuthHeaders() });
      const d = await r.json();
      if (r.ok) setRoles((d?.data || []).filter((x: Role) => x.isActive));
    } catch {}
  };

  useEffect(() => { loadRoles(); }, []);
  useEffect(() => { load(); }, [page, roleFilter]);

  const openEdit = (u: StaffUser) => {
    setEditing(u);
    setNewRoleVal(u.roles[0] || '');
  };

  const saveRole = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const r = await fetch(`${API}/admin/users/${editing.id}/role`, {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRoleVal }),
      });
      const d = await r.json();
      if (!r.ok || d?.success === false) toast.error(d?.message || 'Failed');
      else { toast.success(`${editing.fullName}: ${newRoleVal || 'no role'}`); setEditing(null); load(); }
    } finally { setSaving(false); }
  };

  const toggleActive = async (u: StaffUser) => {
    try {
      const r = await fetch(`${API}/admin/users/${u.id}/active`, {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !u.isActive }),
      });
      const d = await r.json();
      if (!r.ok || d?.success === false) toast.error(d?.message || 'Failed');
      else { toast.success(`${u.fullName}: ${!u.isActive ? 'enabled' : 'disabled'}`); load(); }
    } catch { toast.error('Failed'); }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <Fragment>
      <div className="md:flex items-center justify-between my-[1.5rem]">
        <div>
          <p className="font-semibold text-[1.125rem] !mb-0">Staff Users</p>
          <p className="text-[0.813rem] text-[#8c9097]">
            Manage role assignments for admin and operations users.
            <Link href="/access/roles" className="text-primary ms-2">Edit role permissions →</Link>
          </p>
        </div>
      </div>

      <div className="box">
        <div className="box-header">
          <div className="flex flex-wrap gap-2 items-end w-full">
            <div className="flex-1 min-w-[200px]">
              <label className="form-label text-xs">Search</label>
              <input
                className="form-control"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { setPage(1); load(); } }}
                placeholder="Name or email…"
              />
            </div>
            <div className="min-w-[160px]">
              <label className="form-label text-xs">Filter by role</label>
              <select className="form-select" value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}>
                <option value="">All staff roles</option>
                {roles.filter(r => r.name !== 'Customer').map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
              </select>
            </div>
            <button onClick={() => { setPage(1); load(); }} className="ti-btn ti-btn-light !opacity-100">
              <i className="ri-search-line me-1"></i>Search
            </button>
          </div>
        </div>
        <div className="box-body">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary inline-block"></div>
            </div>
          ) : users.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">No staff users match your filter.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="table w-full">
                  <thead>
                    <tr className="text-xs text-gray-500 uppercase">
                      <th className="text-left p-2">Name</th>
                      <th className="text-left p-2">Email</th>
                      <th className="text-left p-2">Phone</th>
                      <th className="text-left p-2">Role</th>
                      <th className="text-center p-2">Status</th>
                      <th className="text-right p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} className="border-t">
                        <td className="p-2 font-semibold">{u.fullName}</td>
                        <td className="p-2 text-sm font-mono">{u.email}</td>
                        <td className="p-2 text-sm font-mono">{u.phoneNumber || '—'}</td>
                        <td className="p-2">
                          {u.roles.length === 0
                            ? <span className="badge bg-danger/20 text-danger text-[10px] px-2 py-0.5 rounded">NO ROLE</span>
                            : u.roles.map(r => <span key={r} className="badge bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded me-1">{r}</span>)}
                        </td>
                        <td className="p-2 text-center">
                          <span className={`badge ${u.isActive ? 'bg-success/20 text-success' : 'bg-gray-400/20 text-gray-500'} text-[10px] px-2 py-0.5 rounded`}>
                            {u.isActive ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td className="p-2 text-right space-x-1">
                          <button onClick={() => openEdit(u)} className="ti-btn ti-btn-light ti-btn-sm !opacity-100" title="Change role">
                            <i className="ri-shield-user-line"></i>
                          </button>
                          <button onClick={() => toggleActive(u)} className="ti-btn ti-btn-light ti-btn-sm !opacity-100" title={u.isActive ? 'Disable login' : 'Enable login'}>
                            <i className={`ri-${u.isActive ? 'lock' : 'lock-unlock'}-line`}></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 text-sm">
                  <span className="text-gray-500">Page {page} of {totalPages} · {total} user(s)</span>
                  <div className="flex gap-2">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="ti-btn ti-btn-light ti-btn-sm !opacity-100 disabled:!opacity-30">
                      ← Prev
                    </button>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="ti-btn ti-btn-light ti-btn-sm !opacity-100 disabled:!opacity-30">
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Role assignment modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Assign role</h3>
                <p className="text-xs text-gray-500">{editing.fullName} · {editing.email}</p>
              </div>
              <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-700"><i className="ri-close-line text-xl"></i></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="form-label">Role</label>
                <select className="form-select" value={newRoleVal} onChange={e => setNewRoleVal(e.target.value)}>
                  <option value="">— No role (lock out) —</option>
                  {roles.filter(r => r.name !== 'Customer').map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Replaces any existing role. The user keeps the new role's permissions on next login.
                </p>
              </div>
              {newRoleVal === '' && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-800">
                  <i className="ri-alert-line me-1"></i>
                  No role = the user cannot reach any policy-protected endpoint. They can still log in but every admin action will 403.
                </div>
              )}
            </div>
            <div className="p-5 border-t flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="btn btn-outline-secondary">Cancel</button>
              <button onClick={saveRole} disabled={saving} className="ti-btn ti-btn-primary-full !text-white !opacity-100 disabled:!opacity-50">
                {saving ? <><i className="ri-loader-4-line animate-spin me-1"></i>Saving…</> : 'Assign role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  );
}
