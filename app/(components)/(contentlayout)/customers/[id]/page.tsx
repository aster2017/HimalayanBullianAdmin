'use client'
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { getAuthHeaders } from '@/shared/services/apiConfig';
import toast from 'react-hot-toast';
import { useDialog } from '@/shared/context/DialogContext';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://hbc-api.semis.app/api';

// ── helpers ───────────────────────────────────────────────────────────────────
function avatarColor(name: string) {
  const colors = ['#C8A86B','#7c3aed','#0891b2','#16a34a','#dc2626','#d97706','#db2777','#2563eb'];
  let h = 0; for (let i = 0; i < (name||'').length; i++) h = (name||'').charCodeAt(i) + ((h<<5)-h);
  return colors[Math.abs(h) % colors.length];
}
function avatarInitials(first: string, last: string) {
  return ((first?.[0]||'') + (last?.[0]||'')).toUpperCase() || '??';
}
function relativeTime(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0) return 'Today'; if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  const mo = Math.floor(days/30); if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo/12)}y ago`;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
}
function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) + ' · ' +
    d.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
}

function customerStatus(c: any) {
  if (!c.isActive)        return { label:'Suspended',        bg:'#fee2e2', text:'#dc2626', icon:'ri-forbid-line' };
  if (!c.isEmailVerified) return { label:'Email Unverified', bg:'#fef3c7', text:'#d97706', icon:'ri-mail-close-line' };
  if (!c.isApproved)      return { label:'Pending Approval', bg:'#dbeafe', text:'#2563eb', icon:'ri-time-line' };
  return                         { label:'Active',           bg:'#dcfce7', text:'#16a34a', icon:'ri-checkbox-circle-line' };
}

const ORDER_STATUS: Record<string,{bg:string;text:string}> = {
  Draft:     {bg:'#f1f5f9',text:'#64748b'}, Confirmed: {bg:'#dbeafe',text:'#2563eb'},
  Converted: {bg:'#ccfbf1',text:'#0d9488'}, Invoiced:  {bg:'#ede9fe',text:'#7c3aed'},
  Shipped:   {bg:'#e0f2fe',text:'#0284c7'}, Delivered: {bg:'#dcfce7',text:'#16a34a'},
  Cancelled: {bg:'#fee2e2',text:'#dc2626'},
};
const INVOICE_STATUS: Record<string,{bg:string;text:string}> = {
  Draft:{bg:'#f1f5f9',text:'#64748b'}, Sent:{bg:'#dbeafe',text:'#2563eb'},
  Partial:{bg:'#fef3c7',text:'#d97706'}, Paid:{bg:'#dcfce7',text:'#16a34a'},
  Overdue:{bg:'#fee2e2',text:'#dc2626'}, Void:{bg:'#f1f5f9',text:'#94a3b8'},
};
const TARGET_STATUS: Record<string,{bg:string;text:string}> = {
  Active:{bg:'#dbeafe',text:'#2563eb'}, Completed:{bg:'#dcfce7',text:'#16a34a'},
  Delivered:{bg:'#ede9fe',text:'#7c3aed'}, Cancelled:{bg:'#fee2e2',text:'#dc2626'},
};
const CREDIT_TYPE: Record<string,{bg:string;text:string;prefix:string}> = {
  Deposit:{bg:'#dcfce7',text:'#16a34a',prefix:'+'}, Deduction:{bg:'#fef3c7',text:'#d97706',prefix:'−'},
  Refund:{bg:'#dbeafe',text:'#2563eb',prefix:'+'},
};
const CREDIT_STATUS: Record<string,{bg:string;text:string}> = {
  Verified:{bg:'#dcfce7',text:'#16a34a'}, Rejected:{bg:'#fee2e2',text:'#dc2626'},
  Pending:{bg:'#fef3c7',text:'#d97706'},
};
const DOT_COLORS: Record<string,string> = {
  success:'#16a34a', info:'#2563eb', warning:'#d97706',
  danger:'#dc2626',  primary:'#C8A86B', secondary:'#64748b',
};

const TIMELINE_CHIPS = [
  {key:'all',     label:'All',           icon:'ri-list-check',          color:'#C8A86B'},
  {key:'order',   label:'Orders',        icon:'ri-shopping-cart-line',  color:'#2563eb'},
  {key:'invoice', label:'Invoices',      icon:'ri-bill-line',           color:'#C8A86B'},
  {key:'payment', label:'Payments',      icon:'ri-bank-card-line',      color:'#16a34a'},
  {key:'credit',  label:'Wallet',        icon:'ri-wallet-line',         color:'#0891b2'},
  {key:'target',  label:'Targets',       icon:'ri-trophy-line',         color:'#7c3aed'},
  {key:'push',    label:'Notifications', icon:'ri-notification-3-line', color:'#d97706'},
  {key:'login',   label:'Sign-ins',      icon:'ri-login-circle-line',   color:'#64748b'},
];

// ── section header helper ────────────────────────────────────────────────────
function SectionHeader({ icon, iconBg, iconColor, title, sub, right }: {
  icon: string; iconBg: string; iconColor: string;
  title: string; sub?: string; right?: React.ReactNode;
}) {
  return (
    <div className="p-4 border-b border-defaultborder flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{background:iconBg}}>
          <i className={`${icon} text-sm`} style={{color:iconColor}}/>
        </div>
        <div>
          <p className="font-semibold text-[0.9rem] text-defaulttextcolor mb-0">{title}</p>
          {sub && <p className="text-[0.72rem] text-[#94a3b8] mb-0">{sub}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

// ── status badge ─────────────────────────────────────────────────────────────
function StatusPill({status, map}: {status:string; map:Record<string,{bg:string;text:string}>}) {
  const s = map[status] || {bg:'#f1f5f9',text:'#64748b'};
  return (
    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
      style={{background:s.bg,color:s.text}}>{status}</span>
  );
}

// ── view button ───────────────────────────────────────────────────────────────
function ViewBtn({href}: {href:string}) {
  return (
    <Link href={href}>
      <button title="View"
        className="w-8 h-8 rounded-lg flex items-center justify-center border border-defaultborder text-[#64748b] hover:border-[#C8A86B] hover:text-[#C8A86B] transition-colors">
        <i className="ri-eye-line text-sm"/>
      </button>
    </Link>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────
export default function CustomerDetailPage() {
  useProtectedRoute();
  const { confirm } = useDialog();
  const { id } = useParams();
  const router  = useRouter();

  const [customer, setCustomer] = useState<any>(null);
  const [orders,   setOrders]   = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [targets,  setTargets]  = useState<any[]>([]);
  const [wallet,   setWallet]   = useState<any>(null);
  const [loading,  setLoading]  = useState(true);
  const [acting,   setActing]   = useState<string|null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({firstName:'',lastName:'',phoneNumber:''});
  const [rejectModal,  setRejectModal]  = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [panImgUrl,  setPanImgUrl]  = useState<string|null>(null);
  const [panLightbox,setPanLightbox]= useState(false);

  const [addCreditsModal, setAddCreditsModal] = useState(false);
  const [addCreditsAmount, setAddCreditsAmount] = useState('');
  const [addCreditsNote, setAddCreditsNote] = useState('');
  const [addCreditsLoading, setAddCreditsLoading] = useState(false);

  type TimelineItem = {
    id:string; eventType:string; color:string; timestamp:string;
    title:string; summary:string; link:string; amount:number|null; badge:string;
  };
  const [timeline,       setTimeline]       = useState<TimelineItem[]>([]);
  const [timelineTotal,  setTimelineTotal]  = useState(0);
  const [timelinePage,   setTimelinePage]   = useState(1);
  const [timelineLoading,setTimelineLoading]= useState(false);
  const [timelineFilter, setTimelineFilter] = useState('all');
  const TIMELINE_PAGE_SIZE = 50;

  const loadAll = async () => {
    if (!id) return;
    setLoading(true);
    const [cr,or,ir,tr,wr] = await Promise.allSettled([
      fetch(`${API}/customers/${id}`,{headers:getAuthHeaders()}).then(r=>r.json()),
      fetch(`${API}/customers/${id}/orders?page=1&pageSize=10`,{headers:getAuthHeaders()}).then(r=>r.json()),
      fetch(`${API}/customers/${id}/invoices?page=1&pageSize=10`,{headers:getAuthHeaders()}).then(r=>r.json()),
      fetch(`${API}/targets/customer/${id}`,{headers:getAuthHeaders()}).then(r=>r.json()),
      fetch(`${API}/credits/admin/customers/${id}?page=1&pageSize=10`,{headers:getAuthHeaders()}).then(r=>r.json()),
    ]);
    if (cr.status==='fulfilled'){const c=cr.value.data;setCustomer(c);setEditData({firstName:c?.firstName||'',lastName:c?.lastName||'',phoneNumber:c?.phoneNumber||''});}
    if (or.status==='fulfilled') setOrders(or.value.data?.items||or.value.data||[]);
    if (ir.status==='fulfilled') setInvoices(ir.value.data?.items||ir.value.data||[]);
    if (tr.status==='fulfilled') setTargets(tr.value.data||[]);
    if (wr.status==='fulfilled') setWallet(wr.value?.data||null);
    setLoading(false);
  };

  useEffect(()=>{loadAll();},[id]);

  const loadTimeline = async (page=1) => {
    if (!id) return;
    setTimelineLoading(true);
    try {
      const r = await fetch(`${API}/customers/${id}/timeline?page=${page}&pageSize=${TIMELINE_PAGE_SIZE}`,{headers:getAuthHeaders()});
      const d = await r.json();
      setTimeline(d?.data?.items||[]);
      setTimelineTotal(d?.data?.totalCount||0);
      setTimelinePage(page);
    } catch {/* swallow */}
    finally {setTimelineLoading(false);}
  };
  useEffect(()=>{loadTimeline(1);},[id]);

  useEffect(()=>{
    if (!customer?.hasPanCardImage||!id){setPanImgUrl(null);return;}
    let revoke:string|null=null; let cancelled=false;
    (async()=>{
      try{
        const r=await fetch(`${API}/customers/${id}/pan-card`,{headers:getAuthHeaders()});
        if(!r.ok||cancelled)return;
        const blob=await r.blob(); if(cancelled)return;
        const url=URL.createObjectURL(blob); revoke=url; setPanImgUrl(url);
      }catch{/*swallow*/}
    })();
    return ()=>{cancelled=true;if(revoke)URL.revokeObjectURL(revoke);};
  },[customer?.hasPanCardImage,id]);

  const act = async (endpoint:string,body?:any)=>{
    setActing(endpoint);
    try{
      const r=await fetch(`${API}/customers/${id}/${endpoint}`,{method:'POST',headers:{...getAuthHeaders(),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
      const d=await r.json();
      if(d.success){toast.success(d.message);loadAll();}else toast.error(d.message||'Failed');
    }catch{toast.error('Action failed');}
    setActing(null);
  };

  const forceVerifyEmail = async ()=>{
    if(!id)return;
    if(!await confirm('This will bypass the OTP check and mark the email as verified.', { title: 'Force Verify Email?', variant: 'warning', confirmLabel: 'Force Verify' }))return;
    setActing('force-verify');
    try{
      const r=await fetch(`${API}/auth/admin/force-verify-email/${id}`,{method:'POST',headers:getAuthHeaders()});
      const d=await r.json();
      if(d.success){toast.success(d.message||'Email verified');loadAll();}else toast.error(d.message||'Failed');
    }catch{toast.error('Force-verify failed');}
    setActing(null);
  };

  const saveEdit = async (e:React.FormEvent)=>{
    e.preventDefault(); setActing('edit');
    try{
      const r=await fetch(`${API}/customers/${id}`,{method:'PUT',headers:{...getAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify(editData)});
      const d=await r.json();
      if(d.success!==false){toast.success('Customer updated');setEditMode(false);loadAll();}else toast.error(d.message||'Failed');
    }catch{toast.error('Update failed');}
    setActing(null);
  };

  const submitAddCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(addCreditsAmount);
    if (!amount || amount < 100) { toast.error('Minimum amount is NPR 100'); return; }
    setAddCreditsLoading(true);
    try {
      const r = await fetch(`${API}/credits/add`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: id, amount, note: addCreditsNote || undefined }),
      });
      const d = await r.json();
      if (d.success) {
        toast.success(d.message || `NPR ${amount.toLocaleString()} added`);
        setAddCreditsModal(false);
        setAddCreditsAmount('');
        setAddCreditsNote('');
        loadAll();
      } else {
        toast.error(d.message || 'Failed to add credits');
      }
    } catch {
      toast.error('Request failed');
    }
    setAddCreditsLoading(false);
  };

  // ── loading / not-found ───────────────────────────────────────────────────
  if (loading) return (
    <div className="page-content">
      <div className="container-fluid pt-20 flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{background:'#fdf8ee'}}>
          <i className="ri-loader-4-line animate-spin text-2xl" style={{color:'#C8A86B'}}/>
        </div>
        <p className="text-[#94a3b8] text-sm">Loading customer…</p>
      </div>
    </div>
  );
  if (!customer) return (
    <div className="page-content">
      <div className="container-fluid pt-20 text-center">
        <p className="text-defaulttextcolor font-semibold mb-2">Customer not found</p>
        <Link href="/customers" className="text-[#C8A86B] hover:underline text-sm">← Back to Customers</Link>
      </div>
    </div>
  );

  const sc   = customerStatus(customer);
  const ac   = avatarColor(customer.fullName||'');
  const ai   = avatarInitials(customer.firstName,customer.lastName);
  const activeTargets = targets.filter((t:any)=>t.status==='Active').length;

  const filtered = timelineFilter==='all'
    ? timeline
    : timeline.filter(e=>e.eventType===timelineFilter);

  return (
    <div className="page-content">
      <div className="container-fluid">

        {/* ── Zone 1: Profile header ── */}
        <div className="box p-5 my-[1.5rem]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button onClick={()=>router.back()}
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-defaultborder text-[#64748b] hover:border-[#C8A86B] hover:text-[#C8A86B] transition-colors flex-shrink-0">
                <i className="ri-arrow-left-s-line text-sm"/>
              </button>
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
                style={{background:ac}}>
                {ai}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-bold text-[1.2rem] text-defaulttextcolor mb-0">{customer.fullName}</h2>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                    style={{background:sc.bg,color:sc.text}}>
                    <i className={`${sc.icon} mr-1`}/>{sc.label}
                  </span>
                </div>
                <p className="text-[0.78rem] text-[#94a3b8] mt-0.5 mb-0">{customer.email}</p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={()=>setEditMode(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-defaultborder text-defaulttextcolor hover:border-[#C8A86B] hover:text-[#C8A86B] transition-colors">
                <i className="ri-edit-line text-sm"/> Edit
              </button>

              {!customer.isEmailVerified && customer.isActive && (
                <button disabled={!!acting} onClick={forceVerifyEmail}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg border transition-colors disabled:opacity-50"
                  style={{borderColor:'#d97706',color:'#d97706',background:'#fef3c7'}}>
                  <i className={acting==='force-verify'?'ri-loader-4-line animate-spin':'ri-mail-check-line'}/>
                  {acting==='force-verify'?'Verifying…':'Force-verify email'}
                </button>
              )}

              {!customer.isApproved && customer.isEmailVerified && customer.isActive && (<>
                <button disabled={!!acting} onClick={()=>act('approve')}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg text-white transition-colors disabled:opacity-50"
                  style={{background:'linear-gradient(135deg,#16a34a 0%,#15803d 100%)'}}>
                  <i className={acting==='approve'?'ri-loader-4-line animate-spin':'ri-checkbox-circle-line'}/>
                  {acting==='approve'?'Approving…':'Approve'}
                </button>
                <button disabled={!!acting} onClick={()=>setRejectModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg text-white transition-colors disabled:opacity-50"
                  style={{background:'linear-gradient(135deg,#dc2626 0%,#b91c1c 100%)'}}>
                  <i className="ri-close-circle-line"/> Reject
                </button>
              </>)}

              {customer.isActive && customer.isApproved && (
                <button disabled={!!acting} onClick={()=>act('suspend')}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg border transition-colors disabled:opacity-50"
                  style={{borderColor:'#dc2626',color:'#dc2626',background:'#fee2e2'}}>
                  <i className={acting==='suspend'?'ri-loader-4-line animate-spin':'ri-pause-circle-line'}/>
                  {acting==='suspend'?'Suspending…':'Suspend'}
                </button>
              )}

              {!customer.isActive && (
                <button disabled={!!acting} onClick={()=>act('activate')}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg text-white transition-colors disabled:opacity-50"
                  style={{background:'linear-gradient(135deg,#16a34a 0%,#15803d 100%)'}}>
                  <i className={acting==='activate'?'ri-loader-4-line animate-spin':'ri-play-circle-line'}/>
                  {acting==='activate'?'Activating…':'Activate'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Zone 2: 4 metric stat tiles ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="box p-4 flex items-center gap-3" style={{borderLeft:'3px solid #2563eb'}}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:'#dbeafe'}}>
              <i className="ri-shopping-cart-line" style={{color:'#2563eb'}}/>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-0.5">Total Orders</p>
              <p className="text-[1.3rem] font-bold text-defaulttextcolor mb-0">{customer.totalOrders ?? orders.length}</p>
            </div>
          </div>

          <div className="box p-4 flex items-center gap-3" style={{borderLeft:'3px solid #C8A86B'}}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:'#fdf8ee'}}>
              <i className="ri-money-rupee-circle-line" style={{color:'#C8A86B'}}/>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-0.5">Lifetime Value</p>
              <p className="text-[1rem] font-bold mb-0" style={{color:'#C8A86B'}}>
                Rs. {(customer.lifetimeValue||0).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="box p-4 flex items-center gap-3" style={{borderLeft:'3px solid #7c3aed'}}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:'#ede9fe'}}>
              <i className="ri-trophy-line" style={{color:'#7c3aed'}}/>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-0.5">Active Targets</p>
              <p className="text-[1.3rem] font-bold text-defaulttextcolor mb-0">{activeTargets}</p>
            </div>
          </div>

          <div className="box p-4 flex items-center gap-3" style={{borderLeft:'3px solid #0891b2'}}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:'#e0f2fe'}}>
              <i className="ri-calendar-check-line" style={{color:'#0891b2'}}/>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-0.5">Member Since</p>
              <p className="text-[0.85rem] font-bold text-defaulttextcolor mb-0">{fmtDate(customer.createdAt)}</p>
              <p className="text-[0.72rem] text-[#94a3b8] mb-0">{relativeTime(customer.createdAt)}</p>
            </div>
          </div>
        </div>

        {/* ── Zone 3: Contact info card ── */}
        <div className="box p-4 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-1">Email</p>
              <p className="text-[0.8rem] font-medium text-defaulttextcolor truncate">{customer.email}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-1">Phone</p>
              <p className="text-[0.8rem] font-medium text-defaulttextcolor">{customer.phoneNumber || <span className="text-[#cbd5e1]">—</span>}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-1">Customer #</p>
              <p className="text-[0.8rem] font-mono font-medium text-defaulttextcolor">
                {customer.customerNumber || <span className="text-[#cbd5e1]">Not assigned</span>}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-1">Zoho Sync</p>
              {customer.isZohoLinked ? (
                <div className="flex items-center gap-1">
                  <i className="ri-links-line text-sm" style={{color:'#16a34a'}}/>
                  <p className="text-[0.78rem] font-mono text-defaulttextcolor truncate mb-0"
                    title={customer.zohoContactId}>
                    {customer.zohoContactId?.slice(0,16)}…
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <i className="ri-link-unlink text-sm" style={{color:'#d97706'}}/>
                  <p className="text-[0.78rem] mb-0" style={{color:'#d97706'}}>Not synced</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Zone 4: KYC / Compliance ── */}
        <div className="box mb-4">
          <SectionHeader
            icon="ri-shield-check-line" iconBg="#ede9fe" iconColor="#7c3aed"
            title="KYC / Compliance"
            sub={customer.clientType === 'Business' ? `Business · ${customer.businessName || ''}` : 'Individual'}
            right={
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                style={customer.uboConfirmed && customer.hasPanCardImage && customer.panNumber
                  ? {background:'#dcfce7',color:'#16a34a'}
                  : {background:'#fef3c7',color:'#d97706'}}>
                <i className={`${customer.uboConfirmed ? 'ri-checkbox-circle-line' : 'ri-error-warning-line'} mr-1`}/>
                {customer.uboConfirmed && customer.hasPanCardImage && customer.panNumber ? 'KYC Complete' : 'KYC Incomplete'}
              </span>
            }
          />
          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* PAN card photo */}
            <div>
              <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-2">PAN Card Photo</p>
              {customer.hasPanCardImage && panImgUrl ? (
                <button onClick={()=>setPanLightbox(true)}
                  className="block w-full rounded-xl overflow-hidden border border-defaultborder hover:border-[#C8A86B] transition-colors"
                  title="Click to enlarge">
                  <img src={panImgUrl} alt="PAN card" className="w-full h-36 object-cover bg-[#f8fafc]"/>
                </button>
              ) : customer.hasPanCardImage ? (
                <div className="w-full h-36 flex items-center justify-center bg-[#f8fafc] rounded-xl border border-defaultborder">
                  <i className="ri-loader-4-line animate-spin text-xl text-[#94a3b8]"/>
                </div>
              ) : (
                <div className="w-full h-36 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-defaultborder text-[#94a3b8]">
                  <i className="ri-image-off-line text-2xl mb-1"/>
                  <p className="text-[0.72rem] mb-0">Not uploaded</p>
                </div>
              )}
            </div>

            {/* KYC details */}
            <div className="md:col-span-2 space-y-4">
              <div>
                <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-1">PAN Number</p>
                <p className="font-mono text-[0.85rem] font-semibold text-defaulttextcolor">
                  {customer.panNumber || <span className="text-[#cbd5e1] font-sans font-normal">Not provided</span>}
                </p>
              </div>

              {customer.clientType === 'Business' && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl border border-defaultborder" style={{background:'#ede9fe20'}}>
                  <div>
                    <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-1">Business Name</p>
                    <p className="text-[0.85rem] font-semibold text-defaulttextcolor">{customer.businessName || <span className="text-[#cbd5e1] font-normal">—</span>}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-1">Reg. Number</p>
                    <p className="font-mono text-[0.85rem] font-semibold text-defaulttextcolor">{customer.businessRegistrationNumber || <span className="text-[#cbd5e1] font-sans font-normal">—</span>}</p>
                  </div>
                </div>
              )}

              <div>
                <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-1">Ultimate Beneficial Owner</p>
                {customer.uboConfirmed ? (
                  <div className="flex items-center gap-2">
                    <i className="ri-checkbox-circle-fill" style={{color:'#16a34a'}}/>
                    <p className="text-[0.8rem] text-defaulttextcolor mb-0">
                      Confirmed
                      <span className="text-[#94a3b8] text-[0.72rem] ml-2">
                        {customer.uboConfirmedAt ? `on ${fmtDate(customer.uboConfirmedAt)}` : ''}
                        {customer.uboDeclarationVersion ? ` · ${customer.uboDeclarationVersion}` : ''}
                      </span>
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <i className="ri-alert-line" style={{color:'#d97706'}}/>
                    <p className="text-[0.8rem] mb-0" style={{color:'#d97706'}}>Not confirmed — legacy signup; chase up at approval</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-1">Address</p>
                <p className="text-[0.8rem] text-defaulttextcolor mb-0">
                  {[customer.address,customer.city,customer.state,customer.postalCode,customer.country].filter(Boolean).join(', ')
                    || <span className="text-[#cbd5e1]">Not provided</span>}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Zone 5: Wallet ── */}
        {wallet && (
          <div className="box mb-4">
            <SectionHeader
              icon="ri-wallet-3-line" iconBg="#fdf8ee" iconColor="#C8A86B"
              title="Wallet"
              sub={`${wallet.totalCount??0} transaction${(wallet.totalCount??0)===1?'':''}`}
              right={
                <div className="flex items-center gap-2">
                  <button onClick={() => setAddCreditsModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[0.75rem] font-semibold rounded-lg text-white transition-colors"
                    style={{background:'linear-gradient(135deg,#C8A86B 0%,#a8863d 100%)'}}>
                    <i className="ri-add-line text-xs"/> Add Credits
                  </button>
                  <Link href={`/credits?search=${encodeURIComponent(customer.email||'')}`}>
                    <button className="text-[0.75rem] text-[#C8A86B] hover:underline font-medium">View all</button>
                  </Link>
                </div>
              }
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
              {[
                {label:'Current Balance', value:wallet.balance||0, icon:'ri-wallet-3-line', color:'#C8A86B', bg:'#fdf8ee'},
                {label:'Total Deposited', value:wallet.summary?.totalDeposited||0, icon:'ri-arrow-down-circle-line', color:'#16a34a', bg:'#dcfce7'},
                {label:'Total Used', value:wallet.summary?.totalDeducted||0, icon:'ri-arrow-up-circle-line', color:'#dc2626', bg:'#fee2e2'},
                {label:'Pending', value:wallet.summary?.pendingTotal||0, icon:'ri-time-line', color:'#d97706', bg:'#fef3c7'},
              ].map(w=>(
                <div key={w.label} className="rounded-xl p-3 flex items-center gap-3"
                  style={{background:w.bg+'60', border:`1px solid ${w.color}20`}}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{background:w.bg}}>
                    <i className={`${w.icon}`} style={{color:w.color}}/>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-0.5">{w.label}</p>
                    <p className="text-[0.9rem] font-bold mb-0" style={{color:w.color}}>
                      Rs. {(w.value).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {(wallet.items?.length??0) > 0 && (
              <div className="overflow-x-auto border-t border-defaultborder">
                <table className="ti-custom-table ti-custom-table-hover text-sm w-full">
                  <thead>
                    <tr style={{background:'#f8fafc'}}>
                      {['Date','Type','Amount','Method','Reference','Status'].map(h=>(
                        <th key={h} className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {wallet.items.map((t:any)=>{
                      const ct = CREDIT_TYPE[t.type]||{bg:'#f1f5f9',text:'#64748b',prefix:''};
                      const cs = CREDIT_STATUS[t.status]||{bg:'#f1f5f9',text:'#64748b'};
                      return (
                        <tr key={t.id}>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <p className="text-[0.8rem] font-medium text-defaulttextcolor mb-0">{fmtDate(t.createdAt)}</p>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                              style={{background:ct.bg,color:ct.text}}>{ct.prefix} {t.type}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-[0.85rem] font-semibold" style={{color:ct.text}}>
                              Rs. {(t.amount||0).toLocaleString()}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-[0.8rem] text-defaulttextcolor">{t.paymentMethod||<span className="text-[#cbd5e1]">—</span>}</td>
                          <td className="py-3 px-4 font-mono text-[0.72rem] text-[#94a3b8]">
                            {t.connectIpsTransactionId||t.referenceNumber||<span className="text-[#cbd5e1]">—</span>}
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                              style={{background:cs.bg,color:cs.text}}>{t.status}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Zone 6: Targets ── */}
        {targets.length > 0 && (
          <div className="box mb-4">
            <SectionHeader
              icon="ri-trophy-line" iconBg="#ede9fe" iconColor="#7c3aed"
              title={`Targets (${targets.length})`}
              sub="Layaway / silver saving plans"
              right={
                <Link href={`/targets?search=${encodeURIComponent(customer.fullName||'')}`}>
                  <button className="text-[0.75rem] text-[#C8A86B] hover:underline font-medium">View all</button>
                </Link>
              }
            />
            <div className="overflow-x-auto">
              <table className="ti-custom-table ti-custom-table-hover text-sm w-full">
                <thead>
                  <tr style={{background:'#f8fafc'}}>
                    {['Target #','Item','Progress','Status','Collection Date',''].map(h=>(
                      <th key={h} className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {targets.map((t:any)=>{
                    const pct = t.totalGrams>0?Math.round((t.gramsPaid/t.totalGrams)*100):0;
                    const ts = TARGET_STATUS[t.status]||{bg:'#f1f5f9',text:'#64748b'};
                    return (
                      <tr key={t.id}>
                        <td className="py-3 px-4 font-mono text-[0.8rem] font-semibold text-defaulttextcolor">{t.targetNumber}</td>
                        <td className="py-3 px-4 text-[0.8rem] text-defaulttextcolor">{t.itemName}</td>
                        <td className="py-3 px-4" style={{minWidth:140}}>
                          <div className="flex items-center gap-2 mb-0.5">
                            <div className="flex-1 h-1.5 rounded-full" style={{background:'#e2e8f0'}}>
                              <div className="h-1.5 rounded-full" style={{width:`${Math.min(pct,100)}%`,background:'#C8A86B'}}/>
                            </div>
                            <span className="text-[11px] font-bold font-mono w-8 text-right flex-shrink-0" style={{color:'#C8A86B'}}>{pct}%</span>
                          </div>
                          <p className="text-[10px] font-mono text-[#94a3b8] mb-0">{Number(t.gramsPaid).toFixed(3)}g / {Number(t.totalGrams).toFixed(3)}g</p>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{background:ts.bg,color:ts.text}}>{t.status}</span>
                        </td>
                        <td className="py-3 px-4 text-[0.8rem] text-defaulttextcolor">
                          {t.collectionDate ? fmtDate(t.collectionDate) : <span className="text-[#cbd5e1]">—</span>}
                        </td>
                        <td className="py-3 px-4"><ViewBtn href={`/targets/${t.id}`}/></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Zone 7: Orders ── */}
        <div className="box mb-4">
          <SectionHeader
            icon="ri-shopping-cart-line" iconBg="#dbeafe" iconColor="#2563eb"
            title={`Orders (${orders.length})`}
          />
          <div className="overflow-x-auto">
            <table className="ti-custom-table ti-custom-table-hover text-sm w-full">
              <thead>
                <tr style={{background:'#f8fafc'}}>
                  {['Order #','Date','Status','Total',''].map(h=>(
                    <th key={h} className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.length===0?(
                  <tr><td colSpan={5} className="py-10 text-center text-[#94a3b8] text-sm">No orders yet</td></tr>
                ):orders.map((o:any)=>(
                  <tr key={o.id}>
                    <td className="py-3 px-4 font-semibold text-[0.8rem] font-mono text-defaulttextcolor">{o.orderNumber}</td>
                    <td className="py-3 px-4">
                      <p className="text-[0.8rem] text-defaulttextcolor mb-0">{fmtDate(o.orderDate||o.createdAt)}</p>
                      <p className="text-[0.72rem] text-[#94a3b8] mb-0">{relativeTime(o.orderDate||o.createdAt)}</p>
                    </td>
                    <td className="py-3 px-4"><StatusPill status={o.status} map={ORDER_STATUS}/></td>
                    <td className="py-3 px-4 font-semibold text-[0.85rem]" style={{color:'#C8A86B'}}>Rs. {(o.totalAmount||0).toLocaleString()}</td>
                    <td className="py-3 px-4"><ViewBtn href={`/orders/${o.id}`}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Zone 8: Invoices ── */}
        <div className="box mb-4">
          <SectionHeader
            icon="ri-bill-line" iconBg="#fdf8ee" iconColor="#C8A86B"
            title={`Invoices (${invoices.length})`}
          />
          <div className="overflow-x-auto">
            <table className="ti-custom-table ti-custom-table-hover text-sm w-full">
              <thead>
                <tr style={{background:'#f8fafc'}}>
                  {['Invoice #','Date','Status','Total','Balance',''].map(h=>(
                    <th key={h} className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.length===0?(
                  <tr><td colSpan={6} className="py-10 text-center text-[#94a3b8] text-sm">No invoices yet</td></tr>
                ):invoices.map((inv:any)=>(
                  <tr key={inv.id}>
                    <td className="py-3 px-4 font-semibold text-[0.8rem] font-mono text-defaulttextcolor">{inv.invoiceNumber}</td>
                    <td className="py-3 px-4">
                      <p className="text-[0.8rem] text-defaulttextcolor mb-0">{fmtDate(inv.invoiceDate)}</p>
                      <p className="text-[0.72rem] text-[#94a3b8] mb-0">{relativeTime(inv.invoiceDate)}</p>
                    </td>
                    <td className="py-3 px-4"><StatusPill status={inv.status} map={INVOICE_STATUS}/></td>
                    <td className="py-3 px-4 font-semibold text-[0.85rem]" style={{color:'#C8A86B'}}>Rs. {(inv.totalAmount||0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-[0.85rem] text-defaulttextcolor">Rs. {(inv.balanceAmount||0).toLocaleString()}</td>
                    <td className="py-3 px-4"><ViewBtn href={`/invoices/${inv.id}`}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Zone 9: Activity Timeline ── */}
        <div className="box mb-4">
          <SectionHeader
            icon="ri-history-line" iconBg="#e0f2fe" iconColor="#0891b2"
            title="Activity Timeline"
            sub={`${timelineTotal} event${timelineTotal===1?'':'s'}`}
            right={
              <button onClick={()=>loadTimeline(timelinePage)} disabled={timelineLoading}
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-defaultborder text-[#64748b] hover:border-[#C8A86B] hover:text-[#C8A86B] transition-colors disabled:opacity-50">
                <i className={`ri-refresh-line text-sm ${timelineLoading?'animate-spin':''}`}/>
              </button>
            }
          />

          {/* Filter chips */}
          <div className="px-4 pt-3 pb-1 flex flex-wrap gap-1.5">
            {TIMELINE_CHIPS.map(chip=>{
              const isActive = timelineFilter===chip.key;
              const count = chip.key==='all'
                ? timeline.length
                : timeline.filter(e=>e.eventType===chip.key).length;
              return (
                <button key={chip.key} onClick={()=>setTimelineFilter(chip.key)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[0.75rem] font-semibold rounded-lg border transition-colors"
                  style={isActive
                    ? {background:chip.color+'15', borderColor:chip.color+'50', color:chip.color}
                    : {background:'transparent', borderColor:'#e2e8f0', color:'#64748b'}}>
                  <i className={chip.icon}/>
                  {chip.label}
                  {count>0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={isActive
                        ? {background:chip.color+'20', color:chip.color}
                        : {background:'#f1f5f9', color:'#64748b'}}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="p-4">
            {timelineLoading && timeline.length===0 ? (
              <div className="py-10 flex flex-col items-center gap-3">
                <i className="ri-loader-4-line animate-spin text-2xl" style={{color:'#C8A86B'}}/>
                <p className="text-[#94a3b8] text-sm">Loading activity…</p>
              </div>
            ) : filtered.length===0 ? (
              <div className="py-10 text-center">
                <i className="ri-inbox-line text-3xl text-[#cbd5e1] block mb-2"/>
                <p className="text-[#94a3b8] text-sm">
                  {timeline.length===0 ? 'No activity recorded yet.' : `No ${timelineFilter} events on this page.`}
                </p>
              </div>
            ) : (
              <ol className="relative border-l-2 border-defaultborder ms-3 space-y-4">
                {filtered.map((e,idx)=>{
                  const dotColor = DOT_COLORS[e.color]||'#64748b';
                  const chip = TIMELINE_CHIPS.find(c=>c.key===e.eventType);
                  const badgeBg = (chip?.color||dotColor)+'20';
                  const badgeText = chip?.color||dotColor;
                  return (
                    <li key={`${e.eventType}-${e.id}-${idx}`} className="ms-6">
                      <span className="absolute -start-[9px] w-4 h-4 rounded-full ring-4 ring-white flex-shrink-0"
                        style={{background:dotColor}}/>
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link href={e.link}
                              className="font-semibold text-[0.85rem] text-defaulttextcolor hover:text-[#C8A86B] transition-colors">
                              {e.title}
                            </Link>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{background:badgeBg,color:badgeText}}>{e.badge}</span>
                          </div>
                          <p className="text-[0.75rem] text-[#94a3b8] mt-0.5 mb-0">{e.summary}</p>
                        </div>
                        <p className="text-[11px] text-[#94a3b8] whitespace-nowrap mb-0">
                          {fmtDateTime(e.timestamp)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}

            {timelineTotal>TIMELINE_PAGE_SIZE && (
              <div className="flex items-center justify-between mt-5 pt-4 border-t border-defaultborder">
                <p className="text-[0.78rem] text-[#94a3b8] mb-0">
                  Page {timelinePage} of {Math.ceil(timelineTotal/TIMELINE_PAGE_SIZE)}
                </p>
                <div className="flex gap-2">
                  <button disabled={timelinePage<=1||timelineLoading} onClick={()=>loadTimeline(timelinePage-1)}
                    className="px-3 py-1.5 text-[0.78rem] border border-defaultborder rounded-lg text-defaulttextcolor hover:border-[#C8A86B] hover:text-[#C8A86B] disabled:opacity-40 disabled:pointer-events-none transition-colors">
                    ‹ Newer
                  </button>
                  <button disabled={timelinePage*TIMELINE_PAGE_SIZE>=timelineTotal||timelineLoading} onClick={()=>loadTimeline(timelinePage+1)}
                    className="px-3 py-1.5 text-[0.78rem] border border-defaultborder rounded-lg text-defaulttextcolor hover:border-[#C8A86B] hover:text-[#C8A86B] disabled:opacity-40 disabled:pointer-events-none transition-colors">
                    Older ›
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── PAN lightbox ── */}
      {panLightbox && panImgUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4"
          onClick={()=>setPanLightbox(false)}>
          <div className="relative max-w-4xl max-h-full">
            <button onClick={()=>setPanLightbox(false)}
              className="absolute -top-10 right-0 text-white text-2xl hover:text-gray-300">
              <i className="ri-close-line"/>
            </button>
            <img src={panImgUrl} alt="PAN card" className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
              onClick={e=>e.stopPropagation()}/>
            <p className="text-center text-white/70 text-xs mt-3">
              KYC document · {customer.fullName} · {customer.panNumber||'—'}
            </p>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editMode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-bodybg rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background:'#fdf8ee'}}>
                <i className="ri-edit-line" style={{color:'#C8A86B'}}/>
              </div>
              <div>
                <h3 className="text-[1rem] font-bold text-defaulttextcolor mb-0">Edit Customer</h3>
                <p className="text-[0.72rem] text-[#94a3b8]">{customer.fullName}</p>
              </div>
            </div>
            <form onSubmit={saveEdit} className="space-y-4">
              {[
                {label:'First Name', key:'firstName'},
                {label:'Last Name',  key:'lastName'},
                {label:'Phone',      key:'phoneNumber'},
              ].map(f=>(
                <div key={f.key}>
                  <label className="block text-sm font-medium text-defaulttextcolor mb-1.5">{f.label}</label>
                  <input className="form-control !rounded-xl"
                    value={(editData as any)[f.key]}
                    onChange={e=>setEditData({...editData,[f.key]:e.target.value})}/>
                </div>
              ))}
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={()=>setEditMode(false)}
                  className="ti-btn ti-btn-light !rounded-xl" disabled={acting==='edit'}>Cancel</button>
                <button type="submit" disabled={acting==='edit'}
                  className="ti-btn !rounded-xl font-semibold disabled:opacity-50"
                  style={{background:'linear-gradient(135deg,#C8A86B 0%,#a8863d 100%)',color:'#fff'}}>
                  {acting==='edit'?<><i className="ri-loader-4-line animate-spin mr-1"/>Saving…</>:'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Credits Modal ── */}
      {addCreditsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-bodybg rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background:'#fdf8ee'}}>
                <i className="ri-wallet-3-line" style={{color:'#C8A86B'}}/>
              </div>
              <div>
                <h3 className="text-[1rem] font-bold text-defaulttextcolor mb-0">Add Credits</h3>
                <p className="text-[0.72rem] text-[#94a3b8]">{customer.fullName}</p>
              </div>
            </div>
            <form onSubmit={submitAddCredits} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-defaulttextcolor mb-1.5">
                  Amount (NPR) <span className="text-[#94a3b8] font-normal text-xs">min 100</span>
                </label>
                <input
                  type="number" min="100" step="1" required
                  className="form-control !rounded-xl"
                  placeholder="e.g. 5000"
                  value={addCreditsAmount}
                  onChange={e => setAddCreditsAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-defaulttextcolor mb-1.5">
                  Note <span className="text-[#94a3b8] font-normal text-xs">(optional)</span>
                </label>
                <input
                  type="text"
                  className="form-control !rounded-xl"
                  placeholder="e.g. Refund for cancelled order"
                  value={addCreditsNote}
                  onChange={e => setAddCreditsNote(e.target.value)}
                />
              </div>
              {addCreditsAmount && parseFloat(addCreditsAmount) >= 100 && (
                <div className="rounded-xl p-3" style={{background:'#fdf8ee'}}>
                  <p className="text-[0.8rem] text-defaulttextcolor mb-0">
                    <span className="font-semibold" style={{color:'#C8A86B'}}>Rs. {parseFloat(addCreditsAmount).toLocaleString()}</span>
                    {' '}will be added to <span className="font-semibold">{customer.firstName}</span>&apos;s wallet
                  </p>
                </div>
              )}
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => { setAddCreditsModal(false); setAddCreditsAmount(''); setAddCreditsNote(''); }}
                  className="ti-btn ti-btn-light !rounded-xl" disabled={addCreditsLoading}>Cancel</button>
                <button type="submit" disabled={addCreditsLoading}
                  className="ti-btn !rounded-xl font-semibold disabled:opacity-50"
                  style={{background:'linear-gradient(135deg,#C8A86B 0%,#a8863d 100%)',color:'#fff'}}>
                  {addCreditsLoading
                    ? <><i className="ri-loader-4-line animate-spin mr-1"/>Adding…</>
                    : <><i className="ri-add-line mr-1"/>Add Credits</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Reject Modal ── */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-bodybg rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background:'#fee2e2'}}>
                <i className="ri-user-unfollow-line" style={{color:'#dc2626'}}/>
              </div>
              <div>
                <h3 className="text-[1rem] font-bold text-defaulttextcolor mb-0">Reject Account</h3>
                <p className="text-[0.72rem] text-[#94a3b8]">Customer will be notified by email</p>
              </div>
            </div>
            <div className="rounded-xl p-3 mb-4" style={{background:'#fff5f5'}}>
              <p className="font-semibold text-[0.85rem] text-[#dc2626] mb-0">{customer.fullName}</p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-defaulttextcolor mb-1.5">
                Reason <span className="text-[#94a3b8] font-normal">(optional)</span>
              </label>
              <textarea className="form-control !rounded-xl" rows={3}
                placeholder="e.g. Incomplete KYC documents, please resubmit"
                value={rejectReason} onChange={e=>setRejectReason(e.target.value)}/>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={()=>{setRejectModal(false);setRejectReason('');}}
                className="ti-btn ti-btn-light !rounded-xl">Cancel</button>
              <button onClick={()=>{act('reject',{reason:rejectReason});setRejectModal(false);setRejectReason('');}}
                className="ti-btn !rounded-xl !text-white font-semibold"
                style={{background:'linear-gradient(135deg,#dc2626 0%,#b91c1c 100%)'}}>
                <i className="ri-close-circle-line mr-1"/>Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
