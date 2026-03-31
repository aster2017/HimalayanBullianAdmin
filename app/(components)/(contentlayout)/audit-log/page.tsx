'use client';

import { Fragment, useEffect, useState } from 'react';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import Seo from '@/shared/layout-components/seo/seo';
import apiClient from '@/shared/services/apiClient';

const AuditLogPage = () => {
  useProtectedRoute();

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [entityFilter, setEntityFilter] = useState('');
  const pageSize = 25;

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const params: any = { page: currentPage, pageSize };
        if (entityFilter) params.entityType = entityFilter;

        // Try multiple endpoints
        let data: any = null;
        for (const endpoint of ['/sync/logs', '/zoho/sync/logs']) {
          try {
            const res = await apiClient.get(endpoint, { params });
            data = res.data?.data || res.data;
            break;
          } catch { continue; }
        }

        setLogs(data?.items || data || []);
        setTotalCount(data?.totalCount || 0);
      } catch {
        setLogs([]);
      }
      setLoading(false);
    };
    fetch();
  }, [currentPage, entityFilter]);

  const totalPages = Math.ceil(totalCount / pageSize);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'success': return 'success';
      case 'failed': return 'danger';
      case 'pending': return 'warning';
      case 'inprogress': return 'info';
      default: return 'secondary';
    }
  };

  return (
    <Fragment>
      <Seo title="Audit Log" />

      <div className="md:flex block items-center justify-between my-[1.5rem] page-header-breadcrumb">
        <div>
          <p className="font-semibold text-[1.125rem] text-defaulttextcolor dark:text-defaulttextcolor/70 !mb-0">Audit Log</p>
          <p className="font-normal text-[#8c9097] text-[0.813rem]">System activity and sync history</p>
        </div>
        <div className="flex gap-2 mt-2 md:mt-0">
          <select value={entityFilter} onChange={(e) => { setEntityFilter(e.target.value); setCurrentPage(1); }}
            className="form-control form-control-sm w-[150px]">
            <option value="">All Entities</option>
            <option value="Item">Items</option>
            <option value="Contact">Contacts</option>
            <option value="SalesOrder">Orders</option>
            <option value="Invoice">Invoices</option>
            <option value="Payment">Payments</option>
          </select>
        </div>
      </div>

      <div className="box">
        {loading ? (
          <div className="box-body text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary inline-block"></div>
          </div>
        ) : !logs || logs.length === 0 ? (
          <div className="box-body text-center py-12">
            <p className="text-[#8c9097]">No audit logs found</p>
          </div>
        ) : (
          <div className="box-body p-0 overflow-x-auto">
            <table className="ti-custom-table ti-striped-table ti-custom-table-hover">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Entity</th>
                  <th>Operation</th>
                  <th>Direction</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                {(logs || []).map((log: any) => (
                  <tr key={log.id}>
                    <td className="text-[0.75rem] text-[#8c9097]">{new Date(log.createdAt).toLocaleString()}</td>
                    <td><span className="font-semibold">{log.entityType}</span></td>
                    <td>{log.operation}</td>
                    <td>
                      <span className={`badge ${log.direction === 'FromZoho' ? 'bg-indigo-500/20 text-indigo-500' : 'bg-purple-500/20 text-purple-500'}`}>
                        {log.direction === 'FromZoho' ? 'Pull' : 'Push'}
                      </span>
                    </td>
                    <td><span className={`badge bg-${getStatusColor(log.status)}/20 text-${getStatusColor(log.status)}`}>{log.status}</span></td>
                    <td className="text-[0.75rem]">{log.durationMs ? `${log.durationMs}ms` : '-'}</td>
                    <td className="text-[0.7rem] text-danger max-w-[200px] truncate" title={log.errorMessage || ''}>{log.errorMessage || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-4 pb-4">
          <p className="text-[0.813rem] text-[#8c9097]">
            Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalCount)} of {totalCount}
          </p>
          <div className="flex gap-1">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
              className="ti-btn ti-btn-sm ti-btn-light disabled:opacity-50">Previous</button>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
              className="ti-btn ti-btn-sm ti-btn-light disabled:opacity-50">Next</button>
          </div>
        </div>
      )}
    </Fragment>
  );
};

export default AuditLogPage;
