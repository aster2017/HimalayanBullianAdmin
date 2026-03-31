'use client'

import React, { useEffect, useState, useCallback } from 'react';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { SyncService, SyncHealth, SyncError, SyncLog, SyncLogFilter, EntityMapStats } from '@/shared/services/syncService';
import toast from 'react-hot-toast';

export default function SyncDashboardPage() {
  useProtectedRoute();

  const [health, setHealth] = useState<SyncHealth | null>(null);
  const [errors, setErrors] = useState<SyncError[]>([]);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [entityMaps, setEntityMaps] = useState<EntityMapStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'errors'>('overview');
  const [logFilter, setLogFilter] = useState<SyncLogFilter>({ pageNumber: 1, pageSize: 20 });
  const [totalLogPages, setTotalLogPages] = useState(1);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [healthData, errorsData, logsData, mapsData] = await Promise.allSettled([
        SyncService.getHealth(),
        SyncService.getErrors(undefined, 20),
        SyncService.getLogs(logFilter),
        SyncService.getEntityMaps(),
      ]);

      if (healthData.status === 'fulfilled') setHealth(healthData.value);
      if (errorsData.status === 'fulfilled') setErrors(errorsData.value);
      if (logsData.status === 'fulfilled') {
        setLogs(logsData.value.items);
        setTotalLogPages(logsData.value.totalPages);
      }
      if (mapsData.status === 'fulfilled') setEntityMaps(mapsData.value);

    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || 'Failed to load sync data';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [logFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleFullSync = async () => {
    try {
      setIsSyncing(true);
      await SyncService.triggerFullSync();
      toast.success('Full sync triggered! Check back in a few moments.');
      setTimeout(fetchData, 5000);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to trigger sync');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleItemPull = async () => {
    try {
      setIsSyncing(true);
      await SyncService.triggerItemPull();
      toast.success('Item pull triggered!');
      setTimeout(fetchData, 5000);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to pull items');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRetryFailed = async () => {
    try {
      setIsSyncing(true);
      await SyncService.retryFailed();
      toast.success('Retrying failed syncs...');
      setTimeout(fetchData, 5000);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to retry');
    } finally {
      setIsSyncing(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const timeAgo = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${Math.floor(diffHr / 24)}d ago`;
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'inprogress': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDirectionBadge = (direction: string) => {
    return direction === 'FromZoho'
      ? 'bg-indigo-100 text-indigo-800'
      : 'bg-purple-100 text-purple-800';
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType.toLowerCase()) {
      case 'item': return 'bx-package';
      case 'contact': case 'customer': return 'bx-user';
      case 'salesorder': return 'bx-cart';
      case 'invoice': return 'bx-receipt';
      case 'payment': return 'bx-money';
      default: return 'bx-data';
    }
  };

  if (isLoading && !health) {
    return (
      <div className="page-content">
        <div className="container-fluid">
          <div className="grid grid-cols-1 gap-6 py-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="my-[1.5rem]">
      <div>
        {/* Page Header */}
        <div className="md:flex block items-center justify-between mb-6">
          <div>
            <p className="font-semibold text-[1.125rem] text-defaulttextcolor dark:text-defaulttextcolor/70 !mb-0">Sync Dashboard</p>
            <p className="font-normal text-[#8c9097] text-[0.813rem]">Monitor Zoho Inventory synchronization status and activity.</p>
          </div>
          <div className="flex items-center gap-2 mt-2 md:mt-0">
            <button onClick={handleItemPull} disabled={isSyncing}
              className="ti-btn ti-btn-sm ti-btn-light !opacity-100 disabled:!opacity-50">
              <i className="ri-download-2-line me-1"></i> Pull Items
            </button>
            <button onClick={handleRetryFailed} disabled={isSyncing || ((errors || []).length === 0)}
              className="ti-btn ti-btn-sm ti-btn-warning-full !text-white disabled:!opacity-50">
              <i className="ri-restart-line me-1"></i> Retry Failed
            </button>
            <button onClick={handleFullSync} disabled={isSyncing}
              className="ti-btn ti-btn-sm ti-btn-primary-full !text-white disabled:!opacity-50">
              {isSyncing ? (
                <><i className="ri-loader-4-line animate-spin me-1"></i> Syncing...</>
              ) : (
                <><i className="ri-refresh-line me-1"></i> Full Sync</>
              )}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 mb-4 bg-danger/40 text-sm border-t-4 border-danger text-danger/60 rounded-lg">
            <i className="ri-error-warning-line me-2"></i>
            {error}
          </div>
        )}

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6 py-4">
          {/* Zoho Connection */}
          <div className={`card p-6 rounded-lg shadow-sm border-l-4 ${health?.zohoConnected ? 'border-green-500 bg-green-500/10' : 'border-red-500 bg-red-500/10'}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Zoho Connection</p>
                <h3 className={`text-2xl font-bold mt-2 ${health?.zohoConnected ? 'text-green-700' : 'text-red-700'}`}>
                  {health?.zohoConnected ? 'Connected' : 'Disconnected'}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {health?.tokenExpiresAt ? `Token expires: ${timeAgo(health.tokenExpiresAt)}` : 'No token'}
                </p>
              </div>
              <div className={`text-3xl opacity-50 ${health?.zohoConnected ? 'text-green-500' : 'text-red-500'}`}>
                <i className={`bx ${health?.zohoConnected ? 'bx-check-shield' : 'bx-shield-x'}`}></i>
              </div>
            </div>
          </div>

          {/* API Usage */}
          <div className="card bg-blue-500/10 border-l-4 border-blue-500 p-6 rounded-lg shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">API Calls Today</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-2">{health?.apiCallsToday || 0}</h3>
                <p className="text-xs text-gray-500 mt-1">{health?.apiCallsLastMinute || 0} calls/min</p>
              </div>
              <div className="text-3xl opacity-50 text-blue-500">
                <i className="bx bx-bar-chart"></i>
              </div>
            </div>
          </div>

          {/* Pending Changes */}
          <div className={`card p-6 rounded-lg shadow-sm border-l-4 ${(health?.pendingChangesCount || 0) > 0 ? 'border-yellow-500 bg-yellow-500/10' : 'border-green-500 bg-green-500/10'}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Pending Changes</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-2">{health?.pendingChangesCount || 0}</h3>
                <p className="text-xs text-gray-500 mt-1">Queued for sync</p>
              </div>
              <div className="text-3xl opacity-50 text-yellow-500">
                <i className="bx bx-time-five"></i>
              </div>
            </div>
          </div>

          {/* Errors */}
          <div className={`card p-6 rounded-lg shadow-sm border-l-4 ${(health?.unresolvedErrorCount || 0) > 0 ? 'border-red-500 bg-red-500/10' : 'border-green-500 bg-green-500/10'}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Unresolved Errors</p>
                <h3 className={`text-2xl font-bold mt-2 ${(health?.unresolvedErrorCount || 0) > 0 ? 'text-red-700' : 'text-green-700'}`}>
                  {health?.unresolvedErrorCount || 0}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {(health?.unresolvedErrorCount || 0) > 0 ? 'Needs attention' : 'All clear'}
                </p>
              </div>
              <div className={`text-3xl opacity-50 ${(health?.unresolvedErrorCount || 0) > 0 ? 'text-red-500' : 'text-green-500'}`}>
                <i className={`bx ${(health?.unresolvedErrorCount || 0) > 0 ? 'bx-error' : 'bx-check-circle'}`}></i>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-4">
          <nav className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
            {(['overview', 'logs', 'errors'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab ? 'bg-white text-primary shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab === 'overview' && <i className="bx bx-grid-alt me-1"></i>}
                {tab === 'logs' && <i className="bx bx-list-ul me-1"></i>}
                {tab === 'errors' && <i className="bx bx-error me-1"></i>}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === 'errors' && (health?.unresolvedErrorCount || 0) > 0 && (
                  <span className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {health?.unresolvedErrorCount}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sync Checkpoints */}
            <div className="box">
              <div className="box-header">
                <h5 className="box-title">Last Sync Per Entity</h5>
              </div>
              <div className="box-body p-0">
                <div className="divide-y">
                  {health?.checkpoints && health.checkpoints.length > 0 ? (
                    health.checkpoints.map((cp, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          <div className="text-lg text-primary">
                            <i className={`bx ${getEntityIcon(cp.entityType)}`}></i>
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{cp.entityType}</p>
                            <p className="text-xs text-gray-500">{cp.direction}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{timeAgo(cp.lastSyncedAt)}</p>
                          <p className="text-xs text-gray-500">{cp.lastSyncRecordCount} records</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      <i className="bx bx-sync text-4xl mb-2"></i>
                      <p>No sync history yet. Run a full sync to get started.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Entity Mapping Stats */}
            <div className="box">
              <div className="box-header">
                <h5 className="box-title">Entity Mapping Stats</h5>
              </div>
              <div className="box-body p-0">
                <div className="divide-y">
                  {entityMaps.length > 0 ? (
                    entityMaps.map((map, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          <div className="text-lg text-primary">
                            <i className={`bx ${getEntityIcon(map.entityType)}`}></i>
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{map.entityType}</p>
                            <p className="text-xs text-gray-500">Last mapped: {timeAgo(map.lastMappedAt)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary">{map.totalMapped}</p>
                          <p className="text-xs text-gray-500">mapped</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      <i className="bx bx-link text-4xl mb-2"></i>
                      <p>No entity mappings yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="lg:col-span-2">
              <div className="box">
                <div className="box-header">
                  <div className="flex items-center justify-between">
                    <h5 className="box-title">Recent Sync Activity</h5>
                    <button onClick={() => setActiveTab('logs')} className="text-primary text-sm font-semibold hover:underline">
                      View All Logs
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="ti-custom-table ti-striped-table ti-custom-table-hover">
                    <thead>
                      <tr>
                        <th>Entity</th>
                        <th>Operation</th>
                        <th>Direction</th>
                        <th>Status</th>
                        <th>Duration</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(logs || []).length > 0 ? (
                        (logs || []).slice(0, 10).map((log) => (
                          <tr key={log.id} className="hover:bg-gray-50">
                            <td>
                              <div className="flex items-center gap-2">
                                <i className={`bx ${getEntityIcon(log.entityType)} text-primary`}></i>
                                <span className="font-medium text-sm">{log.entityType}</span>
                              </div>
                            </td>
                            <td className="text-sm">{log.operation}</td>
                            <td>
                              <span className={`badge px-2 py-1 text-xs rounded-full ${getDirectionBadge(log.direction)}`}>
                                {log.direction === 'FromZoho' ? 'Pull' : 'Push'}
                              </span>
                            </td>
                            <td>
                              <span className={`badge px-2 py-1 text-xs rounded-full ${getStatusBadge(log.status)}`}>
                                {log.status}
                              </span>
                            </td>
                            <td className="text-sm text-gray-500">
                              {log.durationMs ? `${log.durationMs}ms` : '-'}
                            </td>
                            <td className="text-sm text-gray-500">{timeAgo(log.createdAt)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-muted">
                            No sync activity recorded yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div className="box">
            <div className="box-header">
              <div className="md:flex block items-center justify-between gap-3">
                <h5 className="box-title mb-2 md:mb-0">Sync Logs</h5>
                <div className="flex items-center gap-2">
                  <select
                    className="form-control form-control-sm !w-[140px] !py-1"
                    value={logFilter.entityType || ''}
                    onChange={(e) => setLogFilter({ ...logFilter, entityType: e.target.value || undefined, pageNumber: 1 })}
                  >
                    <option value="">All Entities</option>
                    <option value="Item">Items</option>
                    <option value="Contact">Contacts</option>
                    <option value="SalesOrder">Sales Orders</option>
                    <option value="Invoice">Invoices</option>
                    <option value="Payment">Payments</option>
                  </select>
                  <select
                    className="form-control form-control-sm !w-[130px] !py-1"
                    value={logFilter.status || ''}
                    onChange={(e) => setLogFilter({ ...logFilter, status: e.target.value || undefined, pageNumber: 1 })}
                  >
                    <option value="">All Status</option>
                    <option value="Success">Success</option>
                    <option value="Failed">Failed</option>
                    <option value="Pending">Pending</option>
                    <option value="InProgress">In Progress</option>
                  </select>
                  <select
                    className="form-control form-control-sm !w-[140px] !py-1"
                    value={logFilter.direction || ''}
                    onChange={(e) => setLogFilter({ ...logFilter, direction: e.target.value || undefined, pageNumber: 1 })}
                  >
                    <option value="">All Directions</option>
                    <option value="FromZoho">Pull</option>
                    <option value="ToZoho">Push</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="table-responsive">
              <table className="table table-vcenter mb-0">
                <thead>
                  <tr>
                    <th>Entity</th>
                    <th>Entity ID</th>
                    <th>Operation</th>
                    <th>Direction</th>
                    <th>Status</th>
                    <th>Zoho ID</th>
                    <th>Attempts</th>
                    <th>Duration</th>
                    <th>Time</th>
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {(logs || []).length > 0 ? (
                    (logs || []).map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td>
                          <div className="flex items-center gap-2">
                            <i className={`bx ${getEntityIcon(log.entityType)} text-primary`}></i>
                            <span className="font-medium text-sm">{log.entityType}</span>
                          </div>
                        </td>
                        <td className="text-xs font-mono text-gray-500">{log.entityId?.substring(0, 8)}...</td>
                        <td className="text-sm">{log.operation}</td>
                        <td>
                          <span className={`badge px-2 py-1 text-xs rounded-full ${getDirectionBadge(log.direction)}`}>
                            {log.direction === 'FromZoho' ? 'Pull' : 'Push'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge px-2 py-1 text-xs rounded-full ${getStatusBadge(log.status)}`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="text-xs font-mono text-gray-500">{log.zohoEntityId || '-'}</td>
                        <td className="text-sm text-center">{log.attemptCount}</td>
                        <td className="text-sm text-gray-500">{log.durationMs ? `${log.durationMs}ms` : '-'}</td>
                        <td className="text-sm text-gray-500">{timeAgo(log.createdAt)}</td>
                        <td className="text-xs text-red-600 max-w-[200px] truncate" title={log.errorMessage || ''}>
                          {log.errorMessage || '-'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-muted">
                        No logs match the current filter
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {totalLogPages > 1 && (
              <div className="box-footer p-4 flex items-center justify-between">
                <p className="text-sm text-gray-500">Page {logFilter.pageNumber} of {totalLogPages}</p>
                <div className="flex gap-2">
                  <button
                    className="ti-btn ti-btn-sm ti-btn-light !opacity-100"
                    disabled={(logFilter.pageNumber || 1) <= 1}
                    onClick={() => setLogFilter({ ...logFilter, pageNumber: (logFilter.pageNumber || 1) - 1 })}
                  >
                    Previous
                  </button>
                  <button
                    className="ti-btn ti-btn-sm ti-btn-light !opacity-100"
                    disabled={(logFilter.pageNumber || 1) >= totalLogPages}
                    onClick={() => setLogFilter({ ...logFilter, pageNumber: (logFilter.pageNumber || 1) + 1 })}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Errors Tab */}
        {activeTab === 'errors' && (
          <div className="box">
            <div className="box-header">
              <div className="flex items-center justify-between">
                <h5 className="box-title">Sync Errors</h5>
                {(errors || []).length > 0 && (
                  <button onClick={handleRetryFailed} disabled={isSyncing} className="ti-btn ti-btn-sm ti-btn-warning-full !text-white">
                    <i className="bx bx-refresh me-1"></i> Retry All Failed
                  </button>
                )}
              </div>
            </div>
            {(errors || []).length > 0 ? (
              <div className="divide-y">
                {(errors || []).map((err) => (
                  <div key={err.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <i className={`bx ${getEntityIcon(err.entityType)} text-red-500`}></i>
                        <span className="font-semibold text-sm">{err.entityType}</span>
                        <span className={`badge px-2 py-1 text-xs rounded-full ${getDirectionBadge(err.direction)}`}>
                          {err.direction === 'FromZoho' ? 'Pull' : 'Push'}
                        </span>
                        <span className="text-xs text-gray-500">{err.operation}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Attempts: {err.attemptCount}</span>
                        {err.httpStatusCode && (
                          <span className="badge bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded">
                            HTTP {err.httpStatusCode}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-red-600 mb-1">{err.errorMessage}</p>
                    {err.errorDetails && (
                      <details className="text-xs text-gray-500">
                        <summary className="cursor-pointer hover:text-gray-700">View Details</summary>
                        <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">{err.errorDetails}</pre>
                      </details>
                    )}
                    <div className="flex gap-4 mt-2 text-xs text-gray-400">
                      <span>Entity: {err.entityId?.substring(0, 8)}...</span>
                      {err.zohoEntityId && <span>Zoho: {err.zohoEntityId}</span>}
                      <span>{timeAgo(err.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-gray-500">
                <i className="bx bx-check-circle text-5xl text-green-400 mb-3"></i>
                <h5 className="font-semibold text-gray-700">No Errors</h5>
                <p className="text-sm">All sync operations are running smoothly.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
