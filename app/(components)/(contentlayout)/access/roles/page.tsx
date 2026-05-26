'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { getAuthHeaders } from '@/shared/services/apiConfig';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://hbc-api.semis.app/api';

type Role = {
  id: string;
  name: string;
  description?: string | null;
  priority: number;
  isSystemRole: boolean;
  isActive: boolean;
  userCount: number;
  permissionCount: number;
  createdAt: string;
};

type RoleDetail = Role & { permissions: string[] };

type PermissionGroup = {
  category: string;
  permissions: { id: string; name: string; displayName: string }[];
};

export default function RolesPage() {
  useProtectedRoute();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permGroups, setPermGroups] = useState<PermissionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<RoleDetail | null>(null);
  const [savingPerms, setSavingPerms] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', description: '', priority: 50 });
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [rolesR, permsR] = await Promise.all([
        fetch(`${API}/admin/roles`, { headers: getAuthHeaders() }),
        fetch(`${API}/admin/permissions`, { headers: getAuthHeaders() }),
      ]);
      const rolesD = await rolesR.json();
      const permsD = await permsR.json();
      if (!rolesR.ok) throw new Error(rolesD?.message || 'roles failed');
      if (!permsR.ok) throw new Error(permsD?.message || 'perms failed');
      setRoles(rolesD?.data || []);
      setPermGroups(permsD?.data || []);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load roles');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openEdit = async (id: string) => {
    try {
      const r = await fetch(`${API}/admin/roles/${id}`, { headers: getAuthHeaders() });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.message || 'failed');
      setEditing(d.data);
    } catch (e: any) { toast.error(e?.message || 'Failed to load role'); }
  };

  const togglePerm = (name: string) => {
    if (!editing) return;
    const has = editing.permissions.includes(name);
    setEditing({
      ...editing,
      permissions: has ? editing.permissions.filter(p => p !== name) : [...editing.permissions, name],
    });
  };

  const toggleCategory = (group: PermissionGroup, on: boolean) => {
    if (!editing) return;
    const names = group.permissions.map(p => p.name);
    const next = on
      ? Array.from(new Set([...editing.permissions, ...names]))
      : editing.permissions.filter(p => !names.includes(p));
    setEditing({ ...editing, permissions: next });
  };

  const savePerms = async () => {
    if (!editing) return;
    setSavingPerms(true);
    try {
      const r = await fetch(`${API}/admin/roles/${editing.id}/permissions`, {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: editing.permissions }),
      });
      const d = await r.json();
      if (!r.ok || d?.success === false) toast.error(d?.message || 'Failed');
      else { toast.success(`Permissions updated (+${d.added}/−${d.removed})`); setEditing(null); load(); }
    } finally { setSavingPerms(false); }
  };

  const createRole = async () => {
    if (!newRole.name.trim()) { toast.error('Name required'); return; }
    setCreating(true);
    try {
      const r = await fetch(`${API}/admin/roles`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(newRole),
      });
      const d = await r.json();
      if (!r.ok || d?.success === false) toast.error(d?.message || 'Failed');
      else { toast.success(`Role '${newRole.name}' created`); setCreateOpen(false); setNewRole({ name: '', description: '', priority: 50 }); load(); }
    } finally { setCreating(false); }
  };

  const deleteRole = async (role: Role) => {
    if (!confirm(`Delete role "${role.name}"? This cannot be undone.`)) return;
    try {
      const r = await fetch(`${API}/admin/roles/${role.id}`, { method: 'DELETE', headers: getAuthHeaders() });
      const d = await r.json();
      if (!r.ok || d?.success === false) toast.error(d?.message || 'Failed');
      else { toast.success(`Role '${role.name}' deleted`); load(); }
    } catch { toast.error('Delete failed'); }
  };

  const toggleActive = async (role: Role) => {
    try {
      const r = await fetch(`${API}/admin/roles/${role.id}`, {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !role.isActive }),
      });
      const d = await r.json();
      if (!r.ok || d?.success === false) toast.error(d?.message || 'Failed');
      else { toast.success(`${role.name}: ${!role.isActive ? 'active' : 'inactive'}`); load(); }
    } catch { toast.error('Failed'); }
  };

  const allPermNames = useMemo(() => permGroups.flatMap(g => g.permissions.map(p => p.name)), [permGroups]);

  return (
    <Fragment>
      <div className="md:flex items-center justify-between my-[1.5rem]">
        <div>
          <p className="font-semibold text-[1.125rem] !mb-0">Roles &amp; Permissions</p>
          <p className="text-[0.813rem] text-[#8c9097]">
            Define what each staff role can do.
            <Link href="/access/users" className="text-primary ms-2">Assign roles to users →</Link>
          </p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="ti-btn ti-btn-primary-full !text-white !opacity-100 mt-2 md:mt-0">
          <i className="ri-add-line me-1"></i>New Role
        </button>
      </div>

      <div className="box">
        <div className="box-body">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary inline-block"></div>
            </div>
          ) : roles.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">No roles. Seed should have created the defaults.</p>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="table w-full min-w-[480px] sm:min-w-0">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase">
                    <th className="text-left p-2">Role</th>
                    <th className="text-left p-2 hidden md:table-cell">Description</th>
                    <th className="text-right p-2 hidden lg:table-cell">Priority</th>
                    <th className="text-right p-2 hidden sm:table-cell">Users</th>
                    <th className="text-right p-2 hidden md:table-cell">Permissions</th>
                    <th className="text-center p-2 hidden sm:table-cell">Status</th>
                    <th className="text-right p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map(r => (
                    <tr key={r.id} className="border-t">
                      <td className="p-2">
                        <div className="font-semibold">{r.name}</div>
                        {r.isSystemRole && <span className="text-[10px] text-gray-500"><i className="ri-lock-line"></i> System role</span>}
                        {/* Mobile-only meta strip: users · permissions · status */}
                        <div className="md:hidden text-[0.7rem] text-gray-500 mt-1">
                          <span className="me-2">{r.userCount} user{r.userCount === 1 ? '' : 's'}</span>
                          <span className="me-2">·</span>
                          <span>{r.permissionCount} perms</span>
                        </div>
                        <div className="sm:hidden mt-1">
                          <span className={`badge ${r.isActive ? 'bg-success/20 text-success' : 'bg-gray-400/20 text-gray-500'} text-[10px] px-2 py-0.5 rounded`}>
                            {r.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>
                      <td className="p-2 text-sm text-gray-600 hidden md:table-cell">{r.description || '—'}</td>
                      <td className="p-2 text-right font-mono text-sm hidden lg:table-cell">{r.priority}</td>
                      <td className="p-2 text-right font-mono hidden sm:table-cell">{r.userCount}</td>
                      <td className="p-2 text-right font-mono hidden md:table-cell">{r.permissionCount}</td>
                      <td className="p-2 text-center hidden sm:table-cell">
                        <span className={`badge ${r.isActive ? 'bg-success/20 text-success' : 'bg-gray-400/20 text-gray-500'} text-[10px] px-2 py-0.5 rounded`}>
                          {r.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-2 text-right space-x-1">
                        <button onClick={() => openEdit(r.id)} className="ti-btn ti-btn-light ti-btn-sm !opacity-100" title="Edit permissions">
                          <i className="ri-shield-keyhole-line"></i>
                        </button>
                        {!r.isSystemRole && (
                          <button onClick={() => toggleActive(r)} className="ti-btn ti-btn-light ti-btn-sm !opacity-100" title="Toggle active">
                            <i className={`ri-${r.isActive ? 'pause' : 'play'}-line`}></i>
                          </button>
                        )}
                        {!r.isSystemRole && (
                          <button
                            onClick={() => deleteRole(r)}
                            disabled={r.userCount > 0}
                            className="ti-btn ti-btn-danger-light ti-btn-sm !opacity-100 disabled:!opacity-30"
                            title={r.userCount > 0 ? `Cannot delete — ${r.userCount} user(s) assigned` : 'Delete role'}
                          >
                            <i className="ri-delete-bin-line"></i>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create role modal */}
      {createOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold">Create role</h3>
              <button onClick={() => setCreateOpen(false)} className="text-gray-400 hover:text-gray-700"><i className="ri-close-line text-xl"></i></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="form-label">Name *</label>
                <input className="form-control" value={newRole.name} onChange={e => setNewRole({ ...newRole, name: e.target.value })} placeholder="e.g. Cashier" />
              </div>
              <div>
                <label className="form-label">Description</label>
                <input className="form-control" value={newRole.description} onChange={e => setNewRole({ ...newRole, description: e.target.value })} />
              </div>
              <div>
                <label className="form-label">Priority (lower = higher in lists)</label>
                <input type="number" className="form-control font-mono" value={newRole.priority} onChange={e => setNewRole({ ...newRole, priority: Number(e.target.value) || 0 })} />
              </div>
              <p className="text-xs text-gray-500">After creating, click the permissions icon to grant capabilities.</p>
            </div>
            <div className="p-5 border-t flex justify-end gap-2">
              <button onClick={() => setCreateOpen(false)} className="btn btn-outline-secondary">Cancel</button>
              <button onClick={createRole} disabled={creating || !newRole.name.trim()} className="ti-btn ti-btn-primary-full !text-white !opacity-100 disabled:!opacity-50">
                {creating ? <><i className="ri-loader-4-line animate-spin me-1"></i>Creating…</> : 'Create role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit permissions modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col" style={{ maxHeight: '90vh' }}>
            <div className="p-5 border-b flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Permissions for <span className="text-primary">{editing.name}</span></h3>
                <p className="text-xs text-gray-500">
                  {editing.permissions.length} of {allPermNames.length} permissions granted
                  {editing.userCount > 0 && ` · ${editing.userCount} user(s) currently in this role`}
                </p>
              </div>
              <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-700"><i className="ri-close-line text-xl"></i></button>
            </div>
            <div className="p-5 overflow-auto space-y-5">
              {permGroups.map(group => {
                const granted = group.permissions.filter(p => editing.permissions.includes(p.name)).length;
                const all = group.permissions.length;
                const allOn = granted === all;
                return (
                  <div key={group.category}>
                    <div className="flex items-center justify-between mb-2">
                      <h6 className="font-semibold text-sm">{group.category} <span className="text-gray-400 font-normal">({granted}/{all})</span></h6>
                      <button onClick={() => toggleCategory(group, !allOn)} className="text-xs text-primary hover:underline">
                        {allOn ? 'Clear all' : 'Select all'}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {group.permissions.map(p => {
                        const on = editing.permissions.includes(p.name);
                        return (
                          <label key={p.id} className={`flex items-center gap-2 p-2 rounded border text-sm cursor-pointer ${on ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-400'}`}>
                            <input type="checkbox" checked={on} onChange={() => togglePerm(p.name)} />
                            <span className="flex-1">
                              <span className="block">{p.displayName}</span>
                              <span className="block text-[10px] text-gray-400 font-mono">{p.name}</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-5 border-t flex justify-between items-center gap-2">
              <div className="text-xs text-gray-500">
                <i className="ri-information-line me-1"></i>
                Changes take effect at next login (JWT is re-issued on token refresh).
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditing(null)} className="btn btn-outline-secondary">Cancel</button>
                <button onClick={savePerms} disabled={savingPerms} className="ti-btn ti-btn-primary-full !text-white !opacity-100 disabled:!opacity-50">
                  {savingPerms ? <><i className="ri-loader-4-line animate-spin me-1"></i>Saving…</> : 'Save permissions'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  );
}
