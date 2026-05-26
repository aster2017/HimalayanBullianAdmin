'use client';

import { Fragment, useEffect, useState } from 'react';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { Pagination } from '@/shared/components/Pagination';
import { getAuthHeaders } from '@/shared/services/apiConfig';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://hbc-api.semis.app/api';

type AuditRow = {
  id: string;
  userId?: string | null;
  userName?: string | null;
  entityType: string;
  entityId: string;
  action: 'Create' | 'Update' | 'Delete' | 'View' | string;
  oldValues?: string | null;
  newValues?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
};

const ACTION_COLOR: Record<string, string> = {
  Create: 'success',
  Update: 'info',
  Delete: 'danger',
  View: 'secondary',
};

export default function AuditLogPage() {
  useProtectedRoute();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (entityType) params.set('entityType', entityType);
      if (action) params.set('action', action);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const r = await fetch(`${API}/admin/audit?${params}`, { headers: getAuthHeaders() });
      const d = await r.json();
      setRows(d?.data || []);
      setTotalCount(d?.totalCount || 0);
      if (d?.entityTypes) setEntityTypes(d.entityTypes);
    } catch { toast.error('Failed to load audit log'); }
    finally { setLoading(false); }
  };

  useEffect(() => { setPage(1); }, [entityType, action, from, to, pageSize]);
  useEffect(() => { load(); }, [page, pageSize, entityType, action, from, to]);

  const prettyJson = (s?: string | null) => {
    if (!s) return null;
    try { return JSON.stringify(JSON.parse(s), null, 2); } catch { return s; }
  };

  return (
    <Fragment>
      <div className="my-[1.5rem]">
        <p className="font-semibold text-[1.125rem] !mb-0">Audit Log</p>
        <p className="text-[0.813rem] text-[#8c9097]">Every Create / Update / Delete on tracked entities.</p>
      </div>

      <div className="box mb-4">
        <div className="box-body grid grid-cols-2 md:grid-cols-4 gap-3">
          <select className="form-select" value={entityType} onChange={e => setEntityType(e.target.value)}>
            <option value="">All entity types</option>
            {entityTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="form-select" value={action} onChange={e => setAction(e.target.value)}>
            <option value="">All actions</option>
            <option value="Create">Create</option>
            <option value="Update">Update</option>
            <option value="Delete">Delete</option>
            <option value="View">View</option>
          </select>
          <input type="date" className="form-control" value={from} onChange={e => setFrom(e.target.value)} title="From date" />
          <input type="date" className="form-control" value={to} onChange={e => setTo(e.target.value)} title="To date" />
        </div>
      </div>

      <div className="box">
        <div className="box-body">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary inline-block"></div>
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">No audit entries match the filter.</p>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="ti-custom-table ti-striped-table ti-custom-table-hover min-w-[640px] sm:min-w-0">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase">
                    <th className="text-left p-2">When</th>
                    <th className="text-left p-2">Action</th>
                    <th className="text-left p-2">Entity</th>
                    <th className="text-left p-2 hidden md:table-cell">User</th>
                    <th className="text-left p-2 hidden lg:table-cell">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => {
                    const open = expanded === r.id;
                    const ac = ACTION_COLOR[r.action] || 'secondary';
                    return (
                      <Fragment key={r.id}>
                        <tr className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => setExpanded(open ? null : r.id)}>
                          <td className="p-2 text-[0.813rem] whitespace-nowrap">
                            {new Date(r.createdAt).toLocaleDateString('en-NP')}
                            <div className="text-[0.7rem] text-gray-400">
                              {new Date(r.createdAt).toLocaleTimeString('en-NP', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>
                          <td className="p-2">
                            <span className={`badge bg-${ac}/20 text-${ac} text-[10px] px-2 py-0.5 rounded`}>{r.action}</span>
                          </td>
                          <td className="p-2 text-sm">
                            <span className="font-semibold">{r.entityType}</span>
                            <div className="text-[0.7rem] text-gray-400 font-mono">{r.entityId}</div>
                          </td>
                          <td className="p-2 text-sm hidden md:table-cell">
                            {r.userName || (r.userId ? <span className="font-mono text-[0.7rem]">{r.userId}</span> : <span className="text-gray-400">—</span>)}
                          </td>
                          <td className="p-2 font-mono text-[0.7rem] hidden lg:table-cell">{r.ipAddress || '—'}</td>
                        </tr>
                        {open && (
                          <tr className="bg-gray-50">
                            <td colSpan={5} className="p-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                {r.oldValues && (
                                  <div>
                                    <p className="text-gray-500 mb-1 uppercase tracking-wide">Before</p>
                                    <pre className="bg-white border rounded p-2 text-[11px] whitespace-pre-wrap break-all max-h-64 overflow-auto">{prettyJson(r.oldValues)}</pre>
                                  </div>
                                )}
                                {r.newValues && (
                                  <div>
                                    <p className="text-gray-500 mb-1 uppercase tracking-wide">After</p>
                                    <pre className="bg-white border rounded p-2 text-[11px] whitespace-pre-wrap break-all max-h-64 overflow-auto">{prettyJson(r.newValues)}</pre>
                                  </div>
                                )}
                                {r.userAgent && (
                                  <div className="md:col-span-2">
                                    <p className="text-gray-500 mb-1 uppercase tracking-wide">User-Agent</p>
                                    <p className="text-[11px] text-gray-600">{r.userAgent}</p>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {!loading && totalCount > 0 && (
          <div className="px-4 pb-4">
            <Pagination
              page={page}
              pageSize={pageSize}
              totalCount={totalCount}
              onPageChange={setPage}
              pageSizeOptions={[25, 50, 100]}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </div>
    </Fragment>
  );
}
