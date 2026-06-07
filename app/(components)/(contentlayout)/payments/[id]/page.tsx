'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import apiClient from '@/shared/services/apiClient';
import toast from 'react-hot-toast';

// ── helpers ───────────────────────────────────────────────────────────────────
function avatarColor(name: string) {
  const colors = ['#C8A86B','#7c3aed','#0891b2','#16a34a','#dc2626','#d97706','#db2777','#2563eb'];
  let h = 0; for (let i = 0; i < (name||'').length; i++) h = name.charCodeAt(i) + ((h<<5)-h);
  return colors[Math.abs(h) % colors.length];
}
function avatarInitials(name: string) {
  const p = (name||'').trim().split(' ');
  return ((p[0]?.[0]||'') + (p[1]?.[0]||'')).toUpperCase() || '?';
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
}
function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) + ' · ' +
    d.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
}
function relativeTime(iso: string) {
  const days = Math.floor((Date.now()-new Date(iso).getTime())/86_400_000);
  if (days===0) return 'Today'; if (days===1) return 'Yesterday';
  if (days<30)  return `${days}d ago`;
  const mo = Math.floor(days/30); if (mo<12) return `${mo}mo ago`;
  return `${Math.floor(mo/12)}y ago`;
}

const METHOD_STYLES: Record<string,{bg:string;text:string;icon:string}> = {
  Cash:        {bg:'#dcfce7',text:'#16a34a',icon:'ri-money-dollar-circle-line'},
  BankTransfer:{bg:'#dbeafe',text:'#2563eb',icon:'ri-bank-line'},
  Card:        {bg:'#ede9fe',text:'#7c3aed',icon:'ri-bank-card-line'},
  ConnectIPS:  {bg:'#fef3c7',text:'#d97706',icon:'ri-shield-check-line'},
  QRCode:      {bg:'#e0f2fe',text:'#0891b2',icon:'ri-qr-code-line'},
  Credits:     {bg:'#fdf2f8',text:'#db2777',icon:'ri-wallet-line'},
  PayAtStore:  {bg:'#f1f5f9',text:'#64748b',icon:'ri-store-2-line'},
};
const STATUS_STYLES: Record<string,{bg:string;text:string;icon:string}> = {
  Completed:  {bg:'#dcfce7',text:'#16a34a',icon:'ri-checkbox-circle-line'},
  Pending:    {bg:'#fef3c7',text:'#d97706',icon:'ri-time-line'},
  Processing: {bg:'#e0f2fe',text:'#0891b2',icon:'ri-loader-4-line'},
  Refunded:   {bg:'#dbeafe',text:'#2563eb',icon:'ri-arrow-go-back-line'},
  Cancelled:  {bg:'#fee2e2',text:'#dc2626',icon:'ri-close-circle-line'},
  Failed:     {bg:'#fee2e2',text:'#dc2626',icon:'ri-error-warning-line'},
};
const SYNC_STYLES: Record<string,{bg:string;text:string;icon:string}> = {
  Pending:  {bg:'#fef3c7',text:'#d97706',icon:'ri-time-line'},
  InProgress:{bg:'#e0f2fe',text:'#0891b2',icon:'ri-loader-4-line'},
  Success:  {bg:'#dcfce7',text:'#16a34a',icon:'ri-check-line'},
  Failed:   {bg:'#fee2e2',text:'#dc2626',icon:'ri-error-warning-line'},
};
const METHOD_LABELS: Record<string,string> = {
  BankTransfer:'Bank Transfer', ConnectIPS:'ConnectIPS',
  QRCode:'QR Code', PayAtStore:'Pay at Store',
};
function methodLabel(m: string) { return METHOD_LABELS[m] || m; }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-1">{label}</p>
      <div className="text-[0.85rem] font-semibold text-defaulttextcolor">{children}</div>
    </div>
  );
}

export default function PaymentDetailPage() {
  useProtectedRoute();
  const params  = useParams();
  const router  = useRouter();
  const id      = params.id as string;

  const [payment,      setPayment]      = useState<any>(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string|null>(null);
  const [busy,         setBusy]         = useState<string|null>(null);
  const [voidOpen,     setVoidOpen]     = useState(false);
  const [voidReason,   setVoidReason]   = useState('');
  const [refundOpen,   setRefundOpen]   = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');

  const fetchPayment = async () => {
    try {
      const res = await apiClient.get(`/payments/${id}`);
      setPayment(res.data?.data || res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Payment not found');
    } finally { setLoading(false); }
  };

  useEffect(() => { if (id) fetchPayment(); }, [id]);

  const voidPayment = async () => {
    if (!voidReason.trim()) { toast.error('Reason is required'); return; }
    setBusy('void');
    try {
      const r = await apiClient.post(`/payments/${id}/void`, { reason: voidReason });
      if (r.data?.success) {
        toast.success(r.data.message || 'Payment voided');
        setVoidOpen(false); setVoidReason(''); fetchPayment();
      } else toast.error(r.data?.message || 'Void failed');
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Void failed'); }
    finally { setBusy(null); }
  };

  const refundPayment = async () => {
    const amount = Number(refundAmount);
    if (!amount || amount <= 0) { toast.error('Enter a positive amount'); return; }
    if (!refundReason.trim())   { toast.error('Reason is required'); return; }
    setBusy('refund');
    try {
      const r = await apiClient.post(`/payments/${id}/refund`, { amount, reason: refundReason });
      if (r.data?.success) {
        toast.success(r.data.message || `Refund of Rs. ${amount.toLocaleString()} created`);
        setRefundOpen(false); setRefundAmount(''); setRefundReason(''); fetchPayment();
      } else toast.error(r.data?.message || 'Refund failed');
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Refund failed'); }
    finally { setBusy(null); }
  };

  // ── loading / error states ────────────────────────────────────────────────
  if (loading) return (
    <div className="page-content">
      <div className="container-fluid pt-20 flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{background:'#fdf8ee'}}>
          <i className="ri-loader-4-line animate-spin text-2xl" style={{color:'#C8A86B'}}/>
        </div>
        <p className="text-[#94a3b8] text-sm">Loading payment…</p>
      </div>
    </div>
  );
  if (error || !payment) return (
    <div className="page-content">
      <div className="container-fluid pt-20 text-center">
        <p className="text-defaulttextcolor font-semibold mb-2">{error || 'Payment not found'}</p>
        <Link href="/payments" className="text-[#C8A86B] hover:underline text-sm">← Back to Payments</Link>
      </div>
    </div>
  );

  const ss  = STATUS_STYLES[payment.status]  || {bg:'#f1f5f9',text:'#64748b',icon:'ri-question-line'};
  const ms  = METHOD_STYLES[payment.paymentMethod] || {bg:'#f1f5f9',text:'#64748b',icon:'ri-bank-card-line'};
  const syncS = SYNC_STYLES[payment.syncStatus] || {bg:'#f1f5f9',text:'#64748b',icon:'ri-question-line'};
  const ac  = avatarColor(payment.customerName||'');
  const ai  = avatarInitials(payment.customerName||'');
  const isNeg = payment.amount < 0;
  const canAct = payment.status !== 'Cancelled' && payment.status !== 'Refunded' && payment.amount > 0;
  const refundPct = payment.amount > 0 ? Math.round((Number(refundAmount)/payment.amount)*100) : 0;

  return (
    <div className="page-content">
      <div className="container-fluid">

        {/* ── Zone 1: Header ── */}
        <div className="box p-5 my-[1.5rem]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button onClick={()=>router.back()}
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-defaultborder text-[#64748b] hover:border-[#C8A86B] hover:text-[#C8A86B] transition-colors flex-shrink-0">
                <i className="ri-arrow-left-s-line text-sm"/>
              </button>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-bold text-[1.1rem] text-defaulttextcolor mb-0">
                    Payment #{payment.paymentNumber}
                  </h2>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                    style={{background:ss.bg,color:ss.text}}>
                    <i className={`${ss.icon} mr-1`}/>{payment.status}
                  </span>
                </div>
                <p className="text-[0.78rem] text-[#94a3b8] mt-0.5 mb-0">
                  {fmtDateTime(payment.paymentDate)} · {methodLabel(payment.paymentMethod)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {canAct && (
                <>
                  <button onClick={()=>{setRefundAmount(String(payment.amount));setRefundOpen(true);}}
                    disabled={!!busy}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg text-white disabled:opacity-50"
                    style={{background:'linear-gradient(135deg,#d97706 0%,#b45309 100%)'}}>
                    <i className="ri-arrow-go-back-line"/>Refund
                  </button>
                  <button onClick={()=>setVoidOpen(true)} disabled={!!busy}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg border transition-colors disabled:opacity-50"
                    style={{borderColor:'#dc2626',color:'#dc2626',background:'#fee2e2'}}>
                    <i className="ri-close-circle-line"/>Void
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Zone 2: 3 stat tiles ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Amount */}
          <div className="box p-4 flex items-center gap-3" style={{borderLeft:`3px solid ${isNeg?'#dc2626':'#C8A86B'}`}}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{background:isNeg?'#fee2e2':'#fdf8ee'}}>
              <i className="ri-money-rupee-circle-line" style={{color:isNeg?'#dc2626':'#C8A86B'}}/>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-0.5">
                {isNeg?'Refund Amount':'Amount Paid'}
              </p>
              <p className="text-[1.3rem] font-bold mb-0" style={{color:isNeg?'#dc2626':'#C8A86B'}}>
                {isNeg?'−':''} Rs. {Math.abs(payment.amount||0).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Method */}
          <div className="box p-4 flex items-center gap-3" style={{borderLeft:`3px solid ${ms.text}`}}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:ms.bg}}>
              <i className={ms.icon} style={{color:ms.text}}/>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-0.5">Method</p>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                style={{background:ms.bg,color:ms.text}}>
                {methodLabel(payment.paymentMethod)}
              </span>
            </div>
          </div>

          {/* Sync Status */}
          <div className="box p-4 flex items-center gap-3" style={{borderLeft:`3px solid ${syncS.text}`}}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:syncS.bg}}>
              <i className={`${syncS.icon} ${payment.syncStatus==='InProgress'?'animate-spin':''}`} style={{color:syncS.text}}/>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-0.5">Zoho Sync</p>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                style={{background:syncS.bg,color:syncS.text}}>
                {payment.syncStatus}
              </span>
              {payment.lastSyncedAt && (
                <p className="text-[10px] text-[#94a3b8] mt-0.5 mb-0">Synced {fmtDate(payment.lastSyncedAt)}</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Zone 3: Main grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">

            {/* Payment Details */}
            <div className="box">
              <div className="p-4 border-b border-defaultborder flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{background:'#fdf8ee'}}>
                  <i className="ri-receipt-line text-sm" style={{color:'#C8A86B'}}/>
                </div>
                <div>
                  <p className="font-semibold text-[0.9rem] text-defaulttextcolor mb-0">Payment Details</p>
                  <p className="text-[0.72rem] text-[#94a3b8] mb-0">Recorded {relativeTime(payment.createdAt)}</p>
                </div>
              </div>
              <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-5">
                <Field label="Payment Number">
                  <span className="font-mono">{payment.paymentNumber}</span>
                </Field>
                <Field label="Payment Date">
                  <span>{fmtDate(payment.paymentDate)}</span>
                  <p className="text-[0.72rem] text-[#94a3b8] font-normal mb-0">{relativeTime(payment.paymentDate)}</p>
                </Field>
                <Field label="Status">
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                    style={{background:ss.bg,color:ss.text}}>
                    <i className={`${ss.icon} mr-1`}/>{payment.status}
                  </span>
                </Field>
                <Field label="Invoice">
                  {payment.invoiceNumber ? (
                    <Link href={payment.invoiceId?`/invoices/${payment.invoiceId}`:''}>
                      <span className="font-mono text-[0.85rem] text-[#2563eb] hover:text-[#C8A86B] transition-colors cursor-pointer">{payment.invoiceNumber}</span>
                    </Link>
                  ) : <span className="text-[#cbd5e1] font-normal">—</span>}
                </Field>
                <Field label="Order">
                  {payment.orderNumber ? (
                    <Link href={payment.orderId?`/orders/${payment.orderId}`:''}>
                      <span className="font-mono text-[0.85rem] text-[#2563eb] hover:text-[#C8A86B] transition-colors cursor-pointer">{payment.orderNumber}</span>
                    </Link>
                  ) : <span className="text-[#cbd5e1] font-normal">—</span>}
                </Field>
                <Field label="Transaction ID">
                  {payment.transactionId
                    ? <span className="font-mono text-[0.78rem] break-all">{payment.transactionId}</span>
                    : <span className="text-[#cbd5e1] font-normal">—</span>}
                </Field>
              </div>

              {/* Void reason callout */}
              {payment.voidReason && (
                <div className="mx-4 mb-4 rounded-xl p-3 flex items-start gap-2"
                  style={{background:'#fef3c7',border:'1px solid #fde68a'}}>
                  <i className="ri-close-circle-line mt-0.5 flex-shrink-0" style={{color:'#d97706'}}/>
                  <div>
                    <p className="text-[0.78rem] font-semibold mb-0.5" style={{color:'#92400e'}}>Void Reason</p>
                    <p className="text-[0.78rem] mb-0" style={{color:'#92400e'}}>{payment.voidReason}</p>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="px-4 pb-4">
                <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-1">Notes</p>
                <p className="text-[0.85rem] text-defaulttextcolor mb-0">
                  {payment.notes || <span className="text-[#cbd5e1] font-normal">—</span>}
                </p>
              </div>

              {/* Bank details — shown when BankTransfer */}
              {(payment.bankName || payment.bankAccountNumber) && (
                <div className="px-4 pb-4 pt-3 border-t border-defaultborder">
                  <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-2">Bank Details</p>
                  <div className="grid grid-cols-2 gap-4">
                    {payment.bankName && (
                      <Field label="Bank Name"><span>{payment.bankName}</span></Field>
                    )}
                    {payment.bankAccountNumber && (
                      <Field label="Account Number"><span className="font-mono">{payment.bankAccountNumber}</span></Field>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sync error details */}
            {payment.syncStatus === 'Failed' && payment.syncErrorMessage && (
              <div className="rounded-xl p-4 flex items-start gap-3"
                style={{background:'#fee2e2',border:'1px solid #fca5a5'}}>
                <i className="ri-error-warning-line text-lg mt-0.5 flex-shrink-0" style={{color:'#dc2626'}}/>
                <div>
                  <p className="text-sm font-semibold mb-1" style={{color:'#7f1d1d'}}>Zoho Sync Failed</p>
                  <p className="text-[0.78rem] mb-0 font-mono" style={{color:'#991b1b'}}>{payment.syncErrorMessage}</p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">

            {/* Customer */}
            <div className="box p-4">
              <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-3">Customer</p>
              {payment.customerName ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                    style={{background:ac}}>
                    {ai}
                  </div>
                  <div>
                    <Link href={payment.customerId?`/customers/${payment.customerId}`:''}>
                      <p className="font-semibold text-[0.9rem] text-defaulttextcolor hover:text-[#C8A86B] transition-colors mb-0 cursor-pointer">
                        {payment.customerName}
                      </p>
                    </Link>
                    {payment.customerEmail && (
                      <p className="text-[0.72rem] text-[#94a3b8] mb-0 truncate">{payment.customerEmail}</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-[#cbd5e1] text-sm">No customer linked</p>
              )}
              {payment.customerId && (
                <Link href={`/customers/${payment.customerId}`}>
                  <button className="mt-3 w-full text-sm font-medium text-center py-2 rounded-xl border border-defaultborder text-[#64748b] hover:border-[#C8A86B] hover:text-[#C8A86B] transition-colors">
                    View Customer Profile →
                  </button>
                </Link>
              )}
            </div>

            {/* Zoho */}
            <div className="box p-4">
              <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-3">Zoho CRM</p>
              {payment.zohoPaymentId ? (
                <>
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full w-fit mb-2"
                    style={{background:'#dcfce7',color:'#16a34a'}}>
                    <i className="ri-check-line"/>Synced
                  </span>
                  <p className="font-mono text-[0.72rem] text-[#94a3b8] mb-0 break-all">{payment.zohoPaymentId}</p>
                </>
              ) : (
                <span className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full w-fit"
                  style={{background:syncS.bg,color:syncS.text}}>
                  <i className={syncS.icon}/>{payment.syncStatus}
                </span>
              )}
            </div>

            {/* Quick links */}
            <div className="box p-4 space-y-2">
              <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-3">Quick Links</p>
              {payment.invoiceId && (
                <Link href={`/invoices/${payment.invoiceId}`}>
                  <button className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-defaultborder text-sm text-[#64748b] hover:border-[#C8A86B] hover:text-[#C8A86B] transition-colors">
                    <i className="ri-bill-line"/>View Invoice
                    {payment.invoiceNumber && <span className="font-mono text-[0.72rem] ml-auto text-[#94a3b8]">{payment.invoiceNumber}</span>}
                  </button>
                </Link>
              )}
              {payment.orderId && (
                <Link href={`/orders/${payment.orderId}`}>
                  <button className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-defaultborder text-sm text-[#64748b] hover:border-[#C8A86B] hover:text-[#C8A86B] transition-colors">
                    <i className="ri-shopping-cart-line"/>View Order
                    {payment.orderNumber && <span className="font-mono text-[0.72rem] ml-auto text-[#94a3b8]">{payment.orderNumber}</span>}
                  </button>
                </Link>
              )}
              <Link href="/payments">
                <button className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-defaultborder text-sm text-[#64748b] hover:border-[#C8A86B] hover:text-[#C8A86B] transition-colors">
                  <i className="ri-arrow-left-line"/>Back to Payments
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Void Modal ── */}
      {voidOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-bodybg rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background:'#fee2e2'}}>
                <i className="ri-close-circle-line" style={{color:'#dc2626'}}/>
              </div>
              <div>
                <h3 className="text-[1rem] font-bold text-defaulttextcolor mb-0">Void Payment</h3>
                <p className="text-[0.72rem] text-[#94a3b8] mb-0">This cannot be undone</p>
              </div>
            </div>
            <div className="rounded-xl p-3 mb-4" style={{background:'#fff5f5'}}>
              <p className="font-mono text-[0.85rem] font-semibold text-[#dc2626] mb-0">#{payment.paymentNumber}</p>
              <p className="text-[0.78rem] text-[#94a3b8] mb-0">
                Rs. {payment.amount?.toLocaleString()} · {methodLabel(payment.paymentMethod)}
              </p>
            </div>
            <p className="text-[0.8rem] text-[#94a3b8] mb-3">
              Voiding will mark this payment <strong>Cancelled</strong> and restore
              Rs. {payment.amount?.toLocaleString()} to the invoice balance.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-defaulttextcolor mb-1.5">
                Reason <span className="text-[#dc2626]">*</span>
              </label>
              <textarea className="form-control !rounded-xl" rows={3}
                placeholder="e.g. Duplicate entry / wrong invoice / customer dispute"
                value={voidReason} onChange={e=>setVoidReason(e.target.value)} required/>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={()=>{setVoidOpen(false);setVoidReason('');}}
                className="ti-btn ti-btn-light !rounded-xl">Cancel</button>
              <button onClick={voidPayment}
                disabled={!voidReason.trim()||busy==='void'}
                className="ti-btn !rounded-xl !text-white font-semibold disabled:opacity-50"
                style={{background:'linear-gradient(135deg,#dc2626 0%,#b91c1c 100%)'}}>
                {busy==='void'?<><i className="ri-loader-4-line animate-spin mr-1"/>Voiding…</>:<><i className="ri-close-circle-line mr-1"/>Void Payment</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Refund Modal ── */}
      {refundOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-bodybg rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background:'#fef3c7'}}>
                <i className="ri-arrow-go-back-line" style={{color:'#d97706'}}/>
              </div>
              <div>
                <h3 className="text-[1rem] font-bold text-defaulttextcolor mb-0">Refund Payment</h3>
                <p className="text-[0.72rem] text-[#94a3b8] mb-0">Original: Rs. {payment.amount?.toLocaleString()}</p>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-defaulttextcolor mb-1.5">
                Refund Amount (Rs.) <span className="text-[#dc2626]">*</span>
              </label>
              <input type="number" min="0.01" max={payment.amount} step="0.01"
                value={refundAmount} onChange={e=>setRefundAmount(e.target.value)}
                className="form-control !rounded-xl font-mono" required/>
              {Number(refundAmount) > 0 && Number(refundAmount) <= payment.amount && (
                <div className="mt-2 rounded-xl p-3 flex items-center justify-between"
                  style={{background:'#fef3c7'}}>
                  <span className="text-[0.78rem] font-semibold" style={{color:'#92400e'}}>
                    Rs. {Number(refundAmount).toLocaleString()}
                    {refundPct===100?' (full refund)':` (${refundPct}% of original)`}
                  </span>
                  <span className="text-[0.72rem]" style={{color:'#92400e'}}>
                    {refundPct===100?'Status → Refunded':'Status unchanged'}
                  </span>
                </div>
              )}
              {Number(refundAmount) > payment.amount && (
                <p className="text-[0.75rem] mt-1" style={{color:'#dc2626'}}>
                  Cannot exceed original amount (Rs. {payment.amount?.toLocaleString()})
                </p>
              )}
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-defaulttextcolor mb-1.5">
                Reason <span className="text-[#dc2626]">*</span>
              </label>
              <textarea className="form-control !rounded-xl" rows={3}
                placeholder="e.g. Customer return / overpayment / service issue"
                value={refundReason} onChange={e=>setRefundReason(e.target.value)} required/>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={()=>{setRefundOpen(false);setRefundAmount('');setRefundReason('');}}
                className="ti-btn ti-btn-light !rounded-xl">Cancel</button>
              <button onClick={refundPayment}
                disabled={!Number(refundAmount)||Number(refundAmount)<=0||Number(refundAmount)>payment.amount||!refundReason.trim()||busy==='refund'}
                className="ti-btn !rounded-xl !text-white font-semibold disabled:opacity-50"
                style={{background:'linear-gradient(135deg,#d97706 0%,#b45309 100%)'}}>
                {busy==='refund'?<><i className="ri-loader-4-line animate-spin mr-1"/>Refunding…</>:<><i className="ri-arrow-go-back-line mr-1"/>Process Refund</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
