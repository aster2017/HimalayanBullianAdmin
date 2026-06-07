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

// Hash-seeded avatar color for roles
const ROLE_COLORS = ['#C8A86B','#2563eb','#7c3aed','#059669','#dc2626','#d97706','#0891b2','#4f46e5'];
function roleColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return ROLE_COLORS[h % ROLE_COLORS.length];
}
function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

// Per-module icon + color for the permissions modal
const MODULE_META: Record<string, { icon: string; color: string; bg: string }> = {
  AuditLogs:   { icon: 'ri-shield-check-line',   color: '#7c3aed', bg: '#ede9fe' },
  Customers:   { icon: 'ri-user-3-line',          color: '#2563eb', bg: '#dbeafe' },
  Dashboard:   { icon: 'ri-dashboard-line',       color: '#059669', bg: '#d1fae5' },
  Invoices:    { icon: 'ri-file-text-line',       color: '#C8A86B', bg: '#fdf8ee' },
  Items:       { icon: 'ri-price-tag-3-line',     color: '#d97706', bg: '#fef3c7' },
  Orders:      { icon: 'ri-shopping-cart-2-line', color: '#0891b2', bg: '#e0f2fe' },
  Payments:    { icon: 'ri-bank-card-line',       color: '#dc2626', bg: '#fee2e2' },
  Reports:     { icon: 'ri-bar-chart-2-line',     color: '#4f46e5', bg: '#eef2ff' },
  Roles:       { icon: 'ri-shield-user-line',     color: '#9d174d', bg: '#fce7f3' },
  Targets:     { icon: 'ri-focus-3-line',         color: '#065f46', bg: '#dcfce7' },
  Users:       { icon: 'ri-team-line',            color: '#c2410c', bg: '#fff7ed' },
  Collections: { icon: 'ri-archive-line',         color: '#0891b2', bg: '#e0f2fe' },
  Delivery:    { icon: 'ri-truck-line',           color: '#d97706', bg: '#fef3c7' },
  Buybacks:    { icon: 'ri-arrow-go-back-line',   color: '#059669', bg: '#d1fae5' },
  Approvals:   { icon: 'ri-checkbox-circle-line', color: '#7c3aed', bg: '#ede9fe' },
  Addresses:   { icon: 'ri-map-pin-line',         color: '#0891b2', bg: '#e0f2fe' },
  Notifications:{ icon: 'ri-notification-line',  color: '#d97706', bg: '#fef3c7' },
  Products:    { icon: 'ri-store-line',           color: '#059669', bg: '#d1fae5' },
};
function moduleMeta(cat: string) {
  return MODULE_META[cat] ?? { icon: 'ri-apps-2-line', color: '#64748b', bg: '#f1f5f9' };
}

const SKELETON_ROWS = Array.from({ length: 5 });

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
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [permSearch, setPermSearch] = useState('');

  const stats = useMemo(() => ({
    total: roles.length,
    system: roles.filter(r => r.isSystemRole).length,
    custom: roles.filter(r => !r.isSystemRole).length,
    users: roles.reduce((sum, r) => sum + r.userCount, 0),
  }), [roles]);

  const visibleRoles = useMemo(() => {
    const q = search.trim().toLowerCase();
    return roles.filter(r => {
      if (q && !r.name.toLowerCase().includes(q) && !(r.description || '').toLowerCase().includes(q)) return false;
      if (statusFilter === 'active' && !r.isActive) return false;
      if (statusFilter === 'inactive' && r.isActive) return false;
      if (statusFilter === 'system' && !r.isSystemRole) return false;
      if (statusFilter === 'custom' && r.isSystemRole) return false;
      return true;
    });
  }, [roles, search, statusFilter]);

  const filteredGroups = useMemo(() => {
    if (!permSearch.trim()) return permGroups;
    const q = permSearch.trim().toLowerCase();
    return permGroups
      .map(g => ({
        ...g,
        permissions: g.permissions.filter(p =>
          p.displayName.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)
        ),
      }))
      .filter(g => g.permissions.length > 0);
  }, [permGroups, permSearch]);

  const allPermNames = useMemo(() => permGroups.flatMap(g => g.permissions.map(p => p.name)), [permGroups]);

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
      setPermSearch('');
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
      else {
        toast.success(`Role '${newRole.name}' created`);
        setCreateOpen(false);
        setNewRole({ name: '', description: '', priority: 50 });
        load();
      }
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

  return (
    <Fragment>
      {/* Page header */}
      <div className="my-[1.5rem] flex items-center gap-3">
        <div
          className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,#C8A86B 0%,#a8863d 100%)' }}
        >
          <i className="ri-shield-user-line text-white text-lg" />
        </div>
        <div>
          <p className="font-semibold text-[1.125rem] !mb-0">Roles &amp; Permissions</p>
          <p className="text-[0.813rem] text-[#8c9097]">
            Define what each staff role can do.{' '}
            <Link href="/access/users" className="text-primary">Assign roles to users →</Link>
          </p>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        {[
          { label: 'Total Roles',    value: stats.total,  icon: 'ri-shield-line',    color: '#2563eb', bg: '#dbeafe' },
          { label: 'System Roles',   value: stats.system, icon: 'ri-lock-line',       color: '#7c3aed', bg: '#ede9fe' },
          { label: 'Custom Roles',   value: stats.custom, icon: 'ri-add-circle-line', color: '#059669', bg: '#d1fae5' },
          { label: 'Users Enrolled', value: stats.users,  icon: 'ri-team-line',       color: '#C8A86B', bg: '#fdf8ee' },
        ].map(t => (
          <div
            key={t.label}
            className="box p-4 flex items-center gap-3"
            style={{ borderLeft: `3px solid ${t.color}` }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: t.bg }}
            >
              <i className={`${t.icon} text-base`} style={{ color: t.color }} />
            </div>
            <div>
              <p className="text-[1.125rem] font-bold leading-tight">{t.value.toLocaleString()}</p>
              <p className="text-[11px] text-[#8c9097]">{t.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="box mb-4">
        <div className="box-body flex flex-nowrap gap-2 overflow-x-auto items-center">
          <div className="relative flex-1 min-w-[160px]">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-[#8c9097] text-sm pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search roles…"
              className="form-control pl-8"
            />
          </div>
          <select
            className="form-select !w-auto flex-shrink-0"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">All types</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="system">System only</option>
            <option value="custom">Custom only</option>
          </select>
          <button
            onClick={() => setCreateOpen(true)}
            className="px-3 py-2 text-[0.813rem] font-medium rounded-md text-white flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap"
            style={{ background: 'linear-gradient(135deg,#C8A86B 0%,#a8863d 100%)' }}
          >
            <i className="ri-add-line" />New Role
          </button>
        </div>
      </div>

      {/* Roles table */}
      <div className="box">
        <div className="overflow-x-auto w-full">
          {loading ? (
            <table className="ti-custom-table ti-custom-table-hover w-full">
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Role','Description','Users','Permissions','Status','Actions'].map((h, i) => (
                    <th key={i} className="py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SKELETON_ROWS.map((_, i) => (
                  <tr key={i} className="border-t border-[var(--defaultborder)]">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg animate-pulse bg-[#f1f5f9] flex-shrink-0" />
                        <div className="h-3 w-24 rounded animate-pulse bg-[#f1f5f9]" />
                      </div>
                    </td>
                    <td className="py-3 px-4"><div className="h-3 w-40 rounded animate-pulse bg-[#f1f5f9]" /></td>
                    <td className="py-3 px-4"><div className="h-5 w-10 rounded-full animate-pulse bg-[#f1f5f9]" /></td>
                    <td className="py-3 px-4"><div className="h-3 w-14 rounded animate-pulse bg-[#f1f5f9]" /></td>
                    <td className="py-3 px-4"><div className="h-5 w-14 rounded-full animate-pulse bg-[#f1f5f9]" /></td>
                    <td className="py-3 px-4"><div className="h-7 w-28 rounded-md animate-pulse bg-[#f1f5f9] ml-auto" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : visibleRoles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: '#f8fafc' }}>
                <i className="ri-shield-user-line text-3xl" style={{ color: '#C8A86B' }} />
              </div>
              <p className="font-semibold text-[#374151] mb-1">No roles found</p>
              <p className="text-[0.813rem] text-[#8c9097]">
                {search ? `No roles match "${search}"` : 'No roles. Create one to get started.'}
              </p>
            </div>
          ) : (
            <table className="ti-custom-table ti-custom-table-hover w-full">
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">Role</th>
                  <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-wide text-[#64748b] hidden md:table-cell">Description</th>
                  <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-wide text-[#64748b] hidden sm:table-cell">Users</th>
                  <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-wide text-[#64748b] hidden md:table-cell">Permissions</th>
                  <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-wide text-[#64748b] hidden sm:table-cell">Status</th>
                  <th className="py-3 px-4 text-right text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleRoles.map(r => {
                  const color = roleColor(r.name);
                  return (
                    <tr key={r.id} className="border-t border-[var(--defaultborder)]">
                      {/* Role avatar + name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0 font-bold"
                            style={{ background: color, fontSize: '11px' }}
                          >
                            {initials(r.name)}
                          </div>
                          <div>
                            <p className="text-[0.813rem] font-semibold leading-tight">{r.name}</p>
                            {r.isSystemRole && (
                              <p className="text-[10px] text-[#8c9097] flex items-center gap-0.5 mt-0.5">
                                <i className="ri-lock-line" />System role
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      {/* Description */}
                      <td className="py-3 px-4 text-[0.813rem] text-[#64748b] hidden md:table-cell max-w-[220px]">
                        <span className="line-clamp-1">{r.description || <span className="text-[#8c9097]">—</span>}</span>
                      </td>
                      {/* Users badge */}
                      <td className="py-3 px-4 hidden sm:table-cell">
                        <span
                          className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: '#dbeafe', color: '#1d4ed8' }}
                        >
                          {r.userCount.toLocaleString()}
                        </span>
                      </td>
                      {/* Permissions count */}
                      <td className="py-3 px-4 hidden md:table-cell">
                        <span className="text-[0.813rem] font-semibold font-mono" style={{ color: '#C8A86B' }}>
                          {r.permissionCount}
                        </span>
                        <span className="text-[0.75rem] text-[#8c9097]"> / {allPermNames.length}</span>
                      </td>
                      {/* Status pill */}
                      <td className="py-3 px-4 hidden sm:table-cell">
                        <span
                          className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                          style={r.isActive
                            ? { background: '#dcfce7', color: '#15803d' }
                            : { background: '#f1f5f9', color: '#475569' }}
                        >
                          {r.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      {/* Actions */}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(r.id)}
                            title="Edit permissions"
                            className="px-2.5 py-1.5 rounded-md text-[0.75rem] font-medium flex items-center gap-1"
                            style={{ border: '1px solid #e2e8f0', color: '#64748b', background: '#f8fafc' }}
                          >
                            <i className="ri-shield-keyhole-line text-sm" />
                            <span className="hidden lg:inline">Permissions</span>
                          </button>
                          {!r.isSystemRole && (
                            <button
                              onClick={() => toggleActive(r)}
                              title={r.isActive ? 'Deactivate' : 'Activate'}
                              className="px-2 py-1.5 rounded-md text-[0.813rem]"
                              style={{ border: '1px solid #e2e8f0', color: '#64748b', background: '#f8fafc' }}
                            >
                              <i className={`ri-${r.isActive ? 'pause' : 'play'}-line`} />
                            </button>
                          )}
                          {r.isSystemRole ? (
                            <span
                              className="px-2 py-1.5 rounded-md text-[0.813rem] text-[#8c9097] cursor-default"
                              title="System roles cannot be deleted"
                            >
                              <i className="ri-lock-line" />
                            </span>
                          ) : (
                            <button
                              onClick={() => deleteRole(r)}
                              disabled={r.userCount > 0}
                              title={r.userCount > 0 ? `Cannot delete — ${r.userCount} user(s) assigned` : 'Delete role'}
                              className="px-2 py-1.5 rounded-md text-[0.813rem] disabled:opacity-30"
                              style={{ border: '1px solid #fee2e2', color: '#dc2626', background: '#fff5f5' }}
                            >
                              <i className="ri-delete-bin-line" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Create Role Modal ── */}
      {createOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Gold header */}
            <div
              className="px-5 py-4 flex items-center justify-between"
              style={{ background: 'linear-gradient(135deg,#C8A86B 0%,#a8863d 100%)' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <i className="ri-add-circle-line text-white text-lg" />
                </div>
                <h3 className="text-white font-bold text-base">Create New Role</h3>
              </div>
              <button
                onClick={() => setCreateOpen(false)}
                className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30"
              >
                <i className="ri-close-line" />
              </button>
            </div>
            {/* Body */}
            <div className="p-5 space-y-4">
              <div>
                <label className="form-label text-[0.813rem] font-semibold">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  className="form-control"
                  value={newRole.name}
                  onChange={e => setNewRole({ ...newRole, name: e.target.value })}
                  placeholder="e.g. Cashier"
                />
              </div>
              <div>
                <label className="form-label text-[0.813rem] font-semibold">Description</label>
                <input
                  className="form-control"
                  value={newRole.description}
                  onChange={e => setNewRole({ ...newRole, description: e.target.value })}
                  placeholder="Brief description of this role's purpose"
                />
              </div>
              <div>
                <label className="form-label text-[0.813rem] font-semibold">Priority</label>
                <input
                  type="number"
                  className="form-control font-mono"
                  value={newRole.priority}
                  onChange={e => setNewRole({ ...newRole, priority: Number(e.target.value) || 0 })}
                />
                <p className="text-[11px] text-[#8c9097] mt-1">Lower number = higher priority in lists</p>
              </div>
              <div
                className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-[0.75rem]"
                style={{ background: '#fdf8ee', border: '1px solid #fde68a', color: '#92400e' }}
              >
                <i className="ri-information-line mt-0.5 flex-shrink-0" />
                After creating, click the Permissions button to grant capabilities.
              </div>
            </div>
            {/* Footer */}
            <div
              className="px-5 py-4 flex justify-end gap-2"
              style={{ borderTop: '1px solid var(--defaultborder)' }}
            >
              <button
                onClick={() => setCreateOpen(false)}
                className="px-4 py-2 text-[0.813rem] font-medium rounded-md"
                style={{ border: '1px solid #e2e8f0', color: '#64748b', background: '#f8fafc' }}
              >
                Cancel
              </button>
              <button
                onClick={createRole}
                disabled={creating || !newRole.name.trim()}
                className="px-4 py-2 text-[0.813rem] font-medium rounded-md text-white flex items-center gap-1.5 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#C8A86B 0%,#a8863d 100%)' }}
              >
                {creating
                  ? <><i className="ri-loader-4-line animate-spin" />Creating…</>
                  : <><i className="ri-check-line" />Create Role</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Permissions Modal ── */}
      {editing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden"
            style={{ maxHeight: '90vh' }}
          >
            {/* Gold gradient header */}
            <div
              className="px-5 py-4 flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#C8A86B 0%,#a8863d 100%)' }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                    <i className="ri-shield-keyhole-line text-white text-lg" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-base leading-tight">
                      Permissions for {editing.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span
                        className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                        style={{ background: 'rgba(255,255,255,0.25)', color: '#fff' }}
                      >
                        {editing.permissions.length} / {allPermNames.length} granted
                      </span>
                      {editing.userCount > 0 && (
                        <span
                          className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1"
                          style={{ background: 'rgba(255,255,255,0.20)', color: '#fff' }}
                        >
                          <i className="ri-team-line" />{editing.userCount.toLocaleString()} users
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setEditing(null)}
                  className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 flex-shrink-0 mt-0.5"
                >
                  <i className="ri-close-line text-lg" />
                </button>
              </div>

              {/* Permission search */}
              <div className="mt-3 relative">
                <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-white/60 text-sm pointer-events-none" />
                <input
                  type="text"
                  value={permSearch}
                  onChange={e => setPermSearch(e.target.value)}
                  placeholder="Search permissions…"
                  className="w-full pl-8 pr-3 py-2 text-[0.813rem] rounded-xl outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    color: '#fff',
                  }}
                />
              </div>
            </div>

            {/* Scrollable permissions body */}
            <div className="p-5 overflow-auto flex-1 space-y-6">
              {filteredGroups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <i className="ri-search-line text-3xl text-[#8c9097]" />
                  <p className="text-[0.813rem] text-[#8c9097] mt-2">No permissions match "{permSearch}"</p>
                </div>
              ) : filteredGroups.map(group => {
                const meta = moduleMeta(group.category);
                const granted = group.permissions.filter(p => editing.permissions.includes(p.name)).length;
                const total = group.permissions.length;
                const allOn = granted === total;
                return (
                  <div key={group.category}>
                    {/* Group header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: meta.bg }}
                        >
                          <i className={`${meta.icon} text-sm`} style={{ color: meta.color }} />
                        </div>
                        <span className="font-semibold text-[0.875rem]">{group.category}</span>
                        <span
                          className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                          style={granted > 0
                            ? { background: '#fdf8ee', color: '#C8A86B' }
                            : { background: '#f1f5f9', color: '#94a3b8' }}
                        >
                          {granted}/{total}
                        </span>
                      </div>
                      <button
                        onClick={() => toggleCategory(group, !allOn)}
                        className="text-[11px] font-semibold hover:underline"
                        style={{ color: '#C8A86B' }}
                      >
                        {allOn ? 'Clear all' : 'Select all'}
                      </button>
                    </div>

                    {/* Permission cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {group.permissions.map(p => {
                        const on = editing.permissions.includes(p.name);
                        return (
                          <label
                            key={p.id}
                            className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all select-none"
                            style={on
                              ? { background: '#fdf8ee', border: '1.5px solid #C8A86B' }
                              : { background: '#fff', border: '1px solid #e2e8f0' }}
                          >
                            {/* Custom checkbox */}
                            <div className="flex-shrink-0 mt-0.5">
                              <input
                                type="checkbox"
                                checked={on}
                                onChange={() => togglePerm(p.name)}
                                className="sr-only"
                              />
                              <div
                                className="w-4 h-4 rounded flex items-center justify-center"
                                style={on
                                  ? { background: '#C8A86B', border: '1.5px solid #C8A86B' }
                                  : { background: '#fff', border: '1.5px solid #d1d5db' }}
                              >
                                {on && <i className="ri-check-line text-white" style={{ fontSize: '10px' }} />}
                              </div>
                            </div>
                            <span className="flex-1 min-w-0">
                              <span className="block text-[0.813rem] font-medium leading-snug">{p.displayName}</span>
                              <span className="block text-[10px] font-mono mt-0.5 text-[#94a3b8]">{p.name}</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sticky footer */}
            <div
              className="px-5 py-4 flex justify-between items-center gap-3 flex-shrink-0 flex-wrap"
              style={{ borderTop: '1px solid var(--defaultborder)' }}
            >
              <p className="text-[0.75rem] text-[#8c9097] flex items-center gap-1.5">
                <i className="ri-information-line text-sm flex-shrink-0" />
                Changes take effect at next login (JWT re-issued on token refresh).
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(null)}
                  className="px-4 py-2 text-[0.813rem] font-medium rounded-md"
                  style={{ border: '1px solid #e2e8f0', color: '#64748b', background: '#f8fafc' }}
                >
                  Cancel
                </button>
                <button
                  onClick={savePerms}
                  disabled={savingPerms}
                  className="px-4 py-2 text-[0.813rem] font-medium rounded-md text-white flex items-center gap-1.5 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#C8A86B 0%,#a8863d 100%)' }}
                >
                  {savingPerms
                    ? <><i className="ri-loader-4-line animate-spin" />Saving…</>
                    : <><i className="ri-save-line" />Save permissions</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  );
}
