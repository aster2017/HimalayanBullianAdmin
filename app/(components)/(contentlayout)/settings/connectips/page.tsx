'use client';

import { useEffect, useState } from 'react';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { useDialog } from '@/shared/context/DialogContext';
import { ConnectIpsService, ConnectIpsConfig, ConnectIpsProbeResult } from '@/shared/services/connectipsService';
import toast from 'react-hot-toast';

export default function ConnectIpsProbePage() {
  useProtectedRoute();
  const { confirm } = useDialog();

  const [config, setConfig] = useState<ConnectIpsConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  const [txnId, setTxnId] = useState('');
  const [amount, setAmount] = useState(10);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ConnectIpsProbeResult | null>(null);
  const [probeError, setProbeError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  // Pre-fill a unique probe reference each load.
  useEffect(() => {
    setTxnId(`HBCPROBE-${Date.now()}`);
    (async () => {
      try {
        setConfig(await ConnectIpsService.getConfig());
      } catch (e: any) {
        setConfigError(e?.response?.status === 403 ? 'You do not have permission to view ConnectIPS diagnostics.' : (e?.message || 'Failed to load config'));
      } finally {
        setLoadingConfig(false);
      }
    })();
  }, []);

  const isProd = config?.environment === 'Production';

  const runProbe = async () => {
    if (!txnId.trim() || amount <= 0) { toast.error('Enter a reference id and a positive amount.'); return; }
    if (isProd) {
      const ok = await confirm(
        'This calls the LIVE NCHL production gateway. It is read-only (a status query for the reference below) — no money moves. Continue?',
        { title: 'Probe PRODUCTION gateway?', variant: 'danger', confirmLabel: 'Run probe' }
      );
      if (!ok) return;
    }
    setRunning(true); setResult(null); setProbeError(null);
    try {
      const r = await ConnectIpsService.probeValidateTxn(txnId.trim(), amount);
      setResult(r);
    } catch (e: any) {
      setProbeError(e?.message || 'Probe failed');
    } finally {
      setRunning(false);
    }
  };

  // PASS = NCHL accepted Basic Auth + signature (HTTP 200). "TRANSACTION NOT
  // FOUND" for a random ref is the EXPECTED healthy result.
  const pass = result?.httpStatus === 200;

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <i className="bx bx-credit-card-front text-primary" /> ConnectIPS / NCHL Probe
          </h1>
          <p className="text-sm text-gray-500">Verify cert + Basic Auth + signature against NCHL — for this API&apos;s configured environment.</p>
        </div>
      </div>

      {/* Environment banner */}
      {!loadingConfig && config && (
        <div className={`rounded-md px-4 py-3 mb-4 border flex items-center gap-3 ${isProd ? 'bg-red-50 border-red-300 text-red-800' : 'bg-emerald-50 border-emerald-300 text-emerald-800'}`}>
          <i className={`bx ${isProd ? 'bx-error-circle' : 'bx-check-shield'} text-xl`} />
          <div className="text-sm">
            <b>{isProd ? 'PRODUCTION' : 'UAT'}</b> — probes will hit{' '}
            <code className="px-1 bg-white/60 rounded">{config.validateUrl}</code>
            {isProd && <span className="font-semibold"> (live gateway — read-only)</span>}
            {config.mockMode && <span className="ml-2 px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-xs">MockMode ON — NCHL is bypassed</span>}
          </div>
        </div>
      )}
      {configError && (
        <div className="rounded-md px-4 py-3 mb-4 border bg-amber-50 border-amber-300 text-amber-800 text-sm">{configError}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Config card */}
        <div className="box">
          <div className="box-header"><h5 className="box-title">Active Configuration</h5></div>
          <div className="box-body">
            {loadingConfig ? <p className="text-sm text-gray-500">Loading…</p> : config ? (
              <dl className="text-sm divide-y">
                {([
                  ['Environment', config.environment],
                  ['App ID', config.appId],
                  ['Merchant ID', config.merchantId],
                  ['App Name', config.appName],
                  ['Gateway URL', config.gatewayUrl],
                  ['Validate URL', config.validateUrl],
                  ['Mock Mode', config.mockMode ? 'ON' : 'off'],
                ] as [string, string][]).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 py-1.5">
                    <dt className="text-gray-500">{k}</dt>
                    <dd className="font-medium text-right break-all">{v}</dd>
                  </div>
                ))}
              </dl>
            ) : <p className="text-sm text-gray-500">Unavailable.</p>}
          </div>
        </div>

        {/* Probe form */}
        <div className="box">
          <div className="box-header"><h5 className="box-title">Run validatetxn Probe</h5></div>
          <div className="box-body space-y-3">
            <div>
              <label className="form-label text-sm">Reference / TXNID</label>
              <input className="form-control" value={txnId} onChange={e => setTxnId(e.target.value)} placeholder="HBCPROBE-…" />
              <p className="text-xs text-gray-400 mt-1">A random/unknown reference is fine — we&apos;re testing auth + signing, not a real txn.</p>
            </div>
            <div>
              <label className="form-label text-sm">Amount (NPR)</label>
              <input type="number" min={1} className="form-control" value={amount} onChange={e => setAmount(Number(e.target.value))} />
            </div>
            <button className={`ti-btn ${isProd ? 'ti-btn-danger' : 'ti-btn-primary'} w-full`} onClick={runProbe} disabled={running || loadingConfig}>
              {running ? <><i className="bx bx-loader bx-spin mr-1" /> Probing…</> : <><i className="bx bx-broadcast mr-1" /> Run Probe{isProd ? ' (PRODUCTION)' : ''}</>}
            </button>
          </div>
        </div>
      </div>

      {/* Result */}
      {(result || probeError) && (
        <div className="box mt-4">
          <div className="box-header"><h5 className="box-title">Result</h5></div>
          <div className="box-body">
            {probeError ? (
              <div className="rounded-md px-4 py-3 border bg-red-50 border-red-300 text-red-800 text-sm">
                <b>FAIL</b> — {probeError}
              </div>
            ) : result && (
              <>
                <div className={`rounded-md px-4 py-3 border mb-3 ${pass ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-red-50 border-red-300 text-red-800'}`}>
                  <div className="flex items-center gap-2 font-semibold">
                    <i className={`bx ${pass ? 'bx-check-circle' : 'bx-x-circle'} text-lg`} />
                    {pass ? 'PASS — cert + Basic Auth + signature accepted by NCHL' : `FAIL — HTTP ${result.httpStatus}`}
                  </div>
                  {pass && (result.statusDesc || '').toUpperCase().includes('NOT FOUND') && (
                    <p className="text-xs mt-1">“TRANSACTION NOT FOUND” is the expected healthy reply for a random reference — the round-trip works.</p>
                  )}
                  {!pass && (
                    <p className="text-xs mt-1">401 = Basic Auth wrong · 404 = wrong gateway URL · other = cert/signature error.</p>
                  )}
                </div>
                <dl className="text-sm divide-y">
                  {([
                    ['HTTP status', String(result.httpStatus)],
                    ['Status', result.status],
                    ['Status desc', result.statusDesc],
                    ['Validate URL', result.validateUrl],
                    ['Canonical (signed bytes)', result.canonical],
                  ] as [string, string][]).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3 py-1.5">
                      <dt className="text-gray-500">{k}</dt>
                      <dd className="font-medium text-right break-all">{v}</dd>
                    </div>
                  ))}
                </dl>
                <button className="text-xs text-primary mt-2" onClick={() => setShowRaw(v => !v)}>
                  {showRaw ? 'Hide' : 'Show'} raw NCHL response
                </button>
                {showRaw && (
                  <pre className="mt-2 p-3 bg-gray-50 border rounded text-xs overflow-auto whitespace-pre-wrap break-all">{result.responseBody}</pre>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
