'use client';
import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { getAuthHeaders } from '@/shared/services/apiConfig';
import toast from 'react-hot-toast';

const API      = process.env.NEXT_PUBLIC_API_URL;
const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? '').replace('/api', '');

function imgSrc(url: string) {
  return url?.startsWith('http') ? url : `${API_BASE}${url}`;
}

interface Item {
  id: string; sku: string; name: string;
  category: string | null; subCategory: string | null; unit: string | null;
  rate: number; stockOnHand: number; reorderLevel: number;
  isActive: boolean; isFeatured: boolean; showInMobile: boolean; isTargetProduct: boolean;
  zohoItemId: string | null; syncStatus: number; lastSyncedAt: string | null;
  images: { id: string; imageUrl: string; isPrimary: boolean }[];
}

const SYNC_STATUS: Record<number,{bg:string;text:string;label:string}> = {
  1: {bg:'#fef3c7',text:'#d97706',label:'Pending'},
  2: {bg:'#e0f2fe',text:'#0891b2',label:'Syncing…'},
  3: {bg:'#dcfce7',text:'#16a34a',label:'Synced'},
  4: {bg:'#fee2e2',text:'#dc2626',label:'Failed'},
};

export default function ItemsPage() {
  useProtectedRoute();

  const [items,       setItems]      = useState<Item[]>([]);
  const [totalCount,  setTotal]      = useState(0);
  const [page,        setPage]       = useState(1);
  const [pageSize,    setPageSize]   = useState(25);
  const [loading,     setLoading]    = useState(true);
  const [syncingIds,  setSyncingIds] = useState<Set<string>>(new Set());
  const [syncingAll,  setSyncingAll] = useState(false);
  const [editItem,    setEditItem]   = useState<Item | null>(null);
  const [editForm,    setEditForm]   = useState<Partial<Item>>({});
  const [savingEdit,  setSavingEdit] = useState(false);
  const [search,      setSearch]     = useState('');
  const [debSearch,   setDebSearch]  = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout>|null>(null);

  const handleSearch = (v: string) => {
    setSearch(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setDebSearch(v); setPage(1); }, 350);
  };

  const load = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({pageNumber:String(page),pageSize:String(pageSize)});
      if (debSearch.trim()) p.set('searchTerm', debSearch.trim());
      const r = await fetch(`${API}/items?${p}`, {headers:getAuthHeaders()});
      const d = await r.json();
      setItems(d.data?.items || []);
      setTotal(d.data?.totalCount || 0);
    } catch { toast.error('Failed to load products'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [page, pageSize, debSearch]);

  const syncItem = async (id: string) => {
    setSyncingIds(prev => new Set([...prev, id]));
    try {
      const r = await fetch(`${API}/items/${id}/sync`, {method:'POST',headers:getAuthHeaders()});
      const d = await r.json();
      if (d.success || d.data?.success) { toast.success('Synced to Zoho!'); await load(); }
      else toast.error(d.message || 'Sync failed');
    } catch { toast.error('Sync failed'); }
    setSyncingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  const syncAll = async () => {
    const pending = items.filter(i => !i.zohoItemId || i.syncStatus === 4);
    if (!pending.length) { toast('All items already synced'); return; }
    setSyncingAll(true);
    for (const item of pending) await syncItem(item.id);
    setSyncingAll(false);
    toast.success(`Synced ${pending.length} item(s) to Zoho`);
  };

  const toggleField = async (item: Item, field: 'showInMobile'|'isActive'|'isTargetProduct') => {
    const updated = { ...item, [field]: !item[field] };
    setItems(prev => prev.map(i => i.id === item.id ? updated : i));
    try {
      const r = await fetch(`${API}/items/${item.id}`, {
        method:'PUT', headers:{...getAuthHeaders(),'Content-Type':'application/json'},
        body: JSON.stringify({...item,[field]:!item[field]}),
      });
      if (!r.ok) { setItems(prev => prev.map(i => i.id === item.id ? item : i)); toast.error('Update failed'); }
      else toast.success('Updated');
    } catch { setItems(prev => prev.map(i => i.id === item.id ? item : i)); toast.error('Update failed'); }
  };

  const openEdit  = (item: Item) => { setEditItem(item); setEditForm({...item}); };
  const closeEdit = () => { setEditItem(null); setEditForm({}); };

  const saveEdit = async () => {
    if (!editItem) return;
    setSavingEdit(true);
    try {
      const r = await fetch(`${API}/items/${editItem.id}`, {
        method:'PUT', headers:{...getAuthHeaders(),'Content-Type':'application/json'},
        body: JSON.stringify(editForm),
      });
      const d = await r.json();
      if (r.ok && d.success !== false) { toast.success('Saved'); closeEdit(); await load(); }
      else toast.error(d.message || 'Save failed');
    } catch { toast.error('Save failed'); }
    setSavingEdit(false);
  };

  const totalPages    = Math.ceil(totalCount / pageSize);
  const mobileVisible = items.filter(i => i.showInMobile).length;
  const targetCount   = items.filter(i => i.isTargetProduct).length;
  const pendingSync   = items.filter(i => !i.zohoItemId || i.syncStatus === 4).length;

  return (
    <div className="page-content">
      <div className="container-fluid">

        {/* Header */}
        <div className="flex items-center justify-between my-[1.5rem] flex-wrap gap-3">
          <div>
            <p className="font-semibold text-[1.125rem] text-defaulttextcolor mb-0">Products</p>
            <p className="text-[#8c9097] text-[0.813rem] mb-0">{totalCount} products total</p>
          </div>
          <Link href="/items/create">
            <button className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg text-white"
              style={{background:'linear-gradient(135deg,#C8A86B 0%,#a8863d 100%)'}}>
              <i className="ri-add-line"/>New Product
            </button>
          </Link>
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {[
            {label:'Total Products',   value:totalCount,    sub:'',              icon:'ri-box-3-line',       color:'#2563eb', bg:'#dbeafe'},
            {label:'Mobile Visible',   value:mobileVisible, sub:'on this page',  icon:'ri-smartphone-line',  color:'#0891b2', bg:'#e0f2fe'},
            {label:'Target Products',  value:targetCount,   sub:'on this page',  icon:'ri-trophy-line',      color:'#7c3aed', bg:'#ede9fe'},
            {label:'Unsynced',         value:pendingSync,   sub:'need Zoho sync',icon:'ri-links-line',       color:'#d97706', bg:'#fef3c7'},
          ].map(t => (
            <div key={t.label} className="box p-4 flex items-center gap-3" style={{borderLeft:`3px solid ${t.color}`}}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:t.bg}}>
                <i className={t.icon} style={{color:t.color}}/>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-0.5">{t.label}</p>
                <p className="text-[1.3rem] font-bold text-defaulttextcolor mb-0">{t.value}</p>
                {t.sub && <p className="text-[10px] text-[#94a3b8] mb-0">{t.sub}</p>}
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
                placeholder="Search name or SKU…"
                className="form-control !rounded-xl !pl-8 text-sm"/>
            </div>
            {pendingSync > 0 && (
              <button onClick={syncAll} disabled={syncingAll}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg border transition-colors disabled:opacity-50 whitespace-nowrap flex-shrink-0"
                style={{borderColor:'#7c3aed',color:'#7c3aed',background:'#ede9fe'}}>
                <i className={syncingAll?'ri-loader-4-line animate-spin':'ri-upload-cloud-line'}/>
                {syncingAll?'Syncing…':`Sync ${pendingSync} to Zoho`}
              </button>
            )}
            {search && (
              <button onClick={()=>handleSearch('')}
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
                  {['Product','SKU','Category','Images','Target Product','Zoho Sync','Actions'].map(h=>(
                    <th key={h} className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({length:6}).map((_,i)=>(
                    <tr key={i}>
                      {[36,20,16,10,16,20,14].map((w,j)=>(
                        <td key={j} className="py-3 px-4">
                          <div className="h-4 rounded animate-pulse bg-[#f1f5f9]" style={{width:`${w}%`}}/>
                        </td>
                      ))}
                    </tr>
                  ))
                ) : items.length===0 ? (
                  <tr>
                    <td colSpan={7} className="py-14 text-center">
                      <i className="ri-box-3-line text-4xl text-[#cbd5e1] block mb-2"/>
                      <p className="text-[#94a3b8] text-sm font-medium mb-0">No products found</p>
                    </td>
                  </tr>
                ) : items.map(item=>{
                  const thumb   = item.images?.find(i=>i.isPrimary) || item.images?.[0];
                  const isSyncing = syncingIds.has(item.id);
                  const syncS   = SYNC_STATUS[item.syncStatus] || SYNC_STATUS[1];
                  const imgCount = item.images?.length ?? 0;
                  return (
                    <tr key={item.id}>
                      {/* Product */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg overflow-hidden border border-defaultborder flex-shrink-0 flex items-center justify-center"
                            style={{background:'#f8fafc'}}>
                            {thumb
                              ? <img src={imgSrc(thumb.imageUrl)} alt={item.name} className="w-full h-full object-cover"/>
                              : <i className="ri-image-2-line text-sm text-[#cbd5e1]"/>}
                          </div>
                          <div>
                            <Link href={`/items/${item.id}`}>
                              <p className="font-semibold text-[0.85rem] text-defaulttextcolor hover:text-[#C8A86B] transition-colors mb-0 cursor-pointer">{item.name}</p>
                            </Link>
                            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                              {!item.isActive && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{background:'#fee2e2',color:'#dc2626'}}>Inactive</span>
                              )}
                              {item.isFeatured && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{background:'#fef3c7',color:'#d97706'}}>
                                  <i className="ri-star-line mr-0.5"/>Featured
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* SKU */}
                      <td className="py-3 px-4">
                        <span className="font-mono text-[0.75rem] font-semibold px-2 py-1 rounded-lg"
                          style={{background:'#fdf8ee',color:'#a8863d'}}>
                          {item.sku}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 text-[0.8rem] text-defaulttextcolor">
                        {item.category
                          ? <>{item.category}{item.subCategory&&<span className="text-[#94a3b8]"> / {item.subCategory}</span>}</>
                          : <span className="text-[#cbd5e1]">—</span>}
                      </td>

                      {/* Images */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <i className="ri-image-2-line text-sm" style={{color:imgCount>0?'#16a34a':'#cbd5e1'}}/>
                          <span className={`text-[0.8rem] font-semibold ${imgCount>0?'text-defaulttextcolor':'text-[#94a3b8]'}`}>{imgCount}</span>
                        </div>
                      </td>

                      {/* Target Product */}
                      <td className="py-3 px-4">
                        <button onClick={()=>toggleField(item,'isTargetProduct')}
                          title={item.isTargetProduct?'Remove target-product flag':'Mark as target product'}
                          className="text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors"
                          style={item.isTargetProduct
                            ?{background:'#ede9fe',color:'#7c3aed'}
                            :{background:'#f1f5f9',color:'#94a3b8'}}>
                          {item.isTargetProduct?<><i className="ri-trophy-line mr-1"/>Yes</>:'— No'}
                        </button>
                      </td>

                      {/* Zoho Sync */}
                      <td className="py-3 px-4">
                        {item.zohoItemId ? (
                          <div>
                            <span className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full w-fit"
                              style={{background:'#dcfce7',color:'#16a34a'}}>
                              <i className="ri-check-line text-xs"/>Synced
                            </span>
                            <p className="font-mono text-[10px] text-[#94a3b8] mt-0.5 mb-0">…{item.zohoItemId.slice(-6)}</p>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full w-fit"
                              style={{background:syncS.bg,color:syncS.text}}>
                              {isSyncing?'Syncing…':syncS.label}
                            </span>
                            {!isSyncing && (
                              <button onClick={()=>syncItem(item.id)}
                                className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-lg w-fit transition-colors"
                                style={{background:'#ede9fe',color:'#7c3aed'}}>
                                <i className="ri-upload-cloud-line"/>Sync
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Link href={`/items/${item.id}/edit`}>
                            <button className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
                              style={{background:'linear-gradient(135deg,#C8A86B 0%,#a8863d 100%)'}}>
                              <i className="ri-edit-line text-xs"/>Edit
                            </button>
                          </Link>
                          <button onClick={()=>openEdit(item)} title="Quick settings"
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-defaultborder text-[#64748b] hover:border-[#C8A86B] hover:text-[#C8A86B] transition-colors">
                            <i className="ri-settings-3-line text-sm"/>
                          </button>
                        </div>
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
                {((page-1)*pageSize)+1}–{Math.min(page*pageSize,totalCount)} of {totalCount} products
              </p>
              <div className="flex items-center gap-2">
                <select value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(1);}}
                  className="form-control form-control-sm !w-auto !rounded-lg text-[0.78rem]">
                  {[10,25,50,100].map(n=><option key={n} value={n}>{n} / page</option>)}
                </select>
                {totalPages > 1 && (
                  <div className="flex gap-1">
                    <button disabled={page<=1} onClick={()=>setPage(p=>p-1)}
                      className="w-8 h-8 rounded-lg border border-defaultborder text-[#64748b] hover:border-[#C8A86B] hover:text-[#C8A86B] disabled:opacity-40 disabled:pointer-events-none transition-colors text-sm">
                      ‹
                    </button>
                    {Array.from({length:Math.min(5,totalPages)},(_,i)=>{
                      let p = i+1;
                      if (totalPages>5 && page>3) p = page-2+i;
                      if (p>totalPages) return null;
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
                      className="w-8 h-8 rounded-lg border border-defaultborder text-[#64748b] hover:border-[#C8A86B] hover:text-[#C8A86B] disabled:opacity-40 disabled:pointer-events-none transition-colors text-sm">
                      ›
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Quick Edit Modal ── */}
      {editItem && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={e=>e.target===e.currentTarget&&closeEdit()}>
          <div className="bg-white dark:bg-bodybg rounded-2xl shadow-2xl w-full max-w-md flex flex-col" style={{maxHeight:'90vh'}}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-defaultborder">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:'#fdf8ee'}}>
                  <i className="ri-settings-3-line" style={{color:'#C8A86B'}}/>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
                      style={{background:'#fdf8ee',color:'#a8863d'}}>Quick Edit</span>
                    <h3 className="text-[0.9rem] font-semibold text-defaulttextcolor mb-0">{editItem.name}</h3>
                  </div>
                  <p className="font-mono text-[0.72rem] text-[#94a3b8] mb-0">{editItem.sku}</p>
                </div>
              </div>
              <button onClick={closeEdit}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-defaultborder text-[#64748b] hover:border-[#C8A86B] hover:text-[#C8A86B] transition-colors">
                <i className="ri-close-line"/>
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-1.5">Name</label>
                <input className="form-control !rounded-xl" value={editForm.name??''}
                  onChange={e=>setEditForm(f=>({...f,name:e.target.value}))}/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-1.5">Category</label>
                  <input className="form-control !rounded-xl" value={editForm.category??''}
                    onChange={e=>setEditForm(f=>({...f,category:e.target.value}))}/>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-1.5">Unit</label>
                  <input className="form-control !rounded-xl" value={editForm.unit??''}
                    onChange={e=>setEditForm(f=>({...f,unit:e.target.value}))}/>
                </div>
              </div>

              {/* Toggles */}
              <div className="rounded-xl border border-defaultborder overflow-hidden">
                {[
                  {key:'isActive',        label:'Active',             desc:'Available for purchase',             icon:'ri-check-double-line', color:'#16a34a', bg:'#dcfce7'},
                  {key:'showInMobile',    label:'Show in Mobile App', desc:'Visible in iOS customer catalog',    icon:'ri-smartphone-line',   color:'#0891b2', bg:'#e0f2fe'},
                  {key:'isFeatured',      label:'Featured',           desc:'Highlighted on the home screen',     icon:'ri-star-line',         color:'#d97706', bg:'#fef3c7'},
                  {key:'isTargetProduct', label:'Target Product',     desc:'Appears in layaway / saving picker', icon:'ri-trophy-line',       color:'#7c3aed', bg:'#ede9fe'},
                ].map(({key,label,desc,icon,color,bg},idx,arr)=>(
                  <label key={key} className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#fafafa] transition-colors ${idx<arr.length-1?'border-b border-defaultborder':''}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{background:bg}}>
                        <i className={`${icon} text-sm`} style={{color}}/>
                      </div>
                      <div>
                        <p className="text-[0.85rem] font-medium text-defaulttextcolor mb-0">{label}</p>
                        <p className="text-[0.72rem] text-[#94a3b8] mb-0">{desc}</p>
                      </div>
                    </div>
                    <div className="relative flex-shrink-0 ml-3">
                      <input type="checkbox" className="sr-only peer"
                        checked={(editForm as any)[key]??false}
                        onChange={e=>setEditForm(f=>({...f,[key]:e.target.checked}))}/>
                      <div className="w-10 h-5 rounded-full transition-colors bg-[#e2e8f0] peer-checked:bg-[#C8A86B]"/>
                      <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5"/>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-defaultborder rounded-b-2xl" style={{background:'#fafafa'}}>
              <Link href={`/items/${editItem.id}`}>
                <div className="flex items-center justify-center gap-2 w-full text-sm font-medium border rounded-xl px-4 py-2 mb-3 transition-colors cursor-pointer"
                  style={{borderColor:'#C8A86B40',color:'#a8863d',background:'#fdf8ee'}}>
                  <i className="ri-image-2-line"/>Open full editor (images, pricing, details)
                </div>
              </Link>
              <div className="flex items-center gap-2">
                {!editItem.zohoItemId && (
                  <button onClick={()=>{closeEdit();syncItem(editItem.id);}}
                    className="flex items-center gap-1.5 text-[0.78rem] font-medium px-3 py-2 rounded-lg transition-colors"
                    style={{background:'#ede9fe',color:'#7c3aed'}}>
                    <i className="ri-upload-cloud-line"/>Sync to Zoho
                  </button>
                )}
                <div className="flex-1"/>
                <button onClick={closeEdit} className="ti-btn ti-btn-light !rounded-xl text-sm" disabled={savingEdit}>Cancel</button>
                <button onClick={saveEdit} disabled={savingEdit}
                  className="ti-btn !rounded-xl text-sm font-semibold !text-white disabled:opacity-50"
                  style={{background:'linear-gradient(135deg,#C8A86B 0%,#a8863d 100%)'}}>
                  {savingEdit?<><i className="ri-loader-4-line animate-spin mr-1"/>Saving…</>:<><i className="ri-save-line mr-1"/>Save</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
