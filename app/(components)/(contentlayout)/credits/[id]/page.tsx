'use client';

import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { getAuthHeaders } from '@/shared/services/apiConfig';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://hbc-api.semis.app/api';

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

const typeColor = (t: string) => t === 'Deposit' ? 'success' : t === 'Refund' ? 'info' : 'warning';
const statusColor = (s: string) => s === 'Verified' ? 'success' : s === 'Pending' ? 'warning' : 'danger';
const methodColor = (m?: string | null) => m === 'ConnectIPS' ? 'primary' : m === 'BankTransfer' ? 'info' : 'secondary';
const nchlStatusColor = (s: string) => {
  const u = (s || '').toUpperCase();
  return u === 'SUCCESS' ? 'success' : u === 'ERROR' || u === 'FAILED' ? 'danger' : 'secondary';
};

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre className="text-xs p-3 bg-gray-50 border rounded overflow-x-auto font-mono" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
      {children}
    </pre>
  );
}

export default function CreditTransactionDetailPage() {
  useProtectedRoute();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [tx, setTx] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [reverifying, setReverifying] = useState(false);
  const [reverify, setReverify] = useState<ReverifyResponse | null>(null);

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
      </div>
    );
  }

  if (!tx) {
    return (
      <div className="box mt-6">
        <div className="box-body text-center py-12">
          <p className="text-[#8c9097]">Transaction not found.</p>
          <Link href="/credits" className="text-primary">← Back to ledger</Link>
        </div>
      </div>
    );
  }

  const isConnectIps = !!tx.connectIpsTransactionId;
  const customerLabel = `${tx.customer.firstName || ''} ${tx.customer.lastName || ''}`.trim() || tx.customer.email;

  return (
    <Fragment>
      <div className="md:flex items-center justify-between my-[1.5rem]">
        <div>
          <p className="font-semibold text-[1.125rem] !mb-0">
            <span className={`badge bg-${typeColor(tx.type)}/20 text-${typeColor(tx.type)} me-2`}>{tx.type}</span>
            <span className={`badge bg-${statusColor(tx.status)}/20 text-${statusColor(tx.status)} me-2`}>{tx.status}</span>
            Rs. {tx.amount.toLocaleString()}
          </p>
          <p className="text-[0.813rem] text-[#8c9097]">
            <span className="font-mono">{tx.id}</span>
            <Link href="/credits" className="text-primary ms-2">← Back to ledger</Link>
          </p>
        </div>
        {isConnectIps && (
          <button
            onClick={runReverify}
            disabled={reverifying}
            className="ti-btn ti-btn-primary-full !text-white !opacity-100 mt-2 md:mt-0 disabled:!opacity-50"
            title="Re-runs NCHL /validatetxn for this transaction. If NCHL returns SUCCESS and we are still Pending, the wallet is credited."
          >
            {reverifying
              ? <><i className="ri-loader-4-line animate-spin me-1"></i>Calling NCHL…</>
              : <><i className="ri-refresh-line me-1"></i>Re-verify with NCHL</>}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Core transaction details */}
        <div className="lg:col-span-2 box">
          <div className="box-header"><h6 className="box-title mb-0">Transaction</h6></div>
          <div className="box-body">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b">
                  <td className="py-2 text-gray-500 w-1/3">Customer</td>
                  <td className="py-2">
                    <Link href={`/customers/${tx.customer.id}`} className="text-primary hover:underline font-semibold">
                      {customerLabel}
                    </Link>
                    <div className="text-xs text-gray-400">{tx.customer.email}{tx.customer.customerNumber ? ` · ${tx.customer.customerNumber}` : ''}</div>
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 text-gray-500">Amount</td>
                  <td className="py-2 font-semibold">
                    {tx.type === 'Deduction' ? '−' : '+'} Rs. {tx.amount.toLocaleString()}
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 text-gray-500">Balance change</td>
                  <td className="py-2 text-xs">
                    {tx.balanceBefore !== null && tx.balanceBefore !== undefined && (
                      <>before <span className="font-mono">Rs. {tx.balanceBefore.toLocaleString()}</span> → </>
                    )}
                    after <span className="font-mono font-semibold">Rs. {tx.balanceAfter.toLocaleString()}</span>
                    {tx.status === 'Pending' && (
                      <span className="text-warning ms-2">(unchanged — pending verification)</span>
                    )}
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 text-gray-500">Payment method</td>
                  <td className="py-2">
                    <span className={`badge bg-${methodColor(tx.paymentMethod)}/20 text-${methodColor(tx.paymentMethod)}`}>
                      {tx.paymentMethod || '—'}
                    </span>
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 text-gray-500">Reference</td>
                  <td className="py-2 font-mono text-xs">
                    {tx.connectIpsTransactionId || tx.referenceNumber || <span className="text-gray-400">—</span>}
                  </td>
                </tr>
                {tx.description && (
                  <tr className="border-b">
                    <td className="py-2 text-gray-500">Description</td>
                    <td className="py-2">{tx.description}</td>
                  </tr>
                )}
                {tx.orderId && (
                  <tr className="border-b">
                    <td className="py-2 text-gray-500">Related order</td>
                    <td className="py-2">
                      <Link href={`/orders/${tx.orderId}`} className="text-primary hover:underline font-mono text-xs">
                        {tx.orderNumber || tx.orderId}
                      </Link>
                    </td>
                  </tr>
                )}
                <tr className="border-b">
                  <td className="py-2 text-gray-500">Created</td>
                  <td className="py-2 text-xs">{new Date(tx.createdAt).toLocaleString('en-NP')}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 text-gray-500">Verified</td>
                  <td className="py-2 text-xs">
                    {tx.verifiedAt ? (
                      <>
                        {new Date(tx.verifiedAt).toLocaleString('en-NP')}
                        {tx.verifierName && <span className="text-gray-400"> by {tx.verifierName}</span>}
                      </>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                </tr>
                {tx.rejectionReason && (
                  <tr className="border-b">
                    <td className="py-2 text-gray-500">Rejection reason</td>
                    <td className="py-2 text-danger">{tx.rejectionReason}</td>
                  </tr>
                )}
              </tbody>
            </table>

            {tx.receiptImageUrl && (
              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-2">Receipt</p>
                <a href={tx.receiptImageUrl} target="_blank" rel="noreferrer">
                  <img src={tx.receiptImageUrl} alt="receipt" className="max-h-64 border rounded" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Status timeline */}
          <div className="box">
            <div className="box-header"><h6 className="box-title mb-0">Timeline</h6></div>
            <div className="box-body">
              <ol className="relative border-s border-gray-200 ms-3 space-y-4">
                <li className="ms-4">
                  <div className="absolute w-3 h-3 bg-primary rounded-full -start-1.5 mt-1.5"></div>
                  <p className="text-sm font-semibold">Initiated</p>
                  <p className="text-xs text-gray-500">{new Date(tx.createdAt).toLocaleString('en-NP')}</p>
                </li>
                {isConnectIps && (
                  <li className="ms-4">
                    <div className={`absolute w-3 h-3 rounded-full -start-1.5 mt-1.5 ${tx.status === 'Pending' ? 'bg-gray-300' : 'bg-success'}`}></div>
                    <p className="text-sm font-semibold">NCHL Gateway redirect</p>
                    <p className="text-xs text-gray-500">{tx.status === 'Pending' ? 'Awaiting callback' : 'Customer returned'}</p>
                  </li>
                )}
                <li className="ms-4">
                  <div className={`absolute w-3 h-3 rounded-full -start-1.5 mt-1.5 ${
                    tx.status === 'Verified' ? 'bg-success'
                    : tx.status === 'Rejected' ? 'bg-danger'
                    : 'bg-gray-300'}`}></div>
                  <p className="text-sm font-semibold">
                    {tx.status === 'Verified' ? 'Verified — wallet credited' :
                     tx.status === 'Rejected' ? 'Rejected' :
                     'Awaiting verification'}
                  </p>
                  {tx.verifiedAt && <p className="text-xs text-gray-500">{new Date(tx.verifiedAt).toLocaleString('en-NP')}</p>}
                </li>
              </ol>
            </div>
          </div>

          {/* ConnectIPS info */}
          {isConnectIps && (
            <div className="box">
              <div className="box-header"><h6 className="box-title mb-0">ConnectIPS</h6></div>
              <div className="box-body space-y-2 text-xs">
                <div>
                  <span className="text-gray-500">NCHL TXNID:</span>
                  <div className="font-mono font-semibold break-all">{tx.connectIpsTransactionId}</div>
                </div>
                <div className="pt-2 border-t">
                  <Link href="/access/connectips-probe" className="text-primary hover:underline">
                    Open ConnectIPS Probe →
                  </Link>
                  <p className="text-[10px] text-gray-400 mt-1">For a fresh probe run with the full request/response trace.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* NCHL conversation log */}
      {isConnectIps && tx.callLogs && tx.callLogs.length > 0 && (
        <div className="box mt-6">
          <div className="box-header">
            <h6 className="box-title mb-0">NCHL conversation ({tx.callLogs.length} {tx.callLogs.length === 1 ? 'event' : 'events'})</h6>
          </div>
          <div className="box-body">
            <ol className="relative border-s border-gray-200 ms-3 space-y-5">
              {tx.callLogs.map(log => (
                <li key={log.id} className="ms-4">
                  <div className={`absolute w-3 h-3 rounded-full -start-1.5 mt-1.5 ${
                    log.callType === 'CallbackReceived' ? 'bg-info'
                    : (log.status || '').toUpperCase() === 'SUCCESS' ? 'bg-success'
                    : (log.status || '').toUpperCase() === 'ERROR' || (log.status || '').toUpperCase() === 'FAILED' ? 'bg-danger'
                    : 'bg-primary'
                  }`}></div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{log.callType}</span>
                    {log.httpStatus !== null && log.httpStatus !== undefined && (
                      <span className="font-mono text-xs text-gray-500">HTTP {log.httpStatus}</span>
                    )}
                    {log.status && (
                      <span className={`badge bg-${nchlStatusColor(log.status)}/20 text-${nchlStatusColor(log.status)} text-[10px] px-2 py-0.5 rounded`}>
                        {log.status}{log.statusDesc ? ` / ${log.statusDesc}` : ''}
                      </span>
                    )}
                    <span className="text-xs text-gray-400 ms-auto">{new Date(log.createdAt).toLocaleString('en-NP')}</span>
                  </div>
                  <div className="mt-2 space-y-1 text-xs">
                    {log.canonical && (
                      <details>
                        <summary className="cursor-pointer text-primary">Canonical signed</summary>
                        <CodeBlock>{log.canonical}</CodeBlock>
                      </details>
                    )}
                    {log.signedToken && (
                      <details>
                        <summary className="cursor-pointer text-primary">Signed token</summary>
                        <CodeBlock>{log.signedToken}</CodeBlock>
                      </details>
                    )}
                    {log.requestBody && (
                      <details>
                        <summary className="cursor-pointer text-primary">Request body</summary>
                        <CodeBlock>{log.requestBody}</CodeBlock>
                      </details>
                    )}
                    {log.responseBody && (
                      <details>
                        <summary className="cursor-pointer text-primary">Response body</summary>
                        <CodeBlock>{log.responseBody}</CodeBlock>
                      </details>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {/* Re-verify response */}
      {reverify?.data && (
        <div className="box mt-6">
          <div className="box-header flex items-center justify-between">
            <h6 className="box-title mb-0">NCHL re-verify response</h6>
            <span className={`badge bg-${nchlStatusColor(reverify.data.probe.status)}/20 text-${nchlStatusColor(reverify.data.probe.status)} px-2 py-0.5 rounded text-xs`}>
              {reverify.data.probe.status} / {reverify.data.probe.statusDesc}
            </span>
          </div>
          <div className="box-body space-y-3 text-xs">
            <div>
              <span className="text-gray-500">HTTP:</span> <span className="font-mono font-semibold">{reverify.data.probe.httpStatus}</span>
              {' · '}
              <span className="text-gray-500">URL:</span> <span className="font-mono">{reverify.data.probe.validateUrl}</span>
            </div>
            {reverify.data.wasUpdated && (
              <div className="p-3 bg-success/10 border border-success/30 rounded text-success">
                <i className="ri-check-line me-1"></i>
                Status was <strong>Pending</strong>; NCHL returned <strong>SUCCESS</strong>; wallet credited and status set to <strong>{reverify.data.newStatus}</strong>.
              </div>
            )}
            {!reverify.data.wasUpdated && (
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded text-blue-800">
                <i className="ri-information-line me-1"></i>
                No state change — current status is <strong>{reverify.data.newStatus}</strong>.
              </div>
            )}
            <details>
              <summary className="cursor-pointer text-primary">Canonical bytes signed</summary>
              <CodeBlock>{reverify.data.probe.canonical}</CodeBlock>
            </details>
            <details>
              <summary className="cursor-pointer text-primary">Signed token (base64)</summary>
              <CodeBlock>{reverify.data.probe.signedToken}</CodeBlock>
            </details>
            <details>
              <summary className="cursor-pointer text-primary">Request body</summary>
              <CodeBlock>{reverify.data.probe.requestBody}</CodeBlock>
            </details>
            <details open>
              <summary className="cursor-pointer text-primary">NCHL response body</summary>
              <CodeBlock>{reverify.data.probe.responseBody}</CodeBlock>
            </details>
          </div>
        </div>
      )}
    </Fragment>
  );
}
