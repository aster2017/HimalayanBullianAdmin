'use client';

import { Fragment, useEffect, useState } from 'react';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import Seo from '@/shared/layout-components/seo/seo';
import apiClient from '@/shared/services/apiClient';
import Link from 'next/link';

const InventoryReportPage = () => {
  useProtectedRoute();

  const [items, setItems] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [itemsRes, statsRes] = await Promise.allSettled([
          apiClient.get('/items', { params: { page: 1, pageSize: 100 } }),
          apiClient.get('/items/stats'),
        ]);
        if (itemsRes.status === 'fulfilled') setItems(itemsRes.value.data?.data?.items || []);
        if (statsRes.status === 'fulfilled') setStats(statsRes.value.data?.data || statsRes.value.data);
      } catch {}
      setLoading(false);
    };
    fetch();
  }, []);

  const lowStock = items.filter(i => i.stockOnHand > 0 && i.stockOnHand <= i.reorderLevel);
  const outOfStock = items.filter(i => i.stockOnHand === 0);
  const inStock = items.filter(i => i.stockOnHand > i.reorderLevel);
  const totalValue = items.reduce((sum, i) => sum + (i.stockOnHand * i.rate), 0);

  if (loading) {
    return (<Fragment><Seo title="Inventory Report" /><div className="my-[1.5rem]"><div className="h-96 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg animate-pulse"></div></div></Fragment>);
  }

  return (
    <Fragment>
      <Seo title="Inventory Report" />

      <div className="md:flex block items-center justify-between my-[1.5rem] page-header-breadcrumb">
        <div>
          <p className="font-semibold text-[1.125rem] text-defaulttextcolor dark:text-defaulttextcolor/70 !mb-0">Inventory Report</p>
          <p className="font-normal text-[#8c9097] text-[0.813rem]">Stock levels and inventory analysis</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="box p-5 border-l-4 border-primary">
          <p className="text-[#8c9097] text-[0.813rem] mb-1">Total Items</p>
          <h3 className="text-[1.5rem] font-bold">{items.length}</h3>
        </div>
        <div className="box p-5 border-l-4 border-success">
          <p className="text-[#8c9097] text-[0.813rem] mb-1">In Stock</p>
          <h3 className="text-[1.5rem] font-bold text-success">{inStock.length}</h3>
        </div>
        <div className="box p-5 border-l-4 border-warning">
          <p className="text-[#8c9097] text-[0.813rem] mb-1">Low Stock</p>
          <h3 className="text-[1.5rem] font-bold text-warning">{lowStock.length}</h3>
        </div>
        <div className="box p-5 border-l-4 border-danger">
          <p className="text-[#8c9097] text-[0.813rem] mb-1">Out of Stock</p>
          <h3 className="text-[1.5rem] font-bold text-danger">{outOfStock.length}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="box p-5 bg-primary/5 lg:col-span-1">
          <p className="text-[#8c9097] text-[0.813rem] mb-2">Total Inventory Value</p>
          <h3 className="text-[1.5rem] font-bold text-primary">Rs. {totalValue.toLocaleString()}</h3>
        </div>
      </div>

      {/* Items Table */}
      <div className="box">
        <div className="box-header">
          <h4 className="box-title">All Items</h4>
        </div>
        <div className="box-body p-0">
          <div className="overflow-x-auto">
            <table className="ti-custom-table ti-striped-table ti-custom-table-hover">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th className="text-right">Rate</th>
                  <th className="text-right">Stock</th>
                  <th className="text-right">Reorder</th>
                  <th>Status</th>
                  <th className="text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const status = item.stockOnHand === 0 ? 'Out of Stock' : item.stockOnHand <= item.reorderLevel ? 'Low Stock' : 'In Stock';
                  const statusColor = status === 'Out of Stock' ? 'danger' : status === 'Low Stock' ? 'warning' : 'success';
                  return (
                    <tr key={item.id}>
                      <td><Link href={`/items/${item.id}`} className="font-semibold text-primary hover:underline">{item.name}</Link></td>
                      <td className="text-[0.75rem] text-[#8c9097]">{item.sku}</td>
                      <td>{item.category || '-'}</td>
                      <td className="text-right">Rs. {item.rate?.toLocaleString()}</td>
                      <td className="text-right font-semibold">{item.stockOnHand}</td>
                      <td className="text-right">{item.reorderLevel}</td>
                      <td><span className={`badge bg-${statusColor}/20 text-${statusColor}`}>{status}</span></td>
                      <td className="text-right font-semibold">Rs. {(item.stockOnHand * item.rate).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default InventoryReportPage;
