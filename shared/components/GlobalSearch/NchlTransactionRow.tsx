'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { NchlTransactionResult, NchlProbeResult, probeNchlTransaction } from '@/shared/services/searchService';

const HBC_STATUS_STYLE: Record<string, string> = {
  Verified: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Pending:  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
};
const NCHL_STATUS_STYLE: Record<string, string> = {
  SUCCESS: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  FAILED:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  ERROR:   'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

function fmt(amount: number) {
  return `NPR ${amount.toLocaleString('en-NP', { minimumFractionDigits: 2 })}`;
}
function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

interface Props {
  tx: NchlTransactionResult;
  onClose: () => void;
  isFocused: boolean;
}

export default function NchlTransactionRow({ tx, onClose, isFocused }: Props) {
  const router = useRouter();
  const [probing, setProbing] = useState(false);
  const [probe, setProbe] = useState<NchlProbeResult | null>(null);
  const [probeError, setProbeError] = useState<string | null>(null);
  const [liveHbcStatus, setLiveHbcStatus] = useState(tx.hbcStatus);

  const handleProbe = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setProbing(true);
    setProbeError(null);
    try {
      const result = await probeNchlTransaction(tx.localId);
      setProbe(result.probe);
      setLiveHbcStatus(result.hbcStatus);
      // Auto-navigate to detail if status flipped to Verified
      if (result.probe.status === 'SUCCESS' && result.hbcStatus === 'Verified') {
        setTimeout(() => {
          router.push(`/credits/${tx.localId}`);
          onClose();
        }, 1800);
      }
    } catch (err: any) {
      setProbeError(err.message ?? 'Probe failed');
    } finally {
      setProbing(false);
    }
  };

  const handleViewDetail = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/credits/${tx.localId}`);
    onClose();
  };

  return (
    <div className={`rounded-xl border p-3 transition-colors ${
      isFocused
        ? 'border-primary/60 bg-primary/5 dark:bg-primary/10'
        : 'border-defaultborder dark:border-defaultborder/10 bg-white dark:bg-bodybg2/60'
    }`}>
      {/* Row header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[0.75rem] font-semibold text-defaulttextcolor dark:text-defaulttextcolor/80 truncate">
              {tx.nchlTxnId || tx.localId}
            </span>
            {tx.nchlTxnId && (
              <span className="text-[0.65rem] text-[#8c9097] bg-light dark:bg-black/20 px-1.5 py-0.5 rounded">
                NCHL TXNID
              </span>
            )}
          </div>
          <div className="text-[0.75rem] text-[#8c9097] mt-0.5">
            {tx.customerName} · {fmt(tx.amount)} · {timeAgo(tx.createdAt)}
          </div>
        </div>
        <i className="ri-bank-card-line text-primary text-lg flex-shrink-0 mt-0.5"></i>
      </div>

      {/* Status row */}
      <div className="flex items-center gap-2 flex-wrap mb-2.5">
        <span className="text-[0.7rem] text-[#8c9097]">HBC:</span>
        <span className={`text-[0.65rem] font-semibold px-2 py-0.5 rounded-full ${HBC_STATUS_STYLE[liveHbcStatus] ?? 'bg-light text-[#8c9097]'}`}>
          {liveHbcStatus}
        </span>

        <span className="text-[#8c9097]">·</span>

        <span className="text-[0.7rem] text-[#8c9097]">NCHL:</span>
        {probe ? (
          <span className={`text-[0.65rem] font-semibold px-2 py-0.5 rounded-full ${NCHL_STATUS_STYLE[probe.status] ?? 'bg-light text-[#8c9097]'}`}>
            {probe.status}
          </span>
        ) : (
          <span className="text-[0.65rem] text-[#8c9097]">—</span>
        )}

        {tx.verifyAttempts > 0 && (
          <span className="text-[0.65rem] text-[#8c9097] ml-auto">
            {tx.verifyAttempts} attempt{tx.verifyAttempts !== 1 ? 's' : ''}
            {tx.lastCallType ? ` · Last: ${tx.lastCallType}` : ''}
          </span>
        )}
      </div>

      {/* Probe result description */}
      {probe && (
        <div className={`text-[0.72rem] mb-2.5 px-2 py-1.5 rounded-lg ${
          probe.status === 'SUCCESS'
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
        }`}>
          {probe.statusDesc}
          {probe.status === 'SUCCESS' && liveHbcStatus === 'Verified' && (
            <span className="ml-2 font-semibold">→ Wallet credited. Navigating…</span>
          )}
        </div>
      )}

      {probeError && (
        <div className="text-[0.72rem] text-red-600 dark:text-red-400 mb-2.5 px-2 py-1.5 bg-red-50 dark:bg-red-900/20 rounded-lg">
          {probeError}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleProbe}
          disabled={probing}
          className="flex items-center gap-1.5 text-[0.72rem] font-medium px-2.5 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50 transition-colors"
        >
          {probing
            ? <><i className="ri-loader-4-line animate-spin text-xs"></i> Probing NCHL…</>
            : <><i className="ri-wireless-charging-line text-xs"></i> {probe ? 'Re-probe NCHL' : 'Probe NCHL'}</>}
        </button>
        <button
          onClick={handleViewDetail}
          className="flex items-center gap-1.5 text-[0.72rem] font-medium px-2.5 py-1 rounded-lg bg-light dark:bg-black/20 text-[#8c9097] hover:text-defaulttextcolor hover:bg-defaultborder/20 transition-colors"
        >
          <i className="ri-external-link-line text-xs"></i> View Detail
        </button>
      </div>
    </div>
  );
}
