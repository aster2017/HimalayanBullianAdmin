'use client';
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
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
  const parts = (name||'').trim().split(' ');
  return ((parts[0]?.[0]||'') + (parts[1]?.[0]||'')).toUpperCase() || '?';
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
}
function relativeTime(iso: string) {
  const days = Math.floor((Date.now()-new Date(iso).getTime())/86_400_000);
  if (days===0) return 'Today'; if (days===1) return 'Yesterday';
  if (days<30)  return `${days}d ago`;
  const mo = Math.floor(days/30); if (mo<12) return `${mo}mo ago`;
  return `${Math.floor(mo/12)}y ago`;
}

const METHOD_STYLES: Record<string,{bg:string;text:string}> = {
  Cash:        {bg:'#dcfce7',text:'#16a34a'},
  BankTransfer:{bg:'#dbeafe',text:'#2563eb'},
  Card:        {bg:'#ede9fe',text:'#7c3aed'},
  ConnectIPS:  {bg:'#fef3c7',text:'#d97706'},
  QRCode:      {bg:'#e0f2fe',text:'#0891b2'},
  Credits:     {bg:'#fdf2f8',text:'#db2777'},
  PayAtStore:  {bg:'#f1f5f9',text:'#64748b'},
};
const STATUS_STYLES: Record<string,{bg:string;text:string}> = {
  Completed:  {bg:'#dcfce7',text:'#16a34a'},
  Pending:    {bg:'#fef3c7',text:'#d97706'},
  Processing: {bg:'#e0f2fe',text:'#0891b2'},
  Refunded:   {bg:'#dbeafe',text:'#2563eb'},
  Cancelled:  {bg:'#fee2e2',text:'#dc2626'},
  Failed:     {bg:'#fee2e2',text:'#dc2626'},
};

const STATUSES    = ['Completed','Pending','Processing','Refunded','Cancelled','Failed'];
const METHODS     = ['Cash','BankTransfer','Card','ConnectIPS','QRCode','Credits','PayAtStore'];
const METHOD_LABELS: Record<string,string> = {
  BankTransfer:'Bank Transfer', ConnectIPS:'ConnectIPS', QRCode:'QR Code',
  PayAtStore:'Pay at Store',
};
function methodLabel(m: string) { return METHOD_LABELS[m] || m; }

export default function PaymentsPage() {
  useProtectedRoute();

  const [payments,   setPayments]  = useState<any[]>([]);
  const [totalCount, setTotal]     = useState(0);
  const [page,       setPage]      = useState(1);
  const [pageSize,   setPageSize]  = useState(25);
  const [loading,    setLoading]   = useState(true);
  const [search,     setSearch]    = useState('');
  const [debSearch,  setDebSearch] = useState('');
  const [status,     setStatus]    = useState('');
  const [method,     setMethod]    = useState('');
  const [showStatus, setShowStatus]= useState(false);
  const [showMethod, setShowMethod]= useState(false);
  const statusRef = useRef<HTMLDivElement>(null);
  const methodRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>|null>(null);

  const handleSearch = (v: string) => {
    setSearch(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setDebSearch(v); setPage(1); }, 350);
  };

  // close dropdowns on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) setShowStatus(false);
      if (methodRef.current && !methodRef.current.contains(e.target as Node)) setShowMethod(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize };
      if (debSearch.trim()) params.search = debSearch.trim();
      if (status) params.status = status;
      if (method) params.paymentMethod = method;
      const res = await apiClient.get('/payments', { params });
      const data = res.data?.data || res.data;
      setPayments(data?.items || []);
      setTotal(data?.totalCount || 0);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load payments');
    } finally { setLoading(false); }
  };

  useEffect(() => { setPage(1); }, [debSearch, status, method, pageSize]);
  useEffect(() => { load(); }, [page, pageSize, debSearch, status, method]);

  const totalPages    = Math.ceil(totalCount / pageSize);
  const pageAmount    = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const completedCount= payments.filter(p => p.status === 'Completed').length;
  const pendingCount  = payments.filter(p => p.status === 'Pending' || p.status === 'Processing').length;
  const hasFilters    = !!search || !!status || !!method;

  return (
    <div className="page-content">
      <div className="container-fluid">

        {/* Header */}
        <div className="flex items-center justify-between my-[1.5rem] flex-wrap gap-3">
          <div>
            <p className="font-semibold text-[1.125rem] text-defaulttextcolor mb-0">Payments</p>
            <p className="text-[#8c9097] text-[0.813rem] mb-0">{totalCount.toLocaleString()} payments total</p>
          </div>
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {[
            {label:'Total Payments',  value:totalCount.toLocaleString(),        icon:'ri-bank-card-line',         color:'#2563eb', bg:'#dbeafe'},
            {label:'Page Amount',     value:`Rs. ${pageAmount.toLocaleString()}`,icon:'ri-money-rupee-circle-line',color:'#C8A86B', bg:'#fdf8ee'},
            {label:'Completed',       value:String(completedCount),              icon:'ri-checkbox-circle-line',   color:'#16a34a', bg:'#dcfce7'},
            {label:'Pending',         value:String(pendingCount),                icon:'ri-time-line',              color:'#d97706', bg:'#fef3c7'},
          ].map(t=>(
            <div key={t.label} className="box p-4 flex items-center gap-3" style={{borderLeft:`3px solid ${t.color}`}}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:t.bg}}>
                <i className={t.icon} style={{color:t.color}}/>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-0.5">{t.label}</p>
                <p className="text-[1rem] font-bold text-defaulttextcolor mb-0">{t.value}</p>
                {(t.label==='Completed'||t.label==='Pending') && <p className="text-[10px] text-[#94a3b8] mb-0">on this page</p>}
              </div>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="box p-3 mb-4">
          <div className="flex items-center gap-3 flex-nowrap">
            <div className="relative flex-1 min-w-0">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] text-sm pointer-events-none"/>
              <input type="text" value={search} onChange={e=>handleSearch(e.target.value)}
                placeholder="Search payment #, customer, invoice, transaction…"
                className="form-control !rounded-xl !pl-8 text-sm"/>
            </div>

            {/* Status dropdown */}
            <div ref={statusRef} className="relative flex-shrink-0">
              <button onClick={()=>{setShowStatus(s=>!s);setShowMethod(false);}}
                className={`flex items-center gap-2 px-3 py-2 text-sm rounded-xl border transition-colors ${status?'border-[#C8A86B] text-[#a8863d] bg-[#fdf8ee]':'border-defaultborder text-[#64748b]'}`}>
                <i className="ri-filter-3-line"/>
                {status || 'Status'}
                <i className="ri-arrow-down-s-line"/>
              </button>
              {showStatus && (
                <div className="absolute top-full mt-1 right-0 bg-white dark:bg-bodybg rounded-xl shadow-lg border border-defaultborder z-20 min-w-[160px] py-1 overflow-hidden">
                  <button onClick={()=>{setStatus('');setShowStatus(false);setPage(1);}}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-[#f8fafc] transition-colors ${!status?'font-semibold text-[#C8A86B]':'text-defaulttextcolor'}`}>
                    All Statuses
                  </button>
                  {STATUSES.map(s=>{
                    const st=STATUS_STYLES[s]||{bg:'#f1f5f9',text:'#64748b'};
                    return (
                      <button key={s} onClick={()=>{setStatus(s);setShowStatus(false);setPage(1);}}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-[#f8fafc] transition-colors flex items-center gap-2 ${status===s?'font-semibold':''}`}>
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{background:st.text}}/>
                        {s}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Method dropdown */}
            <div ref={methodRef} className="relative flex-shrink-0">
              <button onClick={()=>{setShowMethod(s=>!s);setShowStatus(false);}}
                className={`flex items-center gap-2 px-3 py-2 text-sm rounded-xl border transition-colors ${method?'border-[#C8A86B] text-[#a8863d] bg-[#fdf8ee]':'border-defaultborder text-[#64748b]'}`}>
                <i className="ri-bank-card-line"/>
                {method ? methodLabel(method) : 'Method'}
                <i className="ri-arrow-down-s-line"/>
              </button>
              {showMethod && (
                <div className="absolute top-full mt-1 right-0 bg-white dark:bg-bodybg rounded-xl shadow-lg border border-defaultborder z-20 min-w-[160px] py-1 overflow-hidden">
                  <button onClick={()=>{setMethod('');setShowMethod(false);setPage(1);}}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-[#f8fafc] transition-colors ${!method?'font-semibold text-[#C8A86B]':'text-defaulttextcolor'}`}>
                    All Methods
                  </button>
                  {METHODS.map(m=>{
                    const ms=METHOD_STYLES[m]||{bg:'#f1f5f9',text:'#64748b'};
                    return (
                      <button key={m} onClick={()=>{setMethod(m);setShowMethod(false);setPage(1);}}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-[#f8fafc] transition-colors flex items-center gap-2 ${method===m?'font-semibold':''}`}>
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{background:ms.text}}/>
                        {methodLabel(m)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {hasFilters && (
              <button onClick={()=>{handleSearch('');setStatus('');setMethod('');setPage(1);}}
                className="px-3 py-2 text-sm text-[#64748b] border border-defaultborder rounded-xl hover:border-[#C8A86B] transition-colors flex-shrink-0">
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="box">
          <div className="overflow-x-auto">
            <table className="ti-custom-table ti-custom-table-hover text-sm w-full">
              <thead>
                <tr style={{background:'#f8fafc'}}>
                  {['Payment #','Customer','Invoice / Order','Date','Amount','Method','Status',''].map(h=>(
                    <th key={h} className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({length:7}).map((_,i)=>(
                    <tr key={i}>
                      {[18,26,22,14,14,12,12,8].map((w,j)=>(
                        <td key={j} className="py-3 px-4">
                          <div className="h-4 rounded animate-pulse bg-[#f1f5f9]" style={{width:`${w}%`}}/>
                        </td>
                      ))}
                    </tr>
                  ))
                ) : payments.length===0 ? (
                  <tr>
                    <td colSpan={8} className="py-14 text-center">
                      <i className="ri-bank-card-line text-4xl text-[#cbd5e1] block mb-2"/>
                      <p className="text-[#94a3b8] text-sm font-medium mb-0">No payments found</p>
                    </td>
                  </tr>
                ) : payments.map((p:any)=>{
                  const ms = METHOD_STYLES[p.paymentMethod]||{bg:'#f1f5f9',text:'#64748b'};
                  const ss = STATUS_STYLES[p.status]||{bg:'#f1f5f9',text:'#64748b'};
                  const ac = avatarColor(p.customerName||'');
                  const ai = avatarInitials(p.customerName||'');
                  const isNeg = p.amount < 0;
                  return (
                    <tr key={p.id}>
                      {/* Payment # */}
                      <td className="py-3 px-4">
                        <span className="font-mono text-[0.8rem] font-semibold text-defaulttextcolor">{p.paymentNumber}</span>
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-4">
                        {p.customerName ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                              style={{background:ac}}>{ai}</div>
                            <div>
                              <Link href={p.customerId?`/customers/${p.customerId}`:''}>
                                <p className="text-[0.8rem] font-semibold text-defaulttextcolor hover:text-[#C8A86B] transition-colors mb-0 cursor-pointer">{p.customerName}</p>
                              </Link>
                              {p.customerEmail && <p className="text-[0.7rem] text-[#94a3b8] mb-0 truncate max-w-[140px]">{p.customerEmail}</p>}
                            </div>
                          </div>
                        ) : <span className="text-[#cbd5e1]">—</span>}
                      </td>

                      {/* Invoice / Order */}
                      <td className="py-3 px-4">
                        {p.invoiceNumber && (
                          <Link href={p.invoiceId?`/invoices/${p.invoiceId}`:''}>
                            <p className="font-mono text-[0.78rem] font-semibold text-[#2563eb] hover:text-[#C8A86B] transition-colors mb-0 cursor-pointer">{p.invoiceNumber}</p>
                          </Link>
                        )}
                        {p.orderNumber && (
                          <Link href={p.orderId?`/orders/${p.orderId}`:''}>
                            <p className="text-[0.72rem] text-[#94a3b8] hover:text-[#C8A86B] transition-colors mb-0 cursor-pointer">{p.orderNumber}</p>
                          </Link>
                        )}
                        {!p.invoiceNumber && !p.orderNumber && <span className="text-[#cbd5e1]">—</span>}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <p className="text-[0.8rem] text-defaulttextcolor mb-0">{fmtDate(p.paymentDate)}</p>
                        <p className="text-[0.72rem] text-[#94a3b8] mb-0">{relativeTime(p.paymentDate)}</p>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`font-semibold text-[0.9rem]`}
                          style={{color:isNeg?'#dc2626':'#C8A86B'}}>
                          {isNeg?'−':''} Rs. {Math.abs(p.amount||0).toLocaleString()}
                        </span>
                      </td>

                      {/* Method */}
                      <td className="py-3 px-4">
                        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                          style={{background:ms.bg,color:ms.text}}>
                          {methodLabel(p.paymentMethod)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                          style={{background:ss.bg,color:ss.text}}>
                          {p.status}
                        </span>
                      </td>

                      {/* View */}
                      <td className="py-3 px-4">
                        <Link href={`/payments/${p.id}`}>
                          <button title="View"
                            className="w-8 h-8 rounded-lg flex items-center justify-center border border-defaultborder text-[#64748b] hover:border-[#C8A86B] hover:text-[#C8A86B] transition-colors">
                            <i className="ri-eye-line text-sm"/>
                          </button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && totalCount > 0 && (
            <div className="px-4 py-3 border-t border-defaultborder flex items-center justify-between flex-wrap gap-3">
              <p className="text-[0.78rem] text-[#94a3b8] mb-0">
                {((page-1)*pageSize)+1}–{Math.min(page*pageSize,totalCount)} of {totalCount.toLocaleString()} payments
              </p>
              <div className="flex items-center gap-2">
                <select value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(1);}}
                  className="form-control form-control-sm !w-auto !rounded-lg text-[0.78rem]">
                  {[25,50,100].map(n=><option key={n} value={n}>{n} / page</option>)}
                </select>
                {totalPages > 1 && (
                  <div className="flex gap-1">
                    <button disabled={page<=1} onClick={()=>setPage(p=>p-1)}
                      className="w-8 h-8 rounded-lg border border-defaultborder text-[#64748b] hover:border-[#C8A86B] hover:text-[#C8A86B] disabled:opacity-40 disabled:pointer-events-none transition-colors text-sm">‹</button>
                    {Array.from({length:Math.min(5,totalPages)},(_,i)=>{
                      let p=i+1;
                      if(totalPages>5&&page>3) p=page-2+i;
                      if(p>totalPages) return null;
                      return (
                        <button key={p} onClick={()=>setPage(p)}
                          className="w-8 h-8 rounded-lg border text-sm font-semibold transition-colors"
                          style={page===p
                            ?{background:'linear-gradient(135deg,#C8A86B 0%,#a8863d 100%)',color:'#fff',borderColor:'#C8A86B'}
                            :{borderColor:'#e2e8f0',color:'#64748b'}}>
                          {p}
                        </button>
                      );
                    })}
                    <button disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)}
                      className="w-8 h-8 rounded-lg border border-defaultborder text-[#64748b] hover:border-[#C8A86B] hover:text-[#C8A86B] disabled:opacity-40 disabled:pointer-events-none transition-colors text-sm">›</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
