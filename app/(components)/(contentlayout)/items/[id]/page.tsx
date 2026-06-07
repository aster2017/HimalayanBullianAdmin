'use client'
import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/shared/redux/hooks';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { useRouter, useParams } from 'next/navigation';
import { fetchItemById, deleteItem, fetchStockHistory, adjustStock, clearError, clearItemDetail } from '@/shared/redux/itemsSlice';
import toast from 'react-hot-toast';
import { useDialog } from '@/shared/context/DialogContext';
import { StockStatus } from '@/shared/types';
import apiClient from '@/shared/services/apiClient';

interface ProductImage {
  id: string; imageUrl: string; isPrimary: boolean; displayOrder: number; altText?: string;
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'https://hbc-api.semis.app/api').replace('/api', '');
function imgSrc(url: string) { return url?.startsWith('http') ? url : `${API_BASE}${url}`; }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
}

function SectionHeader({ icon, iconBg, iconColor, title, sub, right }: {
  icon: string; iconBg: string; iconColor: string;
  title: string; sub?: string; right?: React.ReactNode;
}) {
  return (
    <div className="p-4 border-b border-defaultborder flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{background:iconBg}}>
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

function InfoGrid({ fields }: { fields: {label:string; value:React.ReactNode}[] }) {
  return (
    <div className="p-4 grid grid-cols-2 gap-4">
      {fields.map(f=>(
        <div key={f.label}>
          <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-1">{f.label}</p>
          <p className="text-[0.85rem] font-semibold text-defaulttextcolor mb-0">
            {f.value || <span className="text-[#cbd5e1] font-normal">—</span>}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function ItemDetailPage() {
  useProtectedRoute();
  const { confirm } = useDialog();
  const dispatch   = useAppDispatch();
  const router     = useRouter();
  const params     = useParams();
  const itemId     = params.id as string;

  const itemsState = useAppSelector((state) => state.items);
  const { detail: item = null, stockHistory = [], isLoading = false, error = null } = itemsState || {};

  const [historyLoading,  setHistoryLoading]  = useState(false);
  const [adjustmentMode,  setAdjustmentMode]  = useState(false);
  const [adjustmentData,  setAdjustmentData]  = useState({ quantity:0, type:'adjustment' as 'purchase'|'sale'|'adjustment', notes:'' });
  const [deleteConfirm,   setDeleteConfirm]   = useState(false);

  const [images,         setImages]         = useState<ProductImage[]>([]);
  const [mainImage,      setMainImage]      = useState<string|null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(()=>{
    if (itemId) { dispatch(fetchItemById(itemId)); fetchHistoryData(); loadImages(); }
    return ()=>{ dispatch(clearItemDetail()); };
  },[itemId]);

  const loadImages = async ()=>{
    try {
      const res = await apiClient.get(`/items/${itemId}/images`);
      const imgs: ProductImage[] = res.data?.data || [];
      setImages(imgs);
      const primary = imgs.find(i=>i.isPrimary)||imgs[0];
      if (primary) setMainImage(primary.imageUrl);
    } catch {}
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>)=>{
    const file = e.target.files?.[0]; if (!file) return;
    setImageUploading(true);
    try {
      const fd = new FormData(); fd.append('image', file);
      await apiClient.post(`/items/${itemId}/images`, fd, {headers:{'Content-Type':'multipart/form-data'}});
      toast.success('Image uploaded'); await loadImages();
    } catch (err:any) { toast.error(err?.response?.data?.message||'Upload failed'); }
    finally { setImageUploading(false); if (fileInputRef.current) fileInputRef.current.value=''; }
  };

  const handleSetPrimary = async (imageId: string)=>{
    try { await apiClient.put(`/items/${itemId}/images/${imageId}/set-primary`); toast.success('Primary image updated'); await loadImages(); }
    catch { toast.error('Failed to set primary'); }
  };

  const handleDeleteImage = async (imageId: string)=>{
    if (!await confirm('This image will be permanently deleted.', { title: 'Delete Image', variant: 'danger', confirmLabel: 'Delete' })) return;
    try { await apiClient.delete(`/items/${itemId}/images/${imageId}`); toast.success('Image deleted'); await loadImages(); }
    catch { toast.error('Failed to delete image'); }
  };

  const fetchHistoryData = async ()=>{
    setHistoryLoading(true);
    try { await dispatch(fetchStockHistory({itemId,page:1,pageSize:20})).unwrap(); } catch {}
    finally { setHistoryLoading(false); }
  };

  const handleAdjustmentSubmit = async (e: React.FormEvent)=>{
    e.preventDefault(); if (!item) return;
    try {
      await dispatch(adjustStock({itemId:item.id,adjustment:adjustmentData})).unwrap();
      toast.success('Stock adjusted'); setAdjustmentMode(false);
      setAdjustmentData({quantity:0,type:'adjustment',notes:''});
      await fetchHistoryData();
    } catch { toast.error('Failed to adjust stock'); }
  };

  const handleDelete = async ()=>{
    if (!item) return;
    try { await dispatch(deleteItem(item.id)).unwrap(); toast.success('Product deleted'); router.push('/items'); }
    catch { toast.error('Failed to delete product'); }
  };

  useEffect(()=>{ return ()=>{ dispatch(clearError()); }; },[dispatch]);

  const getStockStatus = ()=>{
    if (!item)                           return {label:'Unknown',   bg:'#f1f5f9', text:'#64748b', icon:'ri-question-line'};
    if (item.stockOnHand===0)            return {label:'Out of Stock', bg:'#fee2e2', text:'#dc2626', icon:'ri-error-warning-line'};
    if (item.stockOnHand<=item.reorderLevel) return {label:'Low Stock',   bg:'#fef3c7', text:'#d97706', icon:'ri-alert-line'};
    return                                      {label:'In Stock',    bg:'#dcfce7', text:'#16a34a', icon:'ri-checkbox-circle-line'};
  };

  if (isLoading) return (
    <div className="page-content">
      <div className="container-fluid pt-20 flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{background:'#fdf8ee'}}>
          <i className="ri-loader-4-line animate-spin text-2xl" style={{color:'#C8A86B'}}/>
        </div>
        <p className="text-[#94a3b8] text-sm">Loading product…</p>
      </div>
    </div>
  );
  if (!item) return (
    <div className="page-content">
      <div className="container-fluid pt-20 text-center">
        <p className="text-defaulttextcolor font-semibold mb-2">Product not found</p>
        <Link href="/items" className="text-[#C8A86B] hover:underline text-sm">← Back to Products</Link>
      </div>
    </div>
  );

  const stockStatus = getStockStatus();

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
              <div className="w-12 h-12 rounded-xl overflow-hidden border border-defaultborder flex-shrink-0 flex items-center justify-center"
                style={{background:'#f8fafc'}}>
                {mainImage
                  ? <img src={imgSrc(mainImage)} alt={item.name} className="w-full h-full object-cover"/>
                  : <i className="ri-box-3-line text-xl text-[#cbd5e1]"/>}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-bold text-[1.1rem] text-defaulttextcolor mb-0">{item.name}</h2>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                    style={{background:stockStatus.bg,color:stockStatus.text}}>
                    <i className={`${stockStatus.icon} mr-1`}/>{stockStatus.label}
                  </span>
                  {!item.isActive && (
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{background:'#fee2e2',color:'#dc2626'}}>Inactive</span>
                  )}
                </div>
                <span className="font-mono text-[0.78rem] font-semibold px-2 py-0.5 rounded-lg inline-block mt-1"
                  style={{background:'#fdf8ee',color:'#a8863d'}}>{item.sku}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={`/items/${itemId}/edit`}>
                <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg text-white"
                  style={{background:'linear-gradient(135deg,#C8A86B 0%,#a8863d 100%)'}}>
                  <i className="ri-edit-line"/>Edit
                </button>
              </Link>
              <button onClick={()=>setAdjustmentMode(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg text-white"
                style={{background:'linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%)'}}>
                <i className="ri-add-line"/>Adjust Stock
              </button>
              <button onClick={()=>fileInputRef.current?.click()} disabled={imageUploading}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg text-white disabled:opacity-50"
                style={{background:'linear-gradient(135deg,#16a34a 0%,#15803d 100%)'}}>
                <i className={imageUploading?'ri-loader-4-line animate-spin':'ri-image-add-line'}/>
                {imageUploading?'Uploading…':'Upload Image'}
              </button>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleUpload}/>
              <button onClick={()=>setDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg border transition-colors"
                style={{borderColor:'#dc2626',color:'#dc2626',background:'#fee2e2'}}>
                <i className="ri-delete-bin-line"/>Delete
              </button>
            </div>
          </div>
        </div>

        {/* ── Zone 2: 4 icon stat tiles ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="box p-4 flex items-center gap-3" style={{borderLeft:'3px solid #2563eb'}}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:'#dbeafe'}}>
              <i className="ri-barcode-line" style={{color:'#2563eb'}}/>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-0.5">SKU</p>
              <p className="font-mono text-[0.85rem] font-bold text-defaulttextcolor mb-0">{item.sku}</p>
            </div>
          </div>

          <div className="box p-4 flex items-center gap-3" style={{borderLeft:`3px solid ${stockStatus.text}`}}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:stockStatus.bg}}>
              <i className="ri-stack-line" style={{color:stockStatus.text}}/>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-0.5">Current Stock</p>
              <p className="text-[1.3rem] font-bold text-defaulttextcolor mb-0">{item.stockOnHand}</p>
              <p className="text-[10px] text-[#94a3b8] mb-0">reorder at {item.reorderLevel}</p>
            </div>
          </div>

          <div className="box p-4 flex items-center gap-3" style={{borderLeft:'3px solid #C8A86B'}}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:'#fdf8ee'}}>
              <i className="ri-money-rupee-circle-line" style={{color:'#C8A86B'}}/>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-0.5">Unit Price</p>
              <p className="text-[1rem] font-bold mb-0" style={{color:'#C8A86B'}}>Rs. {item.rate?.toLocaleString()}</p>
            </div>
          </div>

          <div className="box p-4 flex items-center gap-3" style={{borderLeft:'3px solid #7c3aed'}}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:'#ede9fe'}}>
              <i className="ri-bank-line" style={{color:'#7c3aed'}}/>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-0.5">Stock Value</p>
              <p className="text-[1rem] font-bold mb-0" style={{color:'#7c3aed'}}>Rs. {(item.stockOnHand*item.rate).toLocaleString()}</p>
              <p className="text-[10px] text-[#94a3b8] mb-0">{item.stockOnHand} × Rs. {item.rate?.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl p-3 mb-4 flex items-center gap-2 text-sm" style={{background:'#fee2e2',color:'#dc2626'}}>
            <i className="ri-error-warning-line"/>{error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          <div className="lg:col-span-2 space-y-4">

            {/* Image Gallery */}
            <div className="box">
              <SectionHeader icon="ri-image-2-line" iconBg="#dcfce7" iconColor="#16a34a"
                title="Product Images"
                sub={`${images.length} image${images.length===1?'':'s'}`}
                right={
                  <button onClick={()=>fileInputRef.current?.click()} disabled={imageUploading}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white disabled:opacity-50"
                    style={{background:'linear-gradient(135deg,#16a34a 0%,#15803d 100%)'}}>
                    <i className={imageUploading?'ri-loader-4-line animate-spin':'ri-upload-2-line'}/>
                    {imageUploading?'Uploading…':'Upload'}
                  </button>
                }
              />
              <div className="p-4">
                {images.length > 0 ? (
                  <>
                    <div className="mb-4 rounded-xl overflow-hidden border border-defaultborder flex items-center justify-center"
                      style={{height:260,background:'#f8fafc'}}>
                      {mainImage && <img src={imgSrc(mainImage)} alt={item.name} className="max-h-full max-w-full object-contain"/>}
                    </div>
                    <div className="flex gap-3 flex-wrap">
                      {images.map(img=>(
                        <div key={img.id} className="relative group">
                          <img src={imgSrc(img.imageUrl)} alt="thumb" onClick={()=>setMainImage(img.imageUrl)}
                            className={`w-20 h-20 object-cover rounded-xl border-2 cursor-pointer transition-all ${mainImage===img.imageUrl?'border-[#C8A86B]':'border-defaultborder hover:border-[#C8A86B]/50'}`}/>
                          {img.isPrimary && (
                            <span className="absolute top-1 left-1 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{background:'#C8A86B'}}>PRIMARY</span>
                          )}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex flex-col items-center justify-center gap-1">
                            {!img.isPrimary && (
                              <button onClick={()=>handleSetPrimary(img.id)}
                                className="text-[10px] text-white bg-blue-500/80 hover:bg-blue-600 px-2 py-1 rounded-lg w-16">Primary</button>
                            )}
                            <button onClick={()=>handleDeleteImage(img.id)}
                              className="text-[10px] text-white bg-red-500/80 hover:bg-red-600 px-2 py-1 rounded-lg w-16">Delete</button>
                          </div>
                        </div>
                      ))}
                      <button onClick={()=>fileInputRef.current?.click()}
                        className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-defaultborder hover:border-[#C8A86B] rounded-xl text-[#94a3b8] hover:text-[#C8A86B] transition-colors">
                        <i className="ri-add-line text-xl"/>
                        <span className="text-xs mt-1">Add</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-[#94a3b8]">
                    <i className="ri-image-line text-5xl text-[#cbd5e1]"/>
                    <p className="text-sm font-medium">No images yet</p>
                    <button onClick={()=>fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 text-sm font-medium border border-defaultborder rounded-xl px-4 py-2 hover:border-[#C8A86B] hover:text-[#C8A86B] transition-colors">
                      <i className="ri-upload-2-line"/>Upload First Image
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Basic Info */}
            <div className="box">
              <SectionHeader icon="ri-information-line" iconBg="#dbeafe" iconColor="#2563eb" title="Basic Information"/>
              <InfoGrid fields={[
                {label:'Name',         value:item.name},
                {label:'Category',     value:item.category||null},
                {label:'Sub Category', value:item.subCategory||null},
                {label:'Unit',         value:item.unit||null},
                {label:'Description',  value:item.description||null},
              ]}/>
            </div>

            {/* Pricing */}
            <div className="box">
              <SectionHeader icon="ri-money-rupee-circle-line" iconBg="#fdf8ee" iconColor="#C8A86B" title="Pricing & Tax"/>
              <InfoGrid fields={[
                {label:'Rate (Unit Price)', value:`Rs. ${item.rate?.toLocaleString()}`},
                {label:'Cost Price',        value:`Rs. ${item.costPrice?.toLocaleString()||'0'}`},
                {label:'Tax Name',          value:item.taxName||null},
                {label:'Tax %',             value:item.taxPercentage?`${item.taxPercentage.toFixed(2)}%`:null},
                {label:'Discount %',        value:item.discountPercentage?`${item.discountPercentage.toFixed(2)}%`:null},
              ]}/>
            </div>

            {/* Stock */}
            <div className="box">
              <SectionHeader icon="ri-stack-line" iconBg="#e0f2fe" iconColor="#0891b2" title="Stock Information"/>
              <InfoGrid fields={[
                {label:'Stock On Hand', value:`${item.stockOnHand} units`},
                {label:'Reorder Level', value:`${item.reorderLevel} units`},
              ]}/>
            </div>

            {/* Jewelry */}
            {(item.weight||item.purity||item.material||item.design) && (
              <div className="box">
                <SectionHeader icon="ri-gem-line" iconBg="#fdf8ee" iconColor="#C8A86B" title="Jewelry Details (HBC)"/>
                <InfoGrid fields={[
                  {label:'Weight (grams)', value:item.weight?.toFixed(2)||null},
                  {label:'Purity',         value:item.purity||null},
                  {label:'Material',       value:item.material||null},
                  {label:'Design',         value:item.design||null},
                ]}/>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Flags card */}
            <div className="box">
              <SectionHeader icon="ri-toggle-line" iconBg="#fdf8ee" iconColor="#C8A86B" title="Product Flags"/>
              <div className="p-4 space-y-3">
                {[
                  {key:'isActive',        label:'Active',           icon:'ri-check-double-line', color:'#16a34a', bg:'#dcfce7'},
                  {key:'showInMobile',    label:'Mobile Visible',   icon:'ri-smartphone-line',   color:'#0891b2', bg:'#e0f2fe'},
                  {key:'isFeatured',      label:'Featured',         icon:'ri-star-line',         color:'#d97706', bg:'#fef3c7'},
                  {key:'isTargetProduct', label:'Target Product',   icon:'ri-trophy-line',       color:'#7c3aed', bg:'#ede9fe'},
                ].map(({key,label,icon,color,bg})=>{
                  const on = (item as any)[key];
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{background:on?bg:'#f1f5f9'}}>
                        <i className={`${icon} text-sm`} style={{color:on?color:'#cbd5e1'}}/>
                      </div>
                      <span className="text-[0.82rem] font-medium text-defaulttextcolor flex-1">{label}</span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                        style={on?{background:bg,color}:{background:'#f1f5f9',color:'#94a3b8'}}>
                        {on?'Yes':'No'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Zoho */}
            <div className="box p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:'#dcfce7'}}>
                  <i className="ri-links-line text-sm" style={{color:'#16a34a'}}/>
                </div>
                <p className="font-semibold text-[0.85rem] text-defaulttextcolor mb-0">Zoho Sync</p>
              </div>
              {item.zohoItemId ? (
                <>
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full w-fit mb-2"
                    style={{background:'#dcfce7',color:'#16a34a'}}>
                    <i className="ri-check-line"/>Synced
                  </span>
                  <p className="font-mono text-[0.72rem] text-[#94a3b8] mb-0 break-all">{item.zohoItemId}</p>
                  {item.lastSyncedAt && <p className="text-[0.72rem] text-[#94a3b8] mt-1 mb-0">Last synced {fmtDate(item.lastSyncedAt)}</p>}
                </>
              ) : (
                <span className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full w-fit"
                  style={{background:'#fef3c7',color:'#d97706'}}>
                  <i className="ri-time-line"/>Not synced
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Stock History ── */}
        <div className="box mb-4">
          <SectionHeader icon="ri-history-line" iconBg="#e0f2fe" iconColor="#0891b2"
            title="Stock History"
            sub={`${stockHistory.length} record${stockHistory.length===1?'':''}`}
            right={
              <button onClick={fetchHistoryData} disabled={historyLoading}
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-defaultborder text-[#64748b] hover:border-[#C8A86B] hover:text-[#C8A86B] transition-colors disabled:opacity-50">
                <i className={`ri-refresh-line text-sm ${historyLoading?'animate-spin':''}`}/>
              </button>
            }
          />
          {historyLoading ? (
            <div className="p-8 flex justify-center">
              <i className="ri-loader-4-line animate-spin text-2xl" style={{color:'#C8A86B'}}/>
            </div>
          ) : stockHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="ti-custom-table ti-custom-table-hover text-sm w-full">
                <thead>
                  <tr style={{background:'#f8fafc'}}>
                    {['Date','Type','Quantity','New Balance','Notes'].map(h=>(
                      <th key={h} className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stockHistory.map(t=>(
                    <tr key={t.id}>
                      <td className="py-3 px-4 text-[0.8rem] text-defaulttextcolor">{fmtDate(t.date)}</td>
                      <td className="py-3 px-4">
                        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                          style={t.type==='purchase'?{background:'#dcfce7',color:'#16a34a'}
                               :t.type==='sale'?{background:'#fee2e2',color:'#dc2626'}
                               :{background:'#dbeafe',color:'#2563eb'}}>
                          {t.type.charAt(0).toUpperCase()+t.type.slice(1)}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-[0.85rem] text-defaulttextcolor">{t.quantity}</td>
                      <td className="py-3 px-4 font-semibold text-[0.85rem] text-defaulttextcolor">{t.newBalance}</td>
                      <td className="py-3 px-4 text-[0.8rem] text-[#94a3b8]">{t.notes||<span className="text-[#cbd5e1]">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-10 text-center">
              <i className="ri-inbox-line text-3xl text-[#cbd5e1] block mb-2"/>
              <p className="text-[#94a3b8] text-sm">No stock history yet</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Stock Adjustment Modal ── */}
      {adjustmentMode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-bodybg rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background:'#dbeafe'}}>
                <i className="ri-add-circle-line" style={{color:'#2563eb'}}/>
              </div>
              <div>
                <h3 className="text-[1rem] font-bold text-defaulttextcolor mb-0">Adjust Stock</h3>
                <p className="text-[0.72rem] text-[#94a3b8] mb-0">{item.name} · {item.stockOnHand} units on hand</p>
              </div>
            </div>
            <form onSubmit={handleAdjustmentSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-defaulttextcolor mb-1.5">Type</label>
                <select value={adjustmentData.type}
                  onChange={e=>setAdjustmentData({...adjustmentData,type:e.target.value as any})}
                  className="form-control !rounded-xl">
                  <option value="purchase">Purchase (add stock)</option>
                  <option value="sale">Sale (reduce stock)</option>
                  <option value="adjustment">Adjustment (manual set)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-defaulttextcolor mb-1.5">Quantity</label>
                <input type="number" value={adjustmentData.quantity}
                  onChange={e=>setAdjustmentData({...adjustmentData,quantity:parseInt(e.target.value)})}
                  className="form-control !rounded-xl" required/>
              </div>
              <div>
                <label className="block text-sm font-medium text-defaulttextcolor mb-1.5">Notes <span className="text-[#94a3b8] font-normal">(optional)</span></label>
                <textarea value={adjustmentData.notes}
                  onChange={e=>setAdjustmentData({...adjustmentData,notes:e.target.value})}
                  className="form-control !rounded-xl" rows={2}/>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={()=>setAdjustmentMode(false)} className="ti-btn ti-btn-light !rounded-xl">Cancel</button>
                <button type="submit" className="ti-btn !rounded-xl font-semibold !text-white"
                  style={{background:'linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%)'}}>
                  <i className="ri-save-line mr-1"/>Adjust Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-bodybg rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background:'#fee2e2'}}>
                <i className="ri-delete-bin-line" style={{color:'#dc2626'}}/>
              </div>
              <div>
                <h3 className="text-[1rem] font-bold text-defaulttextcolor mb-0">Delete Product?</h3>
                <p className="text-[0.72rem] text-[#94a3b8] mb-0">This cannot be undone</p>
              </div>
            </div>
            <div className="rounded-xl p-3 mb-4" style={{background:'#fff5f5'}}>
              <p className="font-semibold text-[0.85rem] text-[#dc2626] mb-0">{item.name}</p>
              <p className="font-mono text-[0.72rem] text-[#94a3b8] mb-0">{item.sku}</p>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={()=>setDeleteConfirm(false)} className="ti-btn ti-btn-light !rounded-xl">Cancel</button>
              <button onClick={handleDelete} className="ti-btn !rounded-xl !text-white font-semibold"
                style={{background:'linear-gradient(135deg,#dc2626 0%,#b91c1c 100%)'}}>
                <i className="ri-delete-bin-line mr-1"/>Delete Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
