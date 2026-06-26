'use client';

import { Fragment, useRef, useState } from 'react';
import Link from 'next/link';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { getAuthHeaders } from '@/shared/services/apiConfig';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL;

type InitiateResponse = {
  success: boolean;
  transactionId?: string;
  connectIpsTransactionId?: string;
  gatewayUrl?: string;
  gatewayRedirectUrl?: string;
  token?: string;
  formFields?: Record<string, string>;
  amount?: number;
  message?: string;
};

type ProbeResponse = {
  success: boolean;
  data?: {
    validateUrl: string;
    canonical: string;
    signedToken: string;
    requestBody: string;
    httpStatus: number;
    responseBody: string;
    status: string;
    statusDesc: string;
  };
  message?: string;
};

const NCHL_GATEWAY_URL = 'https://uat.connectips.com/connectipswebgw/loginpage';

function CodeBlock({ children, mono = true }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <pre className={`text-xs p-3 bg-gray-50 border rounded overflow-x-auto ${mono ? 'font-mono' : ''}`} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
      {children}
    </pre>
  );
}

function StatusPill({ status }: { status: string }) {
  const s = status.toUpperCase();
  const cls = s === 'SUCCESS' ? 'bg-success/20 text-success'
            : s === 'ERROR'   ? 'bg-danger/20 text-danger'
            : s === 'FAILED'  ? 'bg-danger/20 text-danger'
            : 'bg-gray-300 text-gray-700';
  return <span className={`badge ${cls} text-xs px-2 py-0.5 rounded`}>{status || '—'}</span>;
}

export default function ConnectIpsProbePage() {
  useProtectedRoute();
  const [amount, setAmount] = useState(100);
  const [initiating, setInitiating] = useState(false);
  const [initResult, setInitResult] = useState<InitiateResponse | null>(null);
  const [probing, setProbing] = useState(false);
  const [probeResult, setProbeResult] = useState<ProbeResponse | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const initiate = async () => {
    setInitiating(true);
    setProbeResult(null);
    try {
      const r = await fetch(`${API}/credits/connectips/initiate`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });
      const d = await r.json();
      setInitResult(d);
      if (!r.ok || d?.success === false) toast.error(d?.message || 'Initiate failed');
      else toast.success(`Initiated TXNID ${d?.connectIpsTransactionId}`);
    } catch (e: any) {
      toast.error(e?.message || 'Initiate failed');
    } finally { setInitiating(false); }
  };

  const submitToGateway = () => {
    if (!formRef.current) return;
    formRef.current.submit();
  };

  const probeValidate = async () => {
    if (!initResult?.connectIpsTransactionId || !initResult.amount) return;
    setProbing(true);
    try {
      const r = await fetch(`${API}/admin/connectips/probe-validatetxn`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ txnId: initResult.connectIpsTransactionId, amount: initResult.amount }),
      });
      const d = await r.json();
      setProbeResult(d);
      if (!r.ok || d?.success === false) toast.error(d?.message || 'Probe failed');
      else toast.success(`validatetxn → ${d?.data?.status} / ${d?.data?.statusDesc}`);
    } catch (e: any) {
      toast.error(e?.message || 'Probe failed');
    } finally { setProbing(false); }
  };

  const reset = () => { setInitResult(null); setProbeResult(null); };

  const fields = initResult?.formFields;
  const txnId = initResult?.connectIpsTransactionId;

  return (
    <Fragment>
      <div className="md:flex items-center justify-between my-[1.5rem]">
        <div>
          <p className="font-semibold text-[1.125rem] !mb-0">ConnectIPS UAT Probe</p>
          <p className="text-[0.813rem] text-[#8c9097]">
            Three-step walk-through of the NCHL ConnectIPS flow for debugging / NCHL support tickets.
            <Link href="/settings/operations" className="text-primary ms-2">View env switch →</Link>
          </p>
        </div>
        {(initResult || probeResult) && (
          <button onClick={reset} className="ti-btn ti-btn-light !opacity-100 mt-2 md:mt-0">
            <i className="ri-restart-line me-1"></i>Reset
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Step 1 — Initiate */}
        <div className={`box ${initResult ? 'border-success/40' : ''}`}>
          <div className="box-header flex items-center justify-between">
            <h6 className="box-title mb-0">
              <span className={`inline-block w-6 h-6 rounded-full text-center text-xs leading-6 me-2 ${initResult ? 'bg-success text-white' : 'bg-gray-200 text-gray-700'}`}>1</span>
              Initiate
            </h6>
            {initResult && <i className="ri-check-line text-success text-xl"></i>}
          </div>
          <div className="box-body space-y-3">
            <p className="text-xs text-gray-500">Our backend signs the 11-field gateway token with <code>CREDITOR.pfx</code> and returns the form fields + TXNID.</p>
            <div>
              <label className="form-label">Amount (NPR)</label>
              <input
                type="number"
                min="1"
                value={amount}
                onChange={e => setAmount(Number(e.target.value) || 0)}
                className="form-control font-mono"
                disabled={!!initResult}
              />
            </div>
            <button
              onClick={initiate}
              disabled={initiating || !!initResult || amount <= 0}
              className="ti-btn ti-btn-primary-full !text-white !opacity-100 disabled:!opacity-50 w-full"
            >
              {initiating ? <><i className="ri-loader-4-line animate-spin me-1"></i>Initiating…</> : <><i className="ri-flashlight-line me-1"></i>Run /initiate</>}
            </button>

            {initResult?.success && (
              <div className="text-xs space-y-1 pt-2 border-t">
                <div><span className="text-gray-500">TXNID:</span> <span className="font-mono font-semibold">{initResult.connectIpsTransactionId}</span></div>
                <div><span className="text-gray-500">REFERENCEID:</span> <span className="font-mono">{fields?.REFERENCEID}</span></div>
                <div><span className="text-gray-500">TXNAMT (paisa):</span> <span className="font-mono">{fields?.TXNAMT}</span></div>
                <details className="mt-2">
                  <summary className="cursor-pointer text-primary">Show all 13 form fields</summary>
                  <CodeBlock>{Object.entries(fields || {}).map(([k, v]) => `${k.padEnd(12)} = ${v}`).join('\n')}</CodeBlock>
                </details>
              </div>
            )}
          </div>
        </div>

        {/* Step 2 — Gateway POST */}
        <div className={`box ${probeResult ? 'border-success/40' : initResult ? 'border-primary/40' : ''}`}>
          <div className="box-header">
            <h6 className="box-title mb-0">
              <span className={`inline-block w-6 h-6 rounded-full text-center text-xs leading-6 me-2 ${initResult ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700'}`}>2</span>
              Submit to NCHL Gateway
            </h6>
          </div>
          <div className="box-body space-y-3">
            <p className="text-xs text-gray-500">Opens the bank login page in a new tab. POSTs all 13 signed fields directly to NCHL — this is what the customer's browser does in production.</p>

            {fields && (
              <form ref={formRef} action={NCHL_GATEWAY_URL} method="POST" target="_blank">
                {Object.entries(fields).map(([k, v]) => (
                  <input key={k} type="hidden" name={k} value={v} />
                ))}
              </form>
            )}

            <button
              onClick={submitToGateway}
              disabled={!initResult}
              className="ti-btn ti-btn-primary-full !text-white !opacity-100 disabled:!opacity-50 w-full"
            >
              <i className="ri-external-link-line me-1"></i>POST to NCHL → opens tab
            </button>

            {initResult && (
              <div className="text-xs text-gray-500 pt-2 border-t">
                <p>After login, NCHL redirects the new tab to:</p>
                <CodeBlock>{`SUCCESSURL = ${fields?.SUCCESSURL}\nFAILUREURL = ${fields?.FAILUREURL}`}</CodeBlock>
                <p className="mt-2"><i className="ri-information-line me-1"></i>Without UAT test-bank credentials, you'll see the bank login page but cannot complete the debit. Step 3 will still return <code>TRANSACTION NOT FOUND</code> until a real bank debit happens.</p>
              </div>
            )}
          </div>
        </div>

        {/* Step 3 — validatetxn */}
        <div className={`box ${probeResult?.data ? 'border-success/40' : initResult ? 'border-primary/40' : ''}`}>
          <div className="box-header flex items-center justify-between">
            <h6 className="box-title mb-0">
              <span className={`inline-block w-6 h-6 rounded-full text-center text-xs leading-6 me-2 ${probeResult?.data ? 'bg-success text-white' : 'bg-gray-200 text-gray-700'}`}>3</span>
              Probe /validatetxn
            </h6>
            {probeResult?.data && <StatusPill status={probeResult.data.status} />}
          </div>
          <div className="box-body space-y-3">
            <p className="text-xs text-gray-500">Signs the 4-field canonical (TXNID in REFERENCEID slot) and POSTs to NCHL's <code>/validatetxn</code>. Server-side proxy keeps cert + Basic Auth off the browser.</p>

            <button
              onClick={probeValidate}
              disabled={probing || !txnId}
              className="ti-btn ti-btn-primary-full !text-white !opacity-100 disabled:!opacity-50 w-full"
            >
              {probing ? <><i className="ri-loader-4-line animate-spin me-1"></i>Calling NCHL…</> : <><i className="ri-search-line me-1"></i>Call /validatetxn</>}
            </button>

            {probeResult?.data && (
              <div className="space-y-2 pt-2 border-t text-xs">
                <div>
                  <span className="text-gray-500">HTTP:</span> <span className="font-mono font-semibold">{probeResult.data.httpStatus}</span>
                  {' · '}
                  <span className="text-gray-500">statusDesc:</span> <span className="font-mono">{probeResult.data.statusDesc}</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <details>
                    <summary className="cursor-pointer text-primary">Canonical bytes signed</summary>
                    <CodeBlock>{probeResult.data.canonical}</CodeBlock>
                  </details>
                  <details>
                    <summary className="cursor-pointer text-primary">Signed token (base64)</summary>
                    <CodeBlock>{probeResult.data.signedToken}</CodeBlock>
                  </details>
                  <details>
                    <summary className="cursor-pointer text-primary">Request body</summary>
                    <CodeBlock>{probeResult.data.requestBody}</CodeBlock>
                  </details>
                  <details open>
                    <summary className="cursor-pointer text-primary">NCHL response body</summary>
                    <CodeBlock>{probeResult.data.responseBody}</CodeBlock>
                  </details>
                </div>
              </div>
            )}
            {probeResult && !probeResult.success && (
              <div className="p-3 bg-danger/10 border border-danger/30 rounded text-xs text-danger">
                <i className="ri-error-warning-line me-1"></i>
                {probeResult.message || 'Probe failed'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interpretation help */}
      <div className="box mt-6">
        <div className="box-header"><h6 className="box-title mb-0">Interpreting NCHL responses</h6></div>
        <div className="box-body text-xs">
          <table className="table w-full">
            <thead>
              <tr className="text-xs text-gray-500 uppercase">
                <th className="text-left p-2">statusDesc</th>
                <th className="text-left p-2">What it means</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="p-2 font-mono">TRANSACTION SUCCESSFUL</td>
                <td className="p-2">Bank debit completed + verified. Wallet credit should fire.</td>
              </tr>
              <tr className="border-t">
                <td className="p-2 font-mono">TRANSACTION NOT FOUND</td>
                <td className="p-2"><strong>Expected probe response.</strong> Signature accepted; no bank debit yet. (Either the gateway wasn't POST'd, or the customer hasn't completed bank login.)</td>
              </tr>
              <tr className="border-t">
                <td className="p-2 font-mono">TRANSACTION INCOMPLETE</td>
                <td className="p-2">Bank flow started but not finished — customer abandoned, bank timed out, etc.</td>
              </tr>
              <tr className="border-t">
                <td className="p-2 font-mono">INVALID TOKEN</td>
                <td className="p-2"><strong>Signature failed verification on NCHL side.</strong> Wrong PFX / wrong canonical / wrong field ordering. Compare the canonical bytes above against NCHL spec.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Fragment>
  );
}
