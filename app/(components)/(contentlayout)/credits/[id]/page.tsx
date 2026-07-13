'use client';

import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { getAuthHeaders } from '@/shared/services/apiConfig';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL;

type Transaction = {
  id: string;
  customer: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    customerNumber?: string | null;
  };
  type: 'Deposit' | 'Deduction' | 'Refund';
  amount: number;
  balanceBefore?: number | null;
  balanceAfter: number;
  description?: string | null;
  referenceNumber?: string | null;
  connectIpsTransactionId?: string | null;
  paymentMethod?: string | null;
  receiptImageUrl?: string | null;
  status: 'Pending' | 'Verified' | 'Rejected';
  verifiedBy?: string | null;
  verifierName?: string | null;
  verifiedAt?: string | null;
  rejectionReason?: string | null;
  orderId?: string | null;
  orderNumber?: string | null;
  createdAt: string;
  callLogs?: CallLog[];
};

type CallLog = {
  id: string;
  callType: 'Initiate' | 'ValidateTxn' | 'CallbackReceived' | string;
  canonical?: string | null;
  signedToken?: string | null;
  requestBody?: string | null;
  httpStatus?: number | null;
  responseBody?: string | null;
  status?: string | null;
  statusDesc?: string | null;
  createdAt: string;
};

type ReverifyResponse = {
  success: boolean;
  data?: {
    wasUpdated: boolean;
    newStatus: string;
    probe: {
      validateUrl: string;
      canonical: string;
      signedToken: string;
      requestBody: string;
      httpStatus: number;
      responseBody: string;
      status: string;
      statusDesc: string;
    };
  };
  message?: string;
};

const TYPE_CONFIG: Record<string, { iconBg: string; iconColor: string; icon: string; amountColor: string; label: string; prefix: string }> = {
  Deposit:   { iconBg: '#dcfce7', iconColor: '#15803d', icon: 'ri-arrow-down-circle-line', amountColor: '#15803d', label: 'Deposit',   prefix: '+' },
  Deduction: { iconBg: '#fef3c7', iconColor: '#b45309', icon: 'ri-arrow-up-circle-line',   amountColor: '#b45309', label: 'Deduction', prefix: '−' },
  Refund:    { iconBg: '#dbeafe', iconColor: '#1d4ed8', icon: 'ri-refresh-line',           amountColor: '#1d4ed8', label: 'Refund',    prefix: '↩' },
};

const TYPE_PILL: Record<string, { bg: string; text: string }> = {
  Deposit:   { bg: '#dcfce7', text: '#15803d' },
  Deduction: { bg: '#fef3c7', text: '#b45309' },
  Refund:    { bg: '#dbeafe', text: '#1d4ed8' },
};

const STATUS_PILL: Record<string, { bg: string; text: string }> = {
  Verified: { bg: '#dcfce7', text: '#15803d' },
  Pending:  { bg: '#fef3c7', text: '#b45309' },
  Rejected: { bg: '#fee2e2', text: '#dc2626' },
};

const METHOD_LABEL: Record<string, string> = {
  connectips: 'ConnectIPS', banktransfer: 'Bank Transfer', cash: 'Cash', directadd: 'Direct (Admin)',
};

function methodLabel(m?: string | null) {
  return METHOD_LABEL[(m || '').toLowerCase().replace(/\s/g, '')] || m || '—';
}

function fmtDateTime(s: string) {
  return new Date(s).toLocaleString('en-NP', { dateStyle: 'medium', timeStyle: 'short' });
}

const AVATAR_COLORS = ['#C8A86B','#6366f1','#0891b2','#16a34a','#dc2626','#9333ea','#ea580c','#0284c7'];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xfffffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function avatarInitials(name: string) {
  const p = name.trim().split(/\s+/);
  return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

function SectionHeader({ icon, iconBg, iconColor, title, subtitle }: { icon: string; iconBg: string; iconColor: string; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
        <i className={`${icon} text-base`} style={{ color: iconColor }}></i>
      </div>
      <div>
        <p className="font-semibold text-[0.938rem] text-defaulttextcolor mb-0">{title}</p>
        {subtitle && <p className="text-[0.75rem] text-[#8c9097] mb-0">{subtitle}</p>}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-[#64748b] uppercase tracking-wide mb-1">{label}</p>
      <div className="text-[0.813rem] text-defaulttextcolor">{children}</div>
    </div>
  );
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre className="text-xs p-3 rounded-lg overflow-x-auto font-mono" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
      {children}
    </pre>
  );
}

const nchlStatusColor = (s: string) => {
  const u = (s || '').toUpperCase();
  return u === 'SUCCESS' ? { bg: '#dcfce7', text: '#15803d' } : u === 'ERROR' || u === 'FAILED' ? { bg: '#fee2e2', text: '#dc2626' } : { bg: '#f1f5f9', text: '#475569' };
};

export default function CreditTransactionDetailPage() {
  useProtectedRoute();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [tx, setTx] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [reverifying, setReverifying] = useState(false);
  const [reverify, setReverify] = useState<ReverifyResponse | null>(null);
  const [lightbox, setLightbox] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const r = await fetch(`${API}/credits/admin/transactions/${id}`, { headers: getAuthHeaders() });
      const d = await r.json();
      if (!r.ok || d?.success === false) throw new Error(d?.message || 'Failed to load');
      setTx(d.data);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load transaction');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const runReverify = async () => {
    if (!tx) return;
    setReverifying(true);
    setReverify(null);
    try {
      const r = await fetch(`${API}/credits/admin/transactions/${tx.id}/re-verify`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      });
      const d = await r.json();
      setReverify(d);
      if (!r.ok || d?.success === false) {
        toast.error(d?.message || 'Re-verify failed');
      } else {
        const p = d.data?.probe;
        toast.success(`NCHL: ${p?.status} / ${p?.statusDesc}${d.data?.wasUpdated ? ' — wallet credited' : ''}`);
        if (d.data?.wasUpdated) load();
      }
    } finally { setReverifying(false); }
  };

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary inline-block"></div>
        <p className="mt-4 text-[#8c9097] text-sm">Loading transaction…</p>
      </div>
    );
  }

  if (!tx) {
    return (
      <div className="box mt-6">
        <div className="box-body text-center py-12">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: '#fdf8ee' }}>
            <i className="ri-wallet-3-line text-2xl" style={{ color: '#C8A86B' }}></i>
          </div>
          <p className="text-[#64748b] font-medium mb-1">Transaction not found</p>
          <Link href="/credits" className="text-sm hover:underline" style={{ color: '#C8A86B' }}>← Back to credit ledger</Link>
        </div>
      </div>
    );
  }

  const isConnectIps = !!tx.connectIpsTransactionId;
  const customerLabel = `${tx.customer.firstName || ''} ${tx.customer.lastName || ''}`.trim() || tx.customer.email;
  const typeConfig = TYPE_CONFIG[tx.type] || { iconBg: '#f1f5f9', iconColor: '#475569', icon: 'ri-exchange-line', amountColor: '#475569', label: tx.type, prefix: '' };
  const typePill = TYPE_PILL[tx.type] || { bg: '#f1f5f9', text: '#475569' };
  const statusPill = STATUS_PILL[tx.status] || { bg: '#f1f5f9', text: '#475569' };

  return (
    <Fragment>
      {/* Header box */}
      <div className="box p-5 mb-6">
        <div className="flex flex-col md:flex-row md:items-start gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: typeConfig.iconBg }}
            >
              <i className={`${typeConfig.icon} text-2xl`} style={{ color: typeConfig.iconColor }}></i>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: typePill.bg, color: typePill.text }}
                >
                  {typeConfig.label}
                </span>
                <span
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: statusPill.bg, color: statusPill.text }}
                >
                  {tx.status}
                </span>
              </div>
              <p className="text-[1.375rem] font-bold mb-0" style={{ color: typeConfig.amountColor }}>
                {typeConfig.prefix} Rs. {tx.amount.toLocaleString()}
              </p>
              <p className="text-[0.813rem] text-[#8c9097] mb-0 mt-1">
                <span className="font-mono text-[0.75rem]">{tx.id}</span>
                {' · '}
                {fmtDateTime(tx.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link href="/credits">
              <button
                className="px-3 py-1.5 text-[0.813rem] font-medium rounded-md flex items-center gap-1.5 whitespace-nowrap"
                style={{ border: '1px solid #e2e8f0', color: '#64748b', background: '#f8fafc' }}
              >
                <i className="ri-arrow-left-line"></i>Back to Ledger
              </button>
            </Link>
            {isConnectIps && (
              <button
                onClick={runReverify}
                disabled={reverifying}
                className="px-3 py-1.5 text-[0.813rem] font-medium rounded-md text-white flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%)' }}
              >
                {reverifying
                  ? <><i className="ri-loader-4-line animate-spin"></i>Calling NCHL…</>
                  : <><i className="ri-refresh-line"></i>Re-verify with NCHL</>}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="box p-4 flex items-center gap-3" style={{ borderLeft: `3px solid ${typeConfig.iconColor}` }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: typeConfig.iconBg }}>
            <i className={`${typeConfig.icon} text-lg`} style={{ color: typeConfig.iconColor }}></i>
          </div>
          <div>
            <p className="text-[11px] text-[#64748b] font-medium uppercase tracking-wide mb-0.5">Amount</p>
            <p className="text-[1rem] font-bold mb-0" style={{ color: typeConfig.amountColor }}>
              {typeConfig.prefix} Rs. {tx.amount.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="box p-4 flex items-center gap-3" style={{ borderLeft: `3px solid ${typePill.text}` }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: typePill.bg }}>
            <i className="ri-exchange-line text-lg" style={{ color: typePill.text }}></i>
          </div>
          <div>
            <p className="text-[11px] text-[#64748b] font-medium uppercase tracking-wide mb-0.5">Type</p>
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: typePill.bg, color: typePill.text }}>
              {typeConfig.label}
            </span>
          </div>
        </div>
        <div className="box p-4 flex items-center gap-3" style={{ borderLeft: `3px solid ${statusPill.text}` }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: statusPill.bg }}>
            <i className="ri-shield-check-line text-lg" style={{ color: statusPill.text }}></i>
          </div>
          <div>
            <p className="text-[11px] text-[#64748b] font-medium uppercase tracking-wide mb-0.5">Status</p>
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: statusPill.bg, color: statusPill.text }}>
              {tx.status}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Main details */}
        <div className="lg:col-span-2 space-y-6">

          {/* Transaction details card */}
          <div className="box p-5">
            <SectionHeader icon="ri-file-list-3-line" iconBg="#fdf8ee" iconColor="#C8A86B" title="Transaction Details" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Customer">
                <Link href={`/customers/${tx.customer.id}`} className="font-semibold hover:underline" style={{ color: '#C8A86B' }}>
                  {customerLabel}
                </Link>
                <p className="text-[0.75rem] text-[#8c9097] mb-0">{tx.customer.email}</p>
                {tx.customer.customerNumber && (
                  <p className="text-[0.75rem] text-[#8c9097] mb-0 font-mono">{tx.customer.customerNumber}</p>
                )}
              </Field>
              <Field label="Payment Method">
                {tx.paymentMethod ? (
                  <span>{methodLabel(tx.paymentMethod)}</span>
                ) : (
                  <span className="text-[#8c9097]">—</span>
                )}
              </Field>
              <Field label="Reference">
                <span className="font-mono text-[0.75rem]">
                  {tx.connectIpsTransactionId || tx.referenceNumber || <span className="text-[#8c9097]">—</span>}
                </span>
              </Field>
              <Field label="Balance Change">
                <span className="text-[0.75rem]">
                  {tx.balanceBefore !== null && tx.balanceBefore !== undefined && (
                    <><span className="font-mono">Rs. {tx.balanceBefore.toLocaleString()}</span> → </>
                  )}
                  <span className="font-mono font-semibold">Rs. {tx.balanceAfter.toLocaleString()}</span>
                  {tx.status === 'Pending' && (
                    <span className="text-[#b45309] ms-1">(unchanged — pending)</span>
                  )}
                </span>
              </Field>
              <Field label="Created">
                <span>{fmtDateTime(tx.createdAt)}</span>
              </Field>
              <Field label="Verified">
                {tx.verifiedAt ? (
                  <span>
                    {fmtDateTime(tx.verifiedAt)}
                    {tx.verifierName && <span className="text-[#8c9097] ms-1">by {tx.verifierName}</span>}
                  </span>
                ) : (
                  <span className="text-[#8c9097]">—</span>
                )}
              </Field>
              {tx.orderId && (
                <Field label="Related Order">
                  <Link href={`/orders/${tx.orderId}`} className="font-mono text-[0.75rem] hover:underline" style={{ color: '#C8A86B' }}>
                    {tx.orderNumber || tx.orderId}
                  </Link>
                </Field>
              )}
              {tx.description && (
                <Field label="Description">
                  <span>{tx.description}</span>
                </Field>
              )}
            </div>

            {/* Rejection reason */}
            {tx.rejectionReason && (
              <div className="mt-4 p-3 rounded-xl" style={{ background: '#fee2e2', border: '1px solid #fca5a5' }}>
                <p className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: '#dc2626' }}>
                  <i className="ri-close-circle-line me-1"></i>Rejection Reason
                </p>
                <p className="text-[0.813rem] mb-0" style={{ color: '#dc2626' }}>{tx.rejectionReason}</p>
              </div>
            )}
          </div>

          {/* Receipt image */}
          {tx.receiptImageUrl && (
            <div className="box p-5">
              <SectionHeader icon="ri-image-line" iconBg="#dbeafe" iconColor="#1d4ed8" title="Receipt" />
              <div className="relative group cursor-pointer" onClick={() => setLightbox(true)}>
                <img
                  src={tx.receiptImageUrl}
                  alt="Receipt"
                  className="max-h-64 rounded-xl object-cover"
                  style={{ border: '1px solid #e2e8f0' }}
                />
                <div className="absolute inset-0 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'rgba(0,0,0,0.4)' }}>
                  <span className="text-white text-sm font-medium flex items-center gap-1">
                    <i className="ri-zoom-in-line"></i> Enlarge
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* NCHL conversation log */}
          {isConnectIps && tx.callLogs && tx.callLogs.length > 0 && (
            <div className="box p-5">
              <SectionHeader
                icon="ri-exchange-line"
                iconBg="#ede9fe"
                iconColor="#6d28d9"
                title={`NCHL Conversation`}
                subtitle={`${tx.callLogs.length} ${tx.callLogs.length === 1 ? 'event' : 'events'}`}
              />
              <ol className="relative border-s border-gray-200 ms-3 space-y-5">
                {tx.callLogs.map(log => {
                  const dotColor =
                    log.callType === 'CallbackReceived' ? '#0891b2'
                    : (log.status || '').toUpperCase() === 'SUCCESS' ? '#16a34a'
                    : (log.status || '').toUpperCase() === 'ERROR' || (log.status || '').toUpperCase() === 'FAILED' ? '#dc2626'
                    : '#6366f1';
                  const nchl = nchlStatusColor(log.status || '');
                  return (
                    <li key={log.id} className="ms-4">
                      <div
                        className="absolute w-3 h-3 rounded-full -start-1.5 mt-1.5"
                        style={{ background: dotColor }}
                      ></div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{log.callType}</span>
                        {log.httpStatus !== null && log.httpStatus !== undefined && (
                          <span className="font-mono text-xs text-[#8c9097]">HTTP {log.httpStatus}</span>
                        )}
                        {log.status && (
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: nchl.bg, color: nchl.text }}
                          >
                            {log.status}{log.statusDesc ? ` / ${log.statusDesc}` : ''}
                          </span>
                        )}
                        <span className="text-xs text-[#8c9097] ms-auto">{fmtDateTime(log.createdAt)}</span>
                      </div>
                      <div className="mt-2 space-y-1 text-xs">
                        {log.canonical && (
                          <details>
                            <summary className="cursor-pointer" style={{ color: '#C8A86B' }}>Canonical signed</summary>
                            <CodeBlock>{log.canonical}</CodeBlock>
                          </details>
                        )}
                        {log.signedToken && (
                          <details>
                            <summary className="cursor-pointer" style={{ color: '#C8A86B' }}>Signed token</summary>
                            <CodeBlock>{log.signedToken}</CodeBlock>
                          </details>
                        )}
                        {log.requestBody && (
                          <details>
                            <summary className="cursor-pointer" style={{ color: '#C8A86B' }}>Request body</summary>
                            <CodeBlock>{log.requestBody}</CodeBlock>
                          </details>
                        )}
                        {log.responseBody && (
                          <details>
                            <summary className="cursor-pointer" style={{ color: '#C8A86B' }}>Response body</summary>
                            <CodeBlock>{log.responseBody}</CodeBlock>
                          </details>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {/* Re-verify response */}
          {reverify?.data && (
            <div className="box p-5">
              <SectionHeader
                icon="ri-radar-line"
                iconBg="#ede9fe"
                iconColor="#6d28d9"
                title="NCHL Re-verify Response"
              />
              <div className="space-y-3 text-xs">
                <div className="flex items-center gap-3 flex-wrap">
                  <span
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: nchlStatusColor(reverify.data.probe.status).bg, color: nchlStatusColor(reverify.data.probe.status).text }}
                  >
                    {reverify.data.probe.status} / {reverify.data.probe.statusDesc}
                  </span>
                  <span className="text-[#8c9097]">HTTP <span className="font-mono font-semibold">{reverify.data.probe.httpStatus}</span></span>
                </div>
                {reverify.data.wasUpdated ? (
                  <div className="p-3 rounded-xl" style={{ background: '#dcfce7', border: '1px solid #bbf7d0' }}>
                    <i className="ri-check-line me-1" style={{ color: '#15803d' }}></i>
                    <span style={{ color: '#15803d' }}>
                      Status was <strong>Pending</strong>; NCHL returned <strong>SUCCESS</strong>; wallet credited → <strong>{reverify.data.newStatus}</strong>.
                    </span>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl" style={{ background: '#dbeafe', border: '1px solid #bfdbfe' }}>
                    <i className="ri-information-line me-1" style={{ color: '#1d4ed8' }}></i>
                    <span style={{ color: '#1d4ed8' }}>No state change — current status is <strong>{reverify.data.newStatus}</strong>.</span>
                  </div>
                )}
                <details><summary className="cursor-pointer" style={{ color: '#C8A86B' }}>Canonical bytes signed</summary><CodeBlock>{reverify.data.probe.canonical}</CodeBlock></details>
                <details><summary className="cursor-pointer" style={{ color: '#C8A86B' }}>Signed token (base64)</summary><CodeBlock>{reverify.data.probe.signedToken}</CodeBlock></details>
                <details><summary className="cursor-pointer" style={{ color: '#C8A86B' }}>Request body</summary><CodeBlock>{reverify.data.probe.requestBody}</CodeBlock></details>
                <details open><summary className="cursor-pointer" style={{ color: '#C8A86B' }}>NCHL response body</summary><CodeBlock>{reverify.data.probe.responseBody}</CodeBlock></details>
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">

          {/* Customer card */}
          <div className="box p-5">
            <SectionHeader icon="ri-user-3-line" iconBg="#fdf8ee" iconColor="#C8A86B" title="Customer" />
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                style={{ background: avatarColor(customerLabel), fontSize: 13 }}
              >
                {avatarInitials(customerLabel)}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-[0.875rem] text-defaulttextcolor mb-0 truncate">{customerLabel}</p>
                <p className="text-[0.75rem] text-[#8c9097] mb-0 truncate">{tx.customer.email}</p>
                {tx.customer.customerNumber && (
                  <p className="text-[0.7rem] text-[#8c9097] mb-0 font-mono">{tx.customer.customerNumber}</p>
                )}
              </div>
            </div>
            <Link href={`/customers/${tx.customer.id}`} className="block">
              <button
                className="w-full px-3 py-1.5 text-[0.813rem] font-medium rounded-md whitespace-nowrap"
                style={{ border: '1px solid #C8A86B', color: '#C8A86B', background: 'transparent' }}
              >
                View Customer Profile →
              </button>
            </Link>
          </div>

          {/* Status timeline */}
          <div className="box p-5">
            <SectionHeader icon="ri-time-line" iconBg="#f0fdf4" iconColor="#16a34a" title="Timeline" />
            <ol className="relative border-s border-gray-200 ms-3 space-y-4">
              <li className="ms-4">
                <div className="absolute w-3 h-3 rounded-full -start-1.5 mt-1.5" style={{ background: '#C8A86B' }}></div>
                <p className="text-sm font-semibold text-defaulttextcolor mb-0">Initiated</p>
                <p className="text-xs text-[#8c9097] mb-0">{fmtDateTime(tx.createdAt)}</p>
              </li>
              {isConnectIps && (
                <li className="ms-4">
                  <div className="absolute w-3 h-3 rounded-full -start-1.5 mt-1.5" style={{ background: tx.status === 'Pending' ? '#d1d5db' : '#16a34a' }}></div>
                  <p className="text-sm font-semibold text-defaulttextcolor mb-0">NCHL Gateway redirect</p>
                  <p className="text-xs text-[#8c9097] mb-0">{tx.status === 'Pending' ? 'Awaiting callback' : 'Customer returned'}</p>
                </li>
              )}
              <li className="ms-4">
                <div
                  className="absolute w-3 h-3 rounded-full -start-1.5 mt-1.5"
                  style={{ background: tx.status === 'Verified' ? '#16a34a' : tx.status === 'Rejected' ? '#dc2626' : '#d1d5db' }}
                ></div>
                <p className="text-sm font-semibold text-defaulttextcolor mb-0">
                  {tx.status === 'Verified' ? 'Verified — wallet credited' :
                   tx.status === 'Rejected' ? 'Rejected' :
                   'Awaiting verification'}
                </p>
                {tx.verifiedAt && <p className="text-xs text-[#8c9097] mb-0">{fmtDateTime(tx.verifiedAt)}</p>}
                {tx.verifierName && <p className="text-xs text-[#8c9097] mb-0">by {tx.verifierName}</p>}
              </li>
            </ol>
          </div>

          {/* ConnectIPS info */}
          {isConnectIps && (
            <div className="box p-5">
              <SectionHeader icon="ri-bank-line" iconBg="#ede9fe" iconColor="#6d28d9" title="ConnectIPS" />
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] font-medium text-[#64748b] uppercase tracking-wide mb-1">NCHL Transaction ID</p>
                  <p className="font-mono text-[0.75rem] font-semibold text-defaulttextcolor break-all mb-0">
                    {tx.connectIpsTransactionId}
                  </p>
                </div>
                <div className="pt-3" style={{ borderTop: '1px solid #e2e8f0' }}>
                  <Link href="/access/connectips-probe" className="text-sm hover:underline" style={{ color: '#C8A86B' }}>
                    Open ConnectIPS Probe →
                  </Link>
                  <p className="text-[11px] text-[#8c9097] mt-1 mb-0">For a fresh probe run with the full request/response trace.</p>
                </div>
              </div>
            </div>
          )}

          {/* Quick links */}
          <div className="box p-5">
            <SectionHeader icon="ri-links-line" iconBg="#f1f5f9" iconColor="#475569" title="Quick Links" />
            <div className="space-y-2">
              <Link href="/credits" className="flex items-center gap-2 text-[0.813rem] hover:underline" style={{ color: '#C8A86B' }}>
                <i className="ri-wallet-3-line"></i>Back to Credit Ledger
              </Link>
              {tx.orderId && (
                <Link href={`/orders/${tx.orderId}`} className="flex items-center gap-2 text-[0.813rem] hover:underline" style={{ color: '#C8A86B' }}>
                  <i className="ri-shopping-bag-line"></i>View Order {tx.orderNumber || ''}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Receipt lightbox */}
      {lightbox && tx.receiptImageUrl && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={() => setLightbox(false)}
        >
          <div className="relative max-w-4xl max-h-full" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setLightbox(false)}
              className="absolute -top-10 right-0 text-white text-2xl hover:text-gray-300"
            >
              <i className="ri-close-line"></i>
            </button>
            <img
              src={tx.receiptImageUrl}
              alt="Receipt"
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </Fragment>
  );
}
